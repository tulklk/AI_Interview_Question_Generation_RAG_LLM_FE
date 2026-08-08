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
  /** Free plan: BE che nội dung (~80% câu) — FE hiện soft paywall */
  isLocked?: boolean;
  /** SCRUM-399: loại code template (BUG_DETECTION, CODE_COMPLETION, …) */
  codeTemplateType?: string | null;
  /** SCRUM-399: starter code đề bài — không phải sample answer */
  codeSnippet?: string | null;
  /** SCRUM-399: SAS URL ảnh đính kèm HR */
  attachedImageUrl?: string | null;
  /** SCRUM-400: Text | Code — phương thức trả lời */
  answerMethod?: "Text" | "Code" | null;
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
  estimatedTimeMinutes?: number;
  /** HR-configured practice time limit (1–480 min), null/undefined = no limit. Distinct from estimatedTimeMinutes, which is just a display estimate. */
  timeLimitMinutes?: number | null;
  category?: string;
  description?: string;
  rating?: number;
  attempts?: number;
  /** SCRUM-404: Admin pinned this set. */
  isPinned?: boolean;
  /** SCRUM-404: AttemptCount meets trending threshold. */
  isTrending?: boolean;
  questions: PracticeQuestion[];
}

// ── Candidate ──────────────────────────────────────────────────────────────
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}
