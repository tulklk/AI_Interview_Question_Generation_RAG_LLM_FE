"use client";

import { useCallback, useEffect, useState } from "react";
import { localStorageService } from "@/core/storage/local-storage.service";
import { useUser } from "@/features/auth/context/user-context";
import type { CompletedSessionSummary } from "@/features/candidate/services/practice-session.service";

export interface WeeklyGoal {
  sessionsTarget: number;
  minutesTarget: number;
}

const DEFAULT_GOAL: WeeklyGoal = { sessionsTarget: 3, minutesTarget: 60 };

function goalKey(userId: string): string {
  return `hiregena-weekly-goal-${userId}`;
}

/**
 * Weekly practice goal is a client-only preference — there's no BE field for
 * it. Stored per-user in localStorage so it's a genuine (if local) setting
 * rather than fabricated data; `hasSetGoal` distinguishes "no goal configured
 * yet" from "goal is 0" so the UI can show onboarding instead of a fake target.
 */
export function useWeeklyGoal(sessions: CompletedSessionSummary[]) {
  const { user } = useUser();
  const userId = user?.id ?? "anonymous";
  const [goal, setGoalState] = useState<WeeklyGoal | null>(null);
  const [hasSetGoal, setHasSetGoal] = useState(false);

  useEffect(() => {
    const stored = localStorageService.getJSON<WeeklyGoal>(goalKey(userId));
    setGoalState(stored ?? DEFAULT_GOAL);
    setHasSetGoal(stored !== null);
  }, [userId]);

  const setGoal = useCallback(
    (next: WeeklyGoal) => {
      localStorageService.setJSON(goalKey(userId), next);
      setGoalState(next);
      setHasSetGoal(true);
    },
    [userId]
  );

  const now = Date.now();
  const weekStart = now - 7 * 86400000;
  const sessionsThisWeek = sessions.filter((s) => new Date(s.completedAt ?? 0).getTime() >= weekStart);
  const sessionsCount = sessionsThisWeek.length;
  const minutesCount = sessionsThisWeek.reduce((sum, s) => sum + s.durationMinutes, 0);

  // getDay(): 0 = Sunday ... 6 = Saturday; treat Sunday as the last day of the week.
  const dayOfWeek = new Date().getDay();
  const daysLeft = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  return {
    goal: goal ?? DEFAULT_GOAL,
    hasSetGoal,
    setGoal,
    sessionsCount,
    minutesCount,
    daysLeft,
  };
}
