"use client";

import { useEffect, useRef, useState } from "react";

function isPremiumPlan(plan: string): boolean {
  return plan.toUpperCase().includes("PREMIUM");
}

interface UseUpgradeWatcherOptions {
  /** How often to poll for subscription changes (ms). Default 30s. */
  intervalMs?: number;
  /**
   * localStorage key to persist the last-seen plan across page loads.
   * Required for contexts that don't cache plan in localStorage themselves (e.g. HR).
   */
  lastSeenKey?: string;
}

/**
 * Detects when the user's plan transitions from non-premium to premium
 * (e.g. admin grants premium) and returns a flag to show a congrats dialog.
 *
 * Also polls the subscription on an interval and on tab visibility change
 * so the user sees the upgrade notification promptly without a page reload.
 */
export function useUpgradeWatcher(
  planId: string | null,
  refresh: () => Promise<void>,
  { intervalMs = 30_000, lastSeenKey }: UseUpgradeWatcherOptions = {}
) {
  const initializedRef = useRef(false);
  const prevPlanRef = useRef<string | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);

  // Detect FREE → PREMIUM transition
  useEffect(() => {
    if (planId === null) return; // still loading

    if (!initializedRef.current) {
      initializedRef.current = true;

      // For cross-session detection: read persisted last-seen plan from localStorage.
      // Candidate context already caches its own plan key, so lastSeenKey is optional there.
      const lastSeen = lastSeenKey ? (localStorage.getItem(lastSeenKey) ?? null) : null;
      const effectivePrev = lastSeen ?? planId;

      if (effectivePrev !== planId && !isPremiumPlan(effectivePrev) && isPremiumPlan(planId)) {
        setShowCongrats(true);
      }

      prevPlanRef.current = planId;
      if (lastSeenKey) localStorage.setItem(lastSeenKey, planId);
      return;
    }

    const prev = prevPlanRef.current;
    if (prev !== null && !isPremiumPlan(prev) && isPremiumPlan(planId)) {
      setShowCongrats(true);
    }
    prevPlanRef.current = planId;
    if (lastSeenKey) localStorage.setItem(lastSeenKey, planId);
  }, [planId, lastSeenKey]);

  // Poll subscription on interval
  useEffect(() => {
    const id = setInterval(() => { void refresh(); }, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  // Refresh when user returns to the tab
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  return {
    showCongrats,
    dismiss: () => setShowCongrats(false),
  };
}
