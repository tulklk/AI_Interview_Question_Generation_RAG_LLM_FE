/**
 * Gamification API module.
 *
 * Currently uses MOCK data while the backend endpoint is not yet available.
 * Replace each function body with a real apiClient call when ready.
 * The return shape (types) must stay identical — only the data source changes.
 *
 * TODO (backend): wire up real endpoints:
 *   GET  /api/candidate/gamification/progress
 *   GET  /api/candidate/gamification/daily-activity?days=365
 *   GET  /api/candidate/gamification/achievements
 *   PATCH /api/candidate/gamification/daily-goal   body: { dailyGoalXp: number }
 *   GET  /api/candidate/gamification/xp-history?page=1&pageSize=20
 */

// import { apiClient } from "@/core/api/http-client";
import type {
  DailyActivity,
  DailyGoalPreset,
  GamificationAchievement,
  UserProgress,
  XpHistoryEntry,
} from "@/features/gamification/types/gamification.types";

// ── Mock helpers ──────────────────────────────────────────────────────────────

/** Generate a deterministic past date string offset by `n` days */
function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getMyProgress(): Promise<UserProgress> {
  // TODO: replace with real call
  // const res = await apiClient.get("/api/candidate/gamification/progress");
  // return res.data as UserProgress;

  await delay(400);
  return {
    totalXp: 1_170,
    level: 6,
    currentLevelXp: 1_170,
    xpRequiredForNextLevel: 1_350,
    progressPercentage: Math.round((1_170 / 1_350) * 100), // ~87
    currentStreak: 4,
    longestStreak: 11,
    dailyGoalXp: 50,
    todayXp: 35,
    dailyGoalCompleted: false,
    totalPracticeSessions: 15,
    nextLevel: 7,
  };
}

export async function getDailyActivity(days = 365): Promise<DailyActivity[]> {
  // TODO: replace with real call
  // const res = await apiClient.get(`/api/candidate/gamification/daily-activity?days=${days}`);
  // return res.data as DailyActivity[];

  await delay(300);

  const result: DailyActivity[] = [];
  for (let i = 0; i < days; i++) {
    const active = deterministicActive(i);
    result.push({
      date: pastDate(days - 1 - i),
      xp: active ? deterministicXp(i) : 0,
      questionsCompleted: active ? deterministicQuestions(i) : 0,
      sessionsCompleted: active ? (i % 7 === 0 ? 2 : 1) : 0,
      active,
    });
  }
  return result;
}

export async function getAchievements(): Promise<GamificationAchievement[]> {
  // TODO: replace with real call
  // const res = await apiClient.get("/api/candidate/gamification/achievements");
  // return res.data as GamificationAchievement[];

  await delay(350);
  return MOCK_ACHIEVEMENTS;
}

export async function updateDailyGoal(
  dailyGoalXp: DailyGoalPreset
): Promise<{ dailyGoalXp: number }> {
  // TODO: replace with real call
  // const res = await apiClient.patch("/api/candidate/gamification/daily-goal", { dailyGoalXp });
  // return res.data as { dailyGoalXp: number };

  await delay(600);
  return { dailyGoalXp };
}

export async function getXpHistory(
  page = 1,
  pageSize = 20
): Promise<{ items: XpHistoryEntry[]; total: number }> {
  // TODO: replace with real call
  // const res = await apiClient.get(`/api/candidate/gamification/xp-history?page=${page}&pageSize=${pageSize}`);
  // return res.data as { items: XpHistoryEntry[]; total: number };

  await delay(300);
  const items: XpHistoryEntry[] = MOCK_XP_HISTORY.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  return { items, total: MOCK_XP_HISTORY.length };
}

// ── Mock data ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deterministicActive(i: number): boolean {
  // ~60% of days active, avoiding random so data is stable across renders
  return (i * 7 + 3) % 17 < 10;
}

function deterministicXp(i: number): number {
  return 10 + ((i * 13 + 7) % 60);
}

function deterministicQuestions(i: number): number {
  return 1 + ((i * 3 + 2) % 5);
}

const MOCK_ACHIEVEMENTS: GamificationAchievement[] = [
  {
    id: "first-step",
    code: "FIRST_STEP",
    name: "First Step",
    description: "Complete your first practice session",
    icon: "🎯",
    category: "practice",
    unlocked: true,
    unlockedAt: pastDate(30),
    xpReward: 20,
  },
  {
    id: "on-fire",
    code: "ON_FIRE",
    name: "On Fire",
    description: "Maintain a 7-day practice streak",
    icon: "🔥",
    category: "streak",
    unlocked: false,
    currentValue: 4,
    targetValue: 7,
  },
  {
    id: "excellent-answer",
    code: "EXCELLENT_ANSWER",
    name: "Excellent Answer",
    description: "Score at least 90% on an interview question",
    icon: "⭐",
    category: "performance",
    unlocked: true,
    unlockedAt: pastDate(14),
    xpReward: 30,
  },
  {
    id: "dedicated",
    code: "DEDICATED",
    name: "Dedicated",
    description: "Complete 100 interview questions",
    icon: "📚",
    category: "practice",
    unlocked: false,
    currentValue: 48,
    targetValue: 100,
  },
  {
    id: "technical-mind",
    code: "TECHNICAL_MIND",
    name: "Technical Mind",
    description: "Complete 50 technical questions",
    icon: "💡",
    category: "practice",
    unlocked: false,
    currentValue: 32,
    targetValue: 50,
  },
  {
    id: "system-thinker",
    code: "SYSTEM_THINKER",
    name: "System Thinker",
    description: "Complete 30 system design questions",
    icon: "🏗️",
    category: "practice",
    unlocked: false,
    currentValue: 8,
    targetValue: 30,
  },
  {
    id: "consistency",
    code: "CONSISTENCY",
    name: "Consistency",
    description: "Complete daily goal on 10 different days",
    icon: "📅",
    category: "consistency",
    unlocked: true,
    unlockedAt: pastDate(5),
    xpReward: 50,
  },
  {
    id: "interview-veteran",
    code: "INTERVIEW_VETERAN",
    name: "Interview Veteran",
    description: "Complete 100 practice sessions",
    icon: "🏆",
    category: "practice",
    unlocked: false,
    currentValue: 15,
    targetValue: 100,
  },
];

const MOCK_XP_HISTORY: XpHistoryEntry[] = [
  { id: "1", type: "QuestionCompleted",  xp: 10, label: "Question completed",     earnedAt: new Date(Date.now() - 3_600_000).toISOString() },
  { id: "2", type: "ScoreBonus",         xp: 4,  label: "Performance bonus",       earnedAt: new Date(Date.now() - 3_600_000).toISOString() },
  { id: "3", type: "QuestionSetCompleted", xp: 20, label: "Session completed",    earnedAt: new Date(Date.now() - 86_400_000).toISOString() },
  { id: "4", type: "ImprovementBonus",   xp: 8,  label: "Improvement bonus",       earnedAt: new Date(Date.now() - 86_400_000).toISOString() },
  { id: "5", type: "StreakMilestone",    xp: 50, label: "3-day streak milestone",  earnedAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
  { id: "6", type: "QuestionCompleted",  xp: 10, label: "Question completed",      earnedAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
  { id: "7", type: "ScoreBonus",         xp: 6,  label: "Performance bonus",       earnedAt: new Date(Date.now() - 3 * 86_400_000).toISOString() },
  { id: "8", type: "Achievement",        xp: 30, label: "Excellent Answer unlocked", earnedAt: new Date(Date.now() - 14 * 86_400_000).toISOString() },
];
