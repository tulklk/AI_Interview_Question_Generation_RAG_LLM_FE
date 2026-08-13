"use client";

import { useEffect, useRef } from "react";
import type { HubConnection } from "@microsoft/signalr";
import {
  createSubscriptionPaymentHubConnection,
  PAYMENT_PAID_EVENT,
  normalizePaymentPaidEvent,
} from "@/features/subscription/services/subscription-payment-hub";

/**
 * Additional hub events the backend may broadcast when an admin changes a
 * user's subscription plan (activate-premium, revoke, renew, etc.).
 * We listen to all plausible names so the real-time update works regardless
 * of the exact event name the BE team settled on.
 */
const PLAN_CHANGE_EVENTS = [
  "SubscriptionChanged",
  "SubscriptionUpdated",
  "PlanAssigned",
  "PlanUpdated",
  "PremiumGranted",
  "PremiumRevoked",
] as const;

/**
 * Background poll interval for subscription refresh.
 *
 * The SignalR hub only fires `PaymentPaid` for webhook-confirmed payments.
 * Admin grants/revocations go through the admin API without a hub broadcast,
 * so polling is the only reliable mechanism for detecting those changes.
 *
 * 30 s → user sees plan update within ~30 s of admin action.
 * The `/api/me/subscription` endpoint is lightweight (single DB read) so
 * this frequency is safe even with many concurrent users.
 */
const FALLBACK_POLL_MS = 30_000; // 30 seconds

interface Options {
  /** Called whenever a payment-paid OR admin plan-change event is received. */
  onSubscriptionChanged: () => void | Promise<void>;
  /** Set false to skip the connection entirely (e.g. when user is not logged in). */
  enabled?: boolean;
}

/**
 * Keeps subscription data fresh in real-time:
 *
 * 1. Connects to `/hubs/subscription-payments` via SignalR.
 * 2. Listens for `PaymentPaid` (payment webhook) and plan-change events
 *    (admin grants / revocations) — calls `onSubscriptionChanged` on each.
 * 3. Polls every 30 seconds regardless of SignalR state.
 *    — Admin grants go through the admin REST API without a hub broadcast,
 *      so polling is required to detect them reliably.
 *    — 30 s means the user sees the plan change within ~30 s of admin action.
 *
 * Designed to be used inside both `HrSubscriptionProvider` and
 * `CandidateSubscriptionProvider` so each context stays live without
 * requiring a page refresh.
 */
export function useSubscriptionRealtime({
  onSubscriptionChanged,
  enabled = true,
}: Options): void {
  // Stable ref so the SignalR callback always calls the latest refresh fn
  // without needing it as a dependency of the setup effect.
  const callbackRef = useRef(onSubscriptionChanged);
  useEffect(() => {
    callbackRef.current = onSubscriptionChanged;
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let destroyed = false;

    const handleChange = () => {
      if (destroyed) return;
      void callbackRef.current();
    };

    // ── SignalR ────────────────────────────────────────────────────────────────
    // Bug fix: createSubscriptionPaymentHubConnection() now returns null instead
    // of throwing when it can't even construct a connection (e.g. an
    // unresolvable/malformed hub URL from a misconfigured API base) — that used
    // to throw synchronously and crash this effect (and the whole component
    // tree) instead of falling back to the background poll like every other
    // connection failure here does.
    const conn: HubConnection | null = createSubscriptionPaymentHubConnection();
    if (conn) {
      conn.on(PAYMENT_PAID_EVENT, (raw: unknown) => {
        // Validate the payload — only act on well-formed events.
        if (normalizePaymentPaidEvent(raw)) handleChange();
      });
      for (const event of PLAN_CHANGE_EVENTS) {
        conn.on(event, handleChange);
      }
      void conn.start().catch(() => {
        // Start failed → SignalR unavailable.
        // The 30-second fallback poll below still picks up admin-granted upgrades.
      });
    }

    // ── Background fallback poll ──────────────────────────────────────────────
    // Runs even when SignalR IS connected so the data stays accurate even if
    // an event is missed (e.g. client was offline when the event fired).
    const pollId = window.setInterval(handleChange, FALLBACK_POLL_MS);

    return () => {
      destroyed = true;
      window.clearInterval(pollId);
      if (conn) {
        conn.off(PAYMENT_PAID_EVENT);
        for (const event of PLAN_CHANGE_EVENTS) {
          conn.off(event);
        }
        // Stop asynchronously — don't await here or the cleanup becomes async.
        void conn.stop();
      }
    };
  }, [enabled]);
}
