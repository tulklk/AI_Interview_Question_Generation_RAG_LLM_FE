"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAdminFeedbacks,
  type AdminFeedback,
} from "@/features/guest/services/feedback.service";

export const ADMIN_FEEDBACKS_UPDATED_EVENT = "admin-feedbacks-updated";

const POLL_MS = 60_000;

export function notifyAdminFeedbacksUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_FEEDBACKS_UPDATED_EVENT));
}

export function useAdminPendingFeedbacks() {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingItems, setPendingItems] = useState<AdminFeedback[]>([]);

  const reload = useCallback(async () => {
    try {
      const result = await getAdminFeedbacks({
        status: "Pending",
        page: 1,
        pageSize: 5,
      });
      setPendingCount(result.total);
      setPendingItems(result.items);
    } catch {
      // Non-critical — badge/bell stay at last known state.
    }
  }, []);

  useEffect(() => {
    void reload();

    const interval = window.setInterval(() => void reload(), POLL_MS);

    function onVisibility() {
      if (document.visibilityState === "visible") void reload();
    }

    function onUpdated() {
      void reload();
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(ADMIN_FEEDBACKS_UPDATED_EVENT, onUpdated);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(ADMIN_FEEDBACKS_UPDATED_EVENT, onUpdated);
    };
  }, [reload]);

  return { pendingCount, pendingItems, reload };
}
