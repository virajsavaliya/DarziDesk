import React from 'react';
import type { OrderStatus } from '../../../types/dashboard';
import {
  Clock,
  UserCheck,
  Scissors,
  Shirt,
  ShieldCheck,
  PackageCheck,
  Truck,
  Check,
  AlertCircle,
} from 'lucide-react';

export interface BespokeStageItem {
  status: OrderStatus;
  label: string;
  stepNumber: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const BESPOKE_STAGES: BespokeStageItem[] = [
  {
    status: 'PLACED',
    label: 'Order Placed',
    stepNumber: 1,
    description: 'Fabric selected & garment order booked in workshop',
    icon: Clock,
  },
  {
    status: 'MEASUREMENT_CONFIRMED',
    label: 'Measurements Verified',
    stepNumber: 2,
    description: 'Master tailor confirmed customer body measurements',
    icon: UserCheck,
  },
  {
    status: 'CUTTING',
    label: 'Cutting Fabric',
    stepNumber: 3,
    description: 'Pattern mapped onto fabric and precision cutting in progress',
    icon: Scissors,
  },
  {
    status: 'STITCHING',
    label: 'Stitching Garment',
    stepNumber: 4,
    description: 'Craftsman assembling and sewing garment pieces',
    icon: Shirt,
  },
  {
    status: 'QUALITY_CHECK',
    label: 'Quality Check',
    stepNumber: 5,
    description: 'Final stitching inspection, buttons, and iron finish',
    icon: ShieldCheck,
  },
  {
    status: 'READY',
    label: 'Ready for Pickup',
    stepNumber: 6,
    description: 'Garment packed and ready for customer collection or delivery',
    icon: PackageCheck,
  },
  {
    status: 'DELIVERED',
    label: 'Delivered',
    stepNumber: 7,
    description: 'Order fulfilled and received by customer',
    icon: Truck,
  },
];

interface VerticalOrderPipelineProps {
  currentStatus: OrderStatus;
}

export const VerticalOrderPipeline: React.FC<VerticalOrderPipelineProps> = ({
  currentStatus,
}) => {
  const isCancelled = currentStatus === 'CANCELLED';
  const currentStageIndex = BESPOKE_STAGES.findIndex((s) => s.status === currentStatus);

  if (isCancelled) {
    return (
      <div className="p-4 rounded-xl bg-error-light border border-error/30 text-error flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div>
          <div className="text-xs font-bold uppercase tracking-wider">Order Cancelled</div>
          <p className="text-xs mt-0.5">
            This order was stopped. Fabric reservation and billing have been resolved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 py-2">
      {BESPOKE_STAGES.map((stage, idx) => {
        const isCompleted = currentStageIndex > idx;
        const isCurrent = currentStageIndex === idx;
        const StageIcon = stage.icon;

        return (
          <div
            key={stage.status}
            className={`relative flex items-start gap-3.5 p-3 rounded-xl transition-all ${
              isCurrent
                ? 'bg-brand/10 border-2 border-brand/30 shadow-xs'
                : isCompleted
                ? 'bg-surface/50 opacity-90'
                : 'opacity-50'
            }`}
          >
            {/* Connecting line between stages */}
            {idx < BESPOKE_STAGES.length - 1 && (
              <div
                className={`absolute left-6.5 top-10 bottom-[-8px] w-0.5 -z-0 ${
                  currentStageIndex > idx ? 'bg-success' : 'bg-border'
                }`}
              />
            )}

            {/* Stage Icon badge */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 transition-transform ${
                isCompleted
                  ? 'bg-success text-white shadow-xs'
                  : isCurrent
                  ? 'bg-brand text-white ring-4 ring-brand/20 scale-110'
                  : 'bg-surface border-2 border-border text-text-muted'
              }`}
            >
              {isCompleted ? (
                <Check className="w-4 h-4 stroke-[3]" />
              ) : isCurrent ? (
                <StageIcon className="w-3.5 h-3.5" />
              ) : (
                <span className="text-[11px] font-bold">{stage.stepNumber}</span>
              )}
            </div>

            {/* Stage info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`text-xs font-bold leading-tight ${
                    isCurrent
                      ? 'text-brand text-sm'
                      : isCompleted
                      ? 'text-text-primary'
                      : 'text-text-muted'
                  }`}
                >
                  {stage.label}
                </div>
                {isCurrent && (
                  <span className="px-2 py-0.5 rounded-full bg-brand text-white text-[10px] font-extrabold uppercase tracking-wide shrink-0">
                    Active Stage
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[10px] font-bold text-success flex items-center gap-1 shrink-0">
                    Completed
                  </span>
                )}
              </div>
              <p
                className={`text-xs mt-0.5 leading-relaxed ${
                  isCurrent ? 'text-text-secondary font-medium' : 'text-text-muted'
                }`}
              >
                {stage.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
