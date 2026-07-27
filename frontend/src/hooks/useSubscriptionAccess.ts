import { useState, useEffect } from 'react';
import { fetchUserSubscription, fetchActivePlans, type UserSubscription, type Plan } from '@/lib/adminApi';

export interface SubscriptionAccess {
  isLoading: boolean;
  hasSubscription: boolean;
  currentPlan: Plan | null;
  subscription: UserSubscription | null;
  limits: Record<string, number | boolean>;
  canAccess: (feature: string) => boolean;
  isWithinLimit: (limitKey: string, currentUsage: number) => boolean;
  isPro: boolean;
  isEnterprise: boolean;
  isTrial: boolean;
}

export function useSubscriptionAccess(): SubscriptionAccess {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const [sub, plans] = await Promise.all([
        fetchUserSubscription(),
        fetchActivePlans(),
      ]);
      setSubscription(sub);
      if (sub && plans.length > 0) {
        const plan = plans.find((p: Plan) => p.id === sub.plan_id);
        setCurrentPlan(plan || null);
      }
    } catch (err) {
      console.error('Failed to load subscription access:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const parseLimits = (): Record<string, number | boolean> => {
    if (!currentPlan?.limits) return {};
    try {
      return JSON.parse(currentPlan.limits);
    } catch {
      return {};
    }
  };

  const parseFeatures = (): string[] => {
    if (!currentPlan?.features) return [];
    try {
      return JSON.parse(currentPlan.features);
    } catch {
      return [];
    }
  };

  const limits = parseLimits();

  const canAccess = (feature: string): boolean => {
    if (!subscription || subscription.status === 'cancelled' || subscription.status === 'expired') {
      return false;
    }
    const features = parseFeatures();
    return features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
  };

  const isWithinLimit = (limitKey: string, currentUsage: number): boolean => {
    const limitValue = limits[limitKey];
    if (limitValue === undefined) return false;
    if (limitValue === true) return true;
    if (typeof limitValue === 'number') {
      if (limitValue === -1) return true; // unlimited
      return currentUsage < limitValue;
    }
    return false;
  };

  const hasSubscription = !!subscription && (subscription.status === 'active' || subscription.status === 'trial');
  const isPro = currentPlan?.name_en?.toLowerCase().includes('pro') || false;
  const isEnterprise = currentPlan?.name_en?.toLowerCase().includes('enterprise') || false;
  const isTrial = subscription?.status === 'trial';

  return {
    isLoading,
    hasSubscription,
    currentPlan,
    subscription,
    limits,
    canAccess,
    isWithinLimit,
    isPro,
    isEnterprise,
    isTrial,
  };
}