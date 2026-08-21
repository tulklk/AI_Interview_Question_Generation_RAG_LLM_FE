import type { PracticeQuestion } from "@/features/candidate/types/jobseeker";

export interface QuestionGroup {
  /** Normalized lowercase key, e.g. "technical", "behavioral", "other" */
  key: string;
  count: number;
  /** Integer 0–100, calculated as Math.round(count / total * 100) */
  percentage: number;
}

/**
 * Groups practice questions by their `category` field (which equals `questionType`
 * from the API) for display in the Interview Plan section.
 *
 * Rules:
 * - Locked questions ARE counted — their presence reveals distribution, not content.
 * - Category keys are normalized to lowercase-trimmed.
 * - Empty/null categories fall back to "other".
 * - Groups are sorted by count descending (highest coverage first).
 * - Returns [] for empty input.
 * - Does NOT mutate the input array.
 */
export function groupQuestionsForInterviewPlan(
  questions: PracticeQuestion[]
): QuestionGroup[] {
  if (questions.length === 0) return [];

  const counts = new Map<string, number>();
  for (const q of questions) {
    const raw = q.category ?? "";
    const key = raw.toLowerCase().trim() || "other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = questions.length;
  return Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
