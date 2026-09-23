/**
 * Production-Grade Transactional Outbox Service & Event Dispatcher.
 *
 * Requirements:
 * - Domain events are atomically persisted within business database transactions.
 * - Reliable background worker with row claiming/locking, retries, exponential backoff,
 *   dead-letter state, and manual replay capability.
 */

import { prisma, type TxClient } from '../../lib/prisma';
import { OutboxStatus } from '@prisma/client';
import { logger } from '../../lib/logger';
import crypto from 'crypto';

export type OutboxHandler = (event: {
  id: string;
  tenantId: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
}) => Promise<void>;

const eventHandlers = new Map<string, OutboxHandler[]>();

/**
 * Registers an asynchronous domain event handler.
 */
export function registerEventHandler(eventType: string, handler: OutboxHandler): void {
  const handlers = eventHandlers.get(eventType) || [];
  handlers.push(handler);
  eventHandlers.set(eventType, handlers);
}

export interface EmitOutboxEventInput {
  tenantId?: string | null;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: any;
  idempotencyKey?: string;
}

/**
 * Emits a domain event within an existing database transaction.
 */
export async function emitOutboxEvent(
  tx: TxClient,
  input: EmitOutboxEventInput,
) {
  const idempotencyKey =
    input.idempotencyKey ||
    `${input.aggregateType}:${input.aggregateId}:${input.eventType}:${crypto.randomBytes(8).toString('hex')}`;

  return (tx as any).outboxEvent.create({
    data: {
      idempotencyKey,
      tenantId: input.tenantId || null,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload,
      status: OutboxStatus.PENDING,
    },
  });
}

/**
 * Processes a batch of pending/failed outbox events with worker claiming.
 */
export async function processOutboxBatch(batchSize = 20, workerId = 'outbox-worker-1') {
  const now = new Date();
  const lockExpirationThreshold = new Date(now.getTime() - 5 * 60 * 1000); // 5 min lock timeout

  // 1. Claim eligible events
  const candidates = await prisma.outboxEvent.findMany({
    where: {
      OR: [
        { status: OutboxStatus.PENDING, nextAttemptAt: { lte: now }, lockedAt: null },
        { status: OutboxStatus.FAILED, nextAttemptAt: { lte: now }, lockedAt: null },
        { status: OutboxStatus.PROCESSING, lockedAt: { lt: lockExpirationThreshold } }, // Stale locks
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  if (candidates.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let processedCount = 0;
  let failedCount = 0;

  for (const event of candidates) {
    // Lock event
    const claimed = await prisma.outboxEvent.updateMany({
      where: {
        id: event.id,
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED, OutboxStatus.PROCESSING] },
      },
      data: {
        status: OutboxStatus.PROCESSING,
        lockedAt: now,
        lockedBy: workerId,
      },
    });

    if (claimed.count === 0) {
      continue; // Event claimed by another concurrent worker
    }

    try {
      const handlers = eventHandlers.get(event.eventType) || [];

      // Execute all registered handlers sequentially
      for (const handler of handlers) {
        await handler({
          id: event.id,
          tenantId: event.tenantId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.payload,
        });
      }

      // Mark processed
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxStatus.PROCESSED,
          processedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
          lastError: null,
        },
      });

      processedCount++;
    } catch (err: any) {
      failedCount++;
      const nextAttempt = event.attemptCount + 1;
      const isDeadLetter = nextAttempt >= 5;

      // Exponential backoff: 10s, 30s, 90s, 270s
      const backoffSeconds = Math.min(300, 10 * Math.pow(3, event.attemptCount));
      const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);

      logger.error(
        { err, eventId: event.id, eventType: event.eventType, attempt: nextAttempt, isDeadLetter },
        'Outbox event execution failed',
      );

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: isDeadLetter ? OutboxStatus.DEAD_LETTER : OutboxStatus.FAILED,
          attemptCount: nextAttempt,
          nextAttemptAt,
          lockedAt: null,
          lockedBy: null,
          lastError: err?.message || String(err),
        },
      });
    }
  }

  return { processed: processedCount, failed: failedCount };
}

/**
 * Replays a dead-letter outbox event.
 */
export async function replayDeadLetterEvent(eventId: string) {
  const event = await prisma.outboxEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  return prisma.outboxEvent.update({
    where: { id: eventId },
    data: {
      status: OutboxStatus.PENDING,
      attemptCount: 0,
      nextAttemptAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    },
  });
}

/**
 * Fetches outbox operational telemetry.
 */
export async function getOutboxStats() {
  const counts = await prisma.outboxEvent.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const stats: Record<string, number> = {
    PENDING: 0,
    PROCESSING: 0,
    PROCESSED: 0,
    FAILED: 0,
    DEAD_LETTER: 0,
  };

  for (const item of counts) {
    stats[item.status] = item._count.id;
  }

  return stats;
}

/**
 * Lists dead-letter events for Super Admin operations review.
 */
export async function listDeadLetterEvents(page = 1, limit = 25) {
  const skip = (Math.max(1, page) - 1) * Math.min(100, limit);

  const [total, events] = await Promise.all([
    prisma.outboxEvent.count({
      where: { status: OutboxStatus.DEAD_LETTER },
    }),
    prisma.outboxEvent.findMany({
      where: { status: OutboxStatus.DEAD_LETTER },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
  ]);

  return {
    data: events,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
