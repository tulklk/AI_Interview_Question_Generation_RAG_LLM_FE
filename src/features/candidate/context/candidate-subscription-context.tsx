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
import { useSubscriptionRealtime } from "@/features/subscription/hooks/use-subscription-realtime";

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
  // Luôn khởi tạo FREE ở cả SSR và hydrate đầu tiên — không đọc localStorage trong
  // useState initializer (tránh hydration mismatch: server FREE vs client PREMIUM).
  const [planType, setPlanType] = useState<CandidatePlanType>("FREE");

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
    // Sau mount: áp cache ngay (nếu có) rồi refresh từ API.
    const cached = readCachedPlan();
    if (cached === "PREMIUM") setPlanType("PREMIUM");
    void refreshSubscription();
  }, [refreshSubscription]);

  // ── Real-time subscription updates ────────────────────────────────────────
  // Listens on the SignalR hub for PaymentPaid / admin plan-change events and
  // immediately refreshes so planType updates without a page reload.
  // A 5-minute background poll runs as fallback when SignalR is unavailable.
  useSubscriptionRealtime({ onSubscriptionChanged: refreshSubscription });

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
