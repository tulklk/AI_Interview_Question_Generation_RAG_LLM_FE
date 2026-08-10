/**
 * Gamification API module.
 *
 * Calls real backend endpoints:
 *   GET  /api/candidate/gamification/progress
 *   GET  /api/candidate/gamification/activity?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   GET  /api/candidate/gamification/achievements
 *   PATCH /api/candidate/gamification/daily-goal   body: { dailyGoalXp: number }
 *   GET  /api/candidate/gamification/xp-history?page=1&pageSize=20
 */

import { apiClient } from "@/core/api/http-client";
import type {
  DailyActivity,
  DailyGoalPreset,
  GamificationAchievement,
  UserProgress,
  XpHistoryEntry,
} from "@/features/gamification/types/gamification.types";

// ── Normalizers ───────────────────────────────────────────────────────────────
// Guard against field-name differences between BE DTO and FE types.

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" ? v : fallback;
}

function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function normalizeProgress(raw: unknown): UserProgress {
  const d = asRecord(raw);
  const totalXp = num(d.totalXp);
  const level = num(d.level, 1);
  const currentLevelXp = num(d.currentLevelXp, totalXp);
  const xpRequiredForNextLevel = num(d.xpRequiredForNextLevel, 100);
  const progressPercentage =
    typeof d.progressPercentage === "number"
      ? d.progressPercentage
      : xpRequiredForNextLevel > 0
        ? Math.round((currentLevelXp / xpRequiredForNextLevel) * 100)
        : 0;

  return {
    totalXp,
    level,
    currentLevelXp,
    xpRequiredForNextLevel,
    progressPercentage,
    currentStreak: num(d.currentStreak),
    longestStreak: num(d.longestStreak),
    dailyGoalXp: num(d.dailyGoalXp, 50),
    todayXp: num(d.todayXp),
    dailyGoalCompleted: bool(d.dailyGoalCompleted),
    totalPracticeSessions: num(d.totalPracticeSessions),
    nextLevel: typeof d.nextLevel === "number" ? d.nextLevel : level + 1,
  };
}

function normalizeActivity(raw: unknown): DailyActivity {
  const d = asRecord(raw);
  return {
    date: str(d.date),
    xp: num(d.xp),
    questionsCompleted: num(d.questionsCompleted),
    sessionsCompleted: num(d.sessionsCompleted),
    active: bool(d.active),
  };
}

function normalizeAchievement(raw: unknown): GamificationAchievement {
  const d = asRecord(raw);
  return {
    id: str(d.id ?? d.code),
    code: str(d.code ?? d.id),
    name: str(d.name),
    description: str(d.description),
    icon: typeof d.icon === "string" ? d.icon : undefined,
    category: (d.category as GamificationAchievement["category"]) ?? undefined,
    unlocked: bool(d.unlocked),
    unlockedAt: typeof d.unlockedAt === "string" ? d.unlockedAt : undefined,
    xpReward: typeof d.xpReward === "number" ? d.xpReward : undefined,
    currentValue: typeof d.currentValue === "number" ? d.currentValue : undefined,
    targetValue: typeof d.targetValue === "number" ? d.targetValue : undefined,
  };
}

function normalizeXpEntry(raw: unknown): XpHistoryEntry {
  const d = asRecord(raw);
  return {
    id: str(d.id),
    type: (d.type as XpHistoryEntry["type"]) ?? "QuestionCompleted",
    xp: num(d.xp),
    label: str(d.label ?? d.description),
    earnedAt: str(d.earnedAt ?? d.createdAt),
  };
}

/** ISO date string for N days ago: "YYYY-MM-DD" */
function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getMyProgress(): Promise<UserProgress> {
  const res = await apiClient.get("/api/candidate/gamification/progress");
  // API wraps the payload: { data: { totalXp, level, … }, message: "OK" }
  // Unwrap one level before normalizing; fall back to res.data if not wrapped.
  const payload = asRecord(res.data);
  const raw = payload.data ?? res.data;
  return normalizeProgress(raw);
}

export async function getDailyActivity(days = 365): Promise<DailyActivity[]> {
  const from = isoDateDaysAgo(days - 1);
  const to = isoDateDaysAgo(0);
  const res = await apiClient.get(
    `/api/candidate/gamification/activity?from=${from}&to=${to}`
  );
  const raw: unknown = res.data;
  const list = Array.isArray(raw) ? raw : asRecord(raw).items ?? asRecord(raw).data ?? [];
  return (list as unknown[]).map(normalizeActivity);
}

export async function getAchievements(): Promise<GamificationAchievement[]> {
  const res = await apiClient.get("/api/candidate/gamification/achievements");
  const raw: unknown = res.data;
  const list = Array.isArray(raw) ? raw : asRecord(raw).items ?? asRecord(raw).data ?? [];
  return (list as unknown[]).map(normalizeAchievement);
}

export async function updateDailyGoal(
  dailyGoalXp: DailyGoalPreset
): Promise<{ dailyGoalXp: number }> {
  const res = await apiClient.patch("/api/candidate/gamification/daily-goal", {
    dailyGoalXp,
  });
  const d = asRecord(res.data);
  return { dailyGoalXp: typeof d.dailyGoalXp === "number" ? d.dailyGoalXp : dailyGoalXp };
}

export async function getXpHistory(
  page = 1,
  pageSize = 20
): Promise<{ items: XpHistoryEntry[]; total: number }> {
  const res = await apiClient.get(
    `/api/candidate/gamification/xp-history?page=${page}&pageSize=${pageSize}`
  );
  const d = asRecord(res.data);
  const rawList = Array.isArray(res.data)
    ? res.data
    : (Array.isArray(d.items) ? d.items : Array.isArray(d.data) ? d.data : []);
  const total =
    typeof d.total === "number"
      ? d.total
      : typeof d.totalCount === "number"
        ? d.totalCount
        : rawList.length;
  return {
    items: (rawList as unknown[]).map(normalizeXpEntry),
    total,
  };
}
