"use client";

import { useState, useEffect } from "react";
import { getMyProgress } from "@/features/gamification/api/gamification-api";
import type { UserProgress } from "@/features/gamification/types/gamification.types";

interface UseUserProgressResult {
  progress: UserProgress | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useUserProgress(): UseUserProgressResult {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMyProgress()
      .then((data) => {
        if (!cancelled) setProgress(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load progress");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trigger]);

  return {
    progress,
    loading,
    error,
    refresh: () => setTrigger((n) => n + 1),
  };
}
