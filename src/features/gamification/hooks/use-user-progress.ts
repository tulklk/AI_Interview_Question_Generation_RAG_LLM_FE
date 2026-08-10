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

// ── Progress snapshot ─────────────────────────────────────────────────────────
// After a session completes, practice-session.tsx stores the UserProgress
// returned by POST /complete into sessionStorage. We use it here as an
// optimistic seed so the GamificationProgressCard shows the correct XP
// immediately — even if GET /api/candidate/gamification/progress hasn't
// been updated by the backend yet (common due to async propagation).

const SNAPSHOT_KEY = "gamification-progress-snapshot";
/** Discard snapshots older than 10 minutes to avoid permanently stale data. */
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;

function readProgressSnapshot(): UserProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const { progress, ts } = JSON.parse(raw) as {
      progress: UserProgress;
      ts: number;
    };
    if (!progress || Date.now() - ts > SNAPSHOT_TTL_MS) {
      window.sessionStorage.removeItem(SNAPSHOT_KEY);
      return null;
    }
    return progress;
  } catch {
    return null;
  }
}

function clearProgressSnapshot() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SNAPSHOT_KEY);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUserProgress(): UseUserProgressResult {
  // Seed from snapshot so the card shows non-zero data before the API responds.
  const [progress, setProgress] = useState<UserProgress | null>(
    () => readProgressSnapshot()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMyProgress()
      .then((data) => {
        if (!cancelled) {
          setProgress((prev) => {
            // Keep the snapshot if the backend hasn't caught up on XP yet
            // (i.e. it's returning lower totalXp than what /complete reported).
            if (prev && data.totalXp < prev.totalXp) {
              // However, always take user-controlled settings from the backend
              // (dailyGoalXp can be changed from settings; snapshot still holds old value).
              return {
                ...prev,
                dailyGoalXp: data.dailyGoalXp,
                dailyGoalCompleted: data.dailyGoalCompleted,
                todayXp: data.todayXp,
              };
            }
            // Backend has the latest data — snapshot is no longer needed.
            clearProgressSnapshot();
            return data;
          });
        }
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
    // Show skeleton only while loading AND we have no data at all (snapshot or
    // fresh). If a snapshot was seeded, the card renders immediately.
    loading: loading && !progress,
    error,
    refresh: () => setTrigger((n) => n + 1),
  };
}
