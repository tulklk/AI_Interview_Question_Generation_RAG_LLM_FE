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
import { useUser } from "@/features/auth/context/user-context";
import { localStorageService } from "@/core/storage/local-storage.service";

interface CandidateSubscriptionContextValue {
  planType: CandidatePlanType;
  refreshSubscription: () => Promise<void>;
}

const PLAN_CACHE_KEY = "hiregena-candidate-plan";
/** Which user's plan the above cache belongs to — see readCachedPlan. */
const PLAN_CACHE_USER_KEY = "hiregena-candidate-plan-user";

// Fix: the cache used to be read/written with no user scoping, so on a
// shared/kiosk browser a Premium user's cached plan would be applied
// (briefly, before the real API call corrects it) to the NEXT user who logs
// in on the same browser — including triggering a false "Premium revoked"
// dialog for someone who never had Premium. Only trust the cache when it was
// written for the exact user currently logged in.
// Uses localStorageService (not raw localStorage) so a restricted-storage
// browser (e.g. Safari private mode) can't throw during this mount effect.
function readCachedPlan(userId: string | undefined): CandidatePlanType {
  if (!userId) return "FREE";
  if (localStorageService.get(PLAN_CACHE_USER_KEY) !== userId) return "FREE";
  return localStorageService.get(PLAN_CACHE_KEY) === "PREMIUM" ? "PREMIUM" : "FREE";
}

const CandidateSubscriptionContext =
  createContext<CandidateSubscriptionContextValue | null>(null);

export function CandidateSubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const userId = user?.id;

  // Luôn khởi tạo FREE ở cả SSR và hydrate đầu tiên — không đọc localStorage trong
  // useState initializer (tránh hydration mismatch: server FREE vs client PREMIUM).
  const [planType, setPlanType] = useState<CandidatePlanType>("FREE");

  const refreshSubscription = useCallback(async () => {
    try {
      const sub = await getCandidateSubscription();
      setPlanType(sub.planType);
      if (userId) {
        localStorageService.set(PLAN_CACHE_KEY, sub.planType);
        localStorageService.set(PLAN_CACHE_USER_KEY, userId);
      }
    } catch {
      // keep current state on error
    }
  }, [userId]);

  useEffect(() => {
    // Sau mount: áp cache ngay (nếu có, và chỉ khi thuộc đúng user hiện tại) rồi refresh từ API.
    const cached = readCachedPlan(userId);
    if (cached === "PREMIUM") setPlanType("PREMIUM");
    void refreshSubscription();
  }, [userId, refreshSubscription]);

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
