"use client";

import { useState, useEffect } from "react";
import { getAchievements } from "@/features/gamification/api/gamification-api";
import type { GamificationAchievement } from "@/features/gamification/types/gamification.types";

interface UseAchievementsResult {
  achievements: GamificationAchievement[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAchievements(): UseAchievementsResult {
  const [achievements, setAchievements] = useState<GamificationAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAchievements()
      .then((data) => {
        if (!cancelled) setAchievements(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load achievements");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trigger]);

  return {
    achievements,
    loading,
    error,
    refresh: () => setTrigger((n) => n + 1),
  };
}
