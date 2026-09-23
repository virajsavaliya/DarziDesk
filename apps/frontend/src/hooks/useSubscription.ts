import { useState, useEffect, useCallback } from 'react';

export type SubscriptionBillingCycle = 'MONTHLY' | 'YEARLY';

export interface SubscriptionData {
  subscriptionId: string;
  planId: string;
  planName: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  billingCycle: 'MONTHLY' | 'YEARLY';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string | null;
  isTrial: boolean;
  trialDaysRemaining?: number | null;
  maxStaffAccounts: number;
  maxOrdersPerMonth: number;
  unlockedFeatures: string[];
  lockedFeatures: string[];
  plan: {
    id: string;
    name: string;
    priceMonthly: string;
    priceYearly: string;
    features: string[];
  };
}

export function useSubscription(authToken: string | null, isOwner: boolean = false) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [targetFeatureForUpgrade, setTargetFeatureForUpgrade] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!authToken || !isOwner) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/subscription/current', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load subscription status (${res.status})`);
      }

      const json = await res.json();
      setSubscription(json.data ?? null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading subscription');
    } finally {
      setLoading(false);
    }
  }, [authToken, isOwner]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isFeatureLocked = useCallback(
    (featureId: string): boolean => {
      if (!isOwner) return false;
      if (!subscription) return false;
      return subscription.lockedFeatures.includes(featureId);
    },
    [subscription, isOwner],
  );

  const upgradePlan = async (
    planName: string,
    billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY',
    paymentMethod: string = 'UPI',
  ): Promise<SubscriptionData> => {
    if (!authToken) throw new Error('Not authenticated');

    const res = await fetch('/api/subscription/upgrade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ planName, billingCycle, paymentMethod }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || json.message || 'Failed to upgrade plan');
    }

    const updated = json.data as SubscriptionData;
    setSubscription(updated);
    return updated;
  };

  const openUpgradeModal = (featureId?: string) => {
    setTargetFeatureForUpgrade(featureId ?? null);
    setIsUpgradeModalOpen(true);
  };

  const closeUpgradeModal = () => {
    setIsUpgradeModalOpen(false);
    setTargetFeatureForUpgrade(null);
  };

  return {
    subscription,
    loading,
    error,
    isFeatureLocked,
    upgradePlan,
    refetch: fetchSubscription,
    isUpgradeModalOpen,
    targetFeatureForUpgrade,
    targetUpgradePlan: targetFeatureForUpgrade ?? undefined,
    openUpgradeModal,
    closeUpgradeModal,
  };
}
