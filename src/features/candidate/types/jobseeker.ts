import type { LucideIcon } from "lucide-react";

// ── Navigation ─────────────────────────────────────────────────────────────
export interface JobseekerNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeVariant?: "new" | "count";
}

// ── Question Set ───────────────────────────────────────────────────────────
export type Difficulty = "Easy" | "Medium" | "Hard";
// The real API's questionType is an open-ended string (technical, behavioral,
// situational, problem-solving, system-design, ...) — not a fixed 3-value enum.
export type QuestionCategory = string;

export interface PracticeQuestion {
  id: string;
  text: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  skill?: string;
  timeLimit?: number; // seconds
}

export interface QuestionSet {
  id: string;
  title: string;
  company: string;
  companyLogoUrl?: string | null;
  companyInitials: string;
  companyColor: string;
  difficulty: Difficulty;
  skills: string[];
  totalQuestions: number;
  estimatedTime: string;
  category?: string;
  description?: string;
  rating?: number;
  attempts?: number;
  questions: PracticeQuestion[];
}

// ── Practice Session ───────────────────────────────────────────────────────
export interface AnswerRecord {
  questionId: string;
  questionText: string;
  category: QuestionCategory;
  difficulty: Difficulty;
  answer: string;
  // AI evaluation isn't in the current BE contract (only an overall session score
  // exists, and it's still null until BE finishes wiring the scoring worker) —
  // keep these optional and render them only when actually present.
  aiScore?: number;
  strengths?: string[];
  improvements?: string[];
  suggestion?: string;
}

export interface PracticeSession {
  id: string;
  setId: string;
  setTitle: string;
  company: string;
  companyInitials: string;
  companyColor: string;
  date: string;
  score: number;
  duration: string;
  skills: string[];
  totalQuestions: number;
  answers: AnswerRecord[];
}

// ── Candidate ──────────────────────────────────────────────────────────────
export interface SkillStat {
  skill: string;
  score: number;
  fullMark: number;
}

export interface CandidateStat {
  id: string;
  label: string;
  value: string;
  trend?: string;
  trendPositive?: boolean;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}
