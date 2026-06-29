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
  DEFAULT_HR_PLAN_ID,
  HR_PLANS,
  getPlanLimits,
  getUsageCaps,
  normalizeStoredHrPlanId,
  planMeetsFeature,
} from "@/features/hr/data/hr-subscription";

const STORAGE_KEY = "hiregen-hr-plan";

interface HrSubscriptionContextValue {
  planId: HrPlanId;
  setPlanId: (id: HrPlanId) => void;
  hasFeature: (featureId: HrFeatureId) => boolean;
  limits: (typeof HR_PLANS)[HrPlanId]["limits"];
  usageCaps: Record<string, number>;
}

const HrSubscriptionContext = createContext<HrSubscriptionContextValue | null>(null);

export function HrSubscriptionProvider({ children }: { children: ReactNode }) {
  const [planId, setPlanIdState] = useState<HrPlanId>(DEFAULT_HR_PLAN_ID);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const normalized = normalizeStoredHrPlanId(raw);
    if (normalized) {
      setPlanIdState(normalized);
      if (raw && raw !== normalized) {
        localStorage.setItem(STORAGE_KEY, normalized);
      }
    }
  }, []);

  const setPlanId = useCallback((id: HrPlanId) => {
    setPlanIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const value = useMemo<HrSubscriptionContextValue>(() => {
    const hasFeature = (featureId: HrFeatureId) => planMeetsFeature(planId, featureId);
    return {
      planId,
      setPlanId,
      hasFeature,
      limits: getPlanLimits(planId),
      usageCaps: getUsageCaps(planId),
    };
  }, [planId, setPlanId]);

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
