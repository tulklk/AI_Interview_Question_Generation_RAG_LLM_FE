"use client";

import { useState, useEffect } from "react";
import { getDailyActivity } from "@/features/gamification/api/gamification-api";
import type { DailyActivity } from "@/features/gamification/types/gamification.types";

interface UseDailyActivityResult {
  activity: DailyActivity[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDailyActivity(days = 365): UseDailyActivityResult {
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getDailyActivity(days)
      .then((data) => {
        if (!cancelled) setActivity(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load activity");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [days, trigger]);

  return {
    activity,
    loading,
    error,
    refresh: () => setTrigger((n) => n + 1),
  };
}
