// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  XpRewardType,
  UserProgress,
  XpReward,
  XpRewardBreakdown,
  DailyActivity,
  AchievementCategory,
  GamificationAchievement,
  DailyGoalPreset,
  XpHistoryEntry,
} from "@/features/gamification/types/gamification.types";

// ── API ───────────────────────────────────────────────────────────────────────
export {
  getMyProgress,
  getDailyActivity,
  getAchievements,
  updateDailyGoal,
  getXpHistory,
} from "@/features/gamification/api/gamification-api";

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useUserProgress } from "@/features/gamification/hooks/use-user-progress";
export { useAchievements } from "@/features/gamification/hooks/use-achievements";
export { useDailyActivity } from "@/features/gamification/hooks/use-daily-activity";

// ── Utils ─────────────────────────────────────────────────────────────────────
export {
  formatXp,
  getLevelLabel,
  getLevelColorClass,
  getLevelBarColor,
  streakIntensity,
  xpRewardTypeLabel,
  timeAgo,
  LEVEL_XP_TABLE,
  DAILY_GOAL_PRESETS,
} from "@/features/gamification/utils/gamification-formatters";

export {
  playXpGainSound,
  playLevelUpSound,
  playGoalSound,
} from "@/features/gamification/utils/xp-sound";

// ── Components ────────────────────────────────────────────────────────────────
export { XpProgressBar } from "@/features/gamification/components/xp-progress-bar";
export { GamificationProgressCard } from "@/features/gamification/components/gamification-progress-card";
export { AchievementCard } from "@/features/gamification/components/achievement-card";
export { AchievementGrid } from "@/features/gamification/components/achievement-grid";
export { SessionXpSummary } from "@/features/gamification/components/session-xp-summary";
export { DailyGoalSettings } from "@/features/gamification/components/daily-goal-settings";
export { XpGainNotification } from "@/features/gamification/components/xp-gain-notification";
export { XpGuidePanel } from "@/features/gamification/components/xp-guide-panel";
