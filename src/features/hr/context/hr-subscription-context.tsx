"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { HrFeatureId, HrPlanId } from "@/features/hr/types/hr-subscription";
import {
  cancelSubscriptionSandbox,
  getMySubscription,
  getSubscriptionErrorCode,
  isPremiumPlanCode,
  purchaseAskAiPack,
  type MySubscription,
  type SubscriptionLimits,
} from "@/features/subscription/services/subscription.service";

interface HrSubscriptionContextValue {
  planId: HrPlanId;
  /** true khi đang tải subscription từ BE */
  loading: boolean;
  subscription: MySubscription | null;
  isPremium: boolean;
  limits: SubscriptionLimits | null;
  /** true nếu có thể generate ngay (Premium = luôn true; Free = ngoài cooldown) */
  canGenerateNow: boolean;
  /** Thời điểm hết cooldown (null nếu không đang cooldown / chưa từng generate) */
  cooldownEndsAt: Date | null;
  hasFeature: (featureId: HrFeatureId) => boolean;
  /** Hạ Free — hành động thật, đồng bộ (khác upgrade, không cần thanh toán) */
  cancelPremium: () => Promise<void>;
  purchaseAskAiPack: (extra?: number) => Promise<void>;
  refresh: () => Promise<void>;
  lastErrorCode: string | null;
}

const HrSubscriptionContext = createContext<HrSubscriptionContextValue | null>(null);

function mapPlanCodeToHrPlanId(planCode: string): HrPlanId {
  return isPremiumPlanCode(planCode) ? "HR_PREMIUM" : "HR_FREE";
}

export function HrSubscriptionProvider({ children }: { children: ReactNode }) {
  const [planId, setPlanId] = useState<HrPlanId>("HR_FREE");
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sub = await getMySubscription();
      setSubscription(sub);
      setPlanId(mapPlanCodeToHrPlanId(sub.planCode));
      setLastErrorCode(null);
    } catch (err) {
      setLastErrorCode(getSubscriptionErrorCode(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const cancelPremium = useCallback(async () => {
    const sub = await cancelSubscriptionSandbox();
    setSubscription(sub);
    setPlanId(mapPlanCodeToHrPlanId(sub.planCode));
  }, []);

  const buyAskAiPack = useCallback(async (extra = 200) => {
    const sub = await purchaseAskAiPack(extra);
    setSubscription(sub);
  }, []);

  const value = useMemo<HrSubscriptionContextValue>(() => {
    const limits = subscription?.limits ?? null;
    const isPremium = subscription ? isPremiumPlanCode(subscription.planCode) : false;

    const hasFeature = (featureId: HrFeatureId) => {
      if (!limits) return false;
      if (featureId === "export") return limits.canExport;
      if (featureId === "askAi") return limits.askAiPerMonth > 0;
      if (featureId === "publish") return limits.canPublish;
      if (featureId === "unlimitedGenerate") return limits.generateUnlimited;
      return false;
    };

    let canGenerateNow = true;
    let cooldownEndsAt: Date | null = null;
    if (limits && !limits.generateUnlimited && subscription?.lastSuccessfulGenerateAt) {
      const last = new Date(subscription.lastSuccessfulGenerateAt);
      const endsAt = new Date(last.getTime() + limits.generateCooldownHours * 60 * 60 * 1000);
      if (endsAt.getTime() > Date.now()) {
        canGenerateNow = false;
        cooldownEndsAt = endsAt;
      }
    }

    return {
      planId,
      loading,
      subscription,
      isPremium,
      limits,
      canGenerateNow,
      cooldownEndsAt,
      hasFeature,
      cancelPremium,
      purchaseAskAiPack: buyAskAiPack,
      refresh,
      lastErrorCode,
    };
  }, [planId, loading, subscription, cancelPremium, buyAskAiPack, refresh, lastErrorCode]);

  return (
    <HrSubscriptionContext.Provider value={value}>{children}</HrSubscriptionContext.Provider>
  );
}

export function useHrSubscription(): HrSubscriptionContextValue {
  const ctx = useContext(HrSubscriptionContext);
  if (!ctx) {
    throw new Error("useHrSubscription must be used within HrSubscriptionProvider");
  }
  return ctx;
}
