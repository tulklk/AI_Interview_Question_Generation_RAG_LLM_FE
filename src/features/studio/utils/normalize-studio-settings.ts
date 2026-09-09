import { DEFAULT_ENABLED_CODE_TEMPLATES } from "@/features/studio/constants/question-templates";
import type { StudioCodeTemplateId, StudioContentMode } from "@/features/studio/constants/question-templates";
import type { StudioFocusAreaItem, StudioSettings } from "@/features/studio/types/studio.types";
import { normalizeFocusWeight, syncDistributionCounts } from "@/features/studio/utils/distribution-math";

/** Chuẩn hóa độ khó settings/plan — tránh so sánh lệch easy vs Easy, hoặc enum số 0/1/2. */
export function normalizeStudioDifficulty(raw: unknown): "Easy" | "Medium" | "Hard" {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "0" || s === "easy") return "Easy";
  if (s === "2" || s === "hard") return "Hard";
  return "Medium";
}

function normalizeFocusAreas(areas: StudioFocusAreaItem[] | undefined): StudioFocusAreaItem[] {
  return (areas ?? []).map((fa, idx) => ({
    ...fa,
    weight: normalizeFocusWeight(fa.weight),
    orderIndex: fa.orderIndex ?? idx,
  }));
}

export function normalizeStudioSettings(s: StudioSettings | null): StudioSettings | null {
  if (!s) return null;
  const minutes = Number(s.interviewLengthMinutes);
  const questions = Number(s.numberOfQuestions);
  const rawLang =
    (s as StudioSettings & { language?: string }).language
    ?? s.outputLanguage
    ?? "Vietnamese";
  const outputLanguage =
    /en(glish)?/i.test(String(rawLang)) && !/viet/i.test(String(rawLang))
      ? "English"
      : "Vietnamese";
  const contentMode = (s.contentMode ?? "Mixed") as StudioContentMode;
  const enabledCodeTemplates = (
    Array.isArray(s.enabledCodeTemplates) && s.enabledCodeTemplates.length > 0
      ? s.enabledCodeTemplates
      : DEFAULT_ENABLED_CODE_TEMPLATES
  ).filter((t) => t !== "SYSTEM_DESIGN") as StudioCodeTemplateId[];

  return {
    ...s,
    interviewLengthMinutes: Number.isFinite(minutes) && minutes >= 15 && minutes <= 180 ? minutes : 60,
    numberOfQuestions: Number.isFinite(questions)
      ? Math.min(50, Math.max(5, questions))
      : 15,
    difficulty: normalizeStudioDifficulty(s.difficulty),
    questionTone: "Professional",
    includeSampleAnswers: s.includeSampleAnswers ?? true,
    includeScoringRubric: s.includeScoringRubric ?? true,
    outputFormat: "StructuredInterviewKit",
    outputLanguage,
    questionTypes:
      Array.isArray(s.questionTypes) && s.questionTypes.length > 0
        ? s.questionTypes
        : ["technical", "system_design", "problem_solving", "behavioral"],
    contentMode,
    enabledCodeTemplates,
    focusAreas: normalizeFocusAreas(s.focusAreas),
    questionDistribution: Array.isArray(s.questionDistribution)
      ? syncDistributionCounts(s.questionDistribution, Number.isFinite(questions) ? Math.min(50, Math.max(5, questions)) : 15)
      : [],
    questionStyles: Array.isArray(s.questionStyles) ? s.questionStyles : [],
    recommendedConfiguration: s.recommendedConfiguration
      ? {
          ...s.recommendedConfiguration,
          focusAreas: normalizeFocusAreas(s.recommendedConfiguration.focusAreas),
        }
      : null,
    recommendedGeneratedAt: s.recommendedGeneratedAt ?? null,
  };
}
