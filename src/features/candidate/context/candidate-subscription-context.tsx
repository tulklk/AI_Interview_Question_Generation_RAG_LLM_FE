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
import type { CandidatePlanType } from "@/features/candidate/types/billing";
import { getCandidateSubscription } from "@/features/candidate/services/candidate-billing.service";

interface CandidateSubscriptionContextValue {
  planType: CandidatePlanType;
  refreshSubscription: () => Promise<void>;
}

const PLAN_CACHE_KEY = "hiregena-candidate-plan";

function readCachedPlan(): CandidatePlanType {
  if (typeof window === "undefined") return "FREE";
  const v = localStorage.getItem(PLAN_CACHE_KEY);
  return v === "PREMIUM" ? "PREMIUM" : "FREE";
}

const CandidateSubscriptionContext =
  createContext<CandidateSubscriptionContextValue | null>(null);

export function CandidateSubscriptionProvider({ children }: { children: ReactNode }) {
  const [planType, setPlanType] = useState<CandidatePlanType>(readCachedPlan);

  const refreshSubscription = useCallback(async () => {
    try {
      const sub = await getCandidateSubscription();
      setPlanType(sub.planType);
      localStorage.setItem(PLAN_CACHE_KEY, sub.planType);
    } catch {
      // keep current state on error
    }
  }, []);

  useEffect(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  const value = useMemo(
    () => ({ planType, refreshSubscription }),
    [planType, refreshSubscription]
  );

  return (
    <CandidateSubscriptionContext.Provider value={value}>
      {children}
    </CandidateSubscriptionContext.Provider>
  );
}

export function useCandidateSubscription(): CandidateSubscriptionContextValue {
  const ctx = useContext(CandidateSubscriptionContext);
  if (!ctx) {
    throw new Error(
      "useCandidateSubscription must be used within CandidateSubscriptionProvider"
    );
  }
  return ctx;
}
