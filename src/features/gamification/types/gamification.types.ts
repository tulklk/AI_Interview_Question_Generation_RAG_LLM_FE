// ── Gamification domain types ────────────────────────────────────────────────
// XP / Level  = practice consistency & engagement
// Score       = answer quality
// These are SEPARATE concepts — never conflate them in UI.

export type XpRewardType =
  | "QuestionCompleted"
  | "ScoreBonus"
  | "QuestionSetCompleted"
  | "ImprovementBonus"
  | "StreakMilestone"
  | "Achievement";

export interface UserProgress {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  xpRequiredForNextLevel: number;
  /** 0–100, authoritative from backend */
  progressPercentage: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoalXp: number;
  todayXp: number;
  dailyGoalCompleted: boolean;
  totalPracticeSessions: number;
  nextLevel?: number;
}

export interface XpRewardBreakdown {
  type: XpRewardType;
  xp: number;
  label: string;
}

export interface XpReward {
  totalEarned: number;
  rewards: XpRewardBreakdown[];
  previousLevel: number;
  currentLevel: number;
  previousTotalXp: number;
  currentTotalXp: number;
  levelUp: boolean;
  progress?: UserProgress;
}

export interface DailyActivity {
  /** ISO date "YYYY-MM-DD" */
  date: string;
  xp: number;
  questionsCompleted: number;
  sessionsCompleted: number;
  active: boolean;
}

export type AchievementCategory =
  | "streak"
  | "practice"
  | "performance"
  | "consistency";

export interface GamificationAchievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon?: string;
  unlocked: boolean;
  unlockedAt?: string;
  currentValue?: number;
  targetValue?: number;
  xpReward?: number;
  category?: AchievementCategory;
}

export type DailyGoalPreset = 20 | 50 | 80 | 120;

export interface XpHistoryEntry {
  id: string;
  type: XpRewardType;
  xp: number;
  label: string;
  earnedAt: string;
}
