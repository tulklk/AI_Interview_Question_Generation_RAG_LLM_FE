import type {
  QuestionDistributionItem,
  RecommendedConfiguration,
  StudioFocusAreaItem,
  StudioQuestionDifficulty,
  StudioSettings,
} from "@/features/studio/types/studio.types";
import type { StudioCodeTemplateId } from "@/features/studio/constants/question-templates";
import { normalizeFocusWeight, syncDistributionCounts } from "@/features/studio/utils/distribution-math";

const CATEGORY_LABELS_VI: Record<string, string> = {
  technical: "Kỹ thuật",
  behavioral: "Hành vi",
  situational: "Tình huống",
};

const CATEGORY_LABELS_EN: Record<string, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  situational: "Situational",
};

const STYLE_LABELS: Record<string, string> = {
  system_design: "System Design",
  problem_solving: "Problem Solving",
  debugging: "Debugging",
  performance_analysis: "Performance Analysis",
  coding: "Coding",
  code_review: "Code Review",
  theory: "Theory",
};

export function categoryLabel(category: string, locale: "vi" | "en"): string {
  const map = locale === "vi" ? CATEGORY_LABELS_VI : CATEGORY_LABELS_EN;
  return map[category.toLowerCase()] ?? category;
}

export function styleLabel(style: string): string {
  const key = style.toLowerCase().replace(/-/g, "_");
  return STYLE_LABELS[key] ?? style.replace(/_/g, " ");
}

export function mapRecommendDifficulty(value: string | undefined | null): StudioQuestionDifficulty {
  const key = (value ?? "medium").toLowerCase();
  if (key === "easy") return "Easy";
  if (key === "hard") return "Hard";
  return "Medium";
}

/** Legacy questionTypes for backward compat chips + apply-plan. */
export function deriveLegacyQuestionTypes(
  distribution: QuestionDistributionItem[],
  styles: string[] = []
): string[] {
  const types = new Set<string>();
  for (const item of distribution) {
    const cat = item.category?.toLowerCase();
    if (cat === "technical" || cat === "behavioral" || cat === "situational") {
      types.add(cat);
    }
  }
  for (const s of styles) {
    const key = s.toLowerCase().replace(/-/g, "_");
    if (key === "system_design" || key === "problem_solving") types.add(key);
  }
  if (types.size === 0) return ["technical", "behavioral"];
  return Array.from(types);
}

export function mapCodingTaskTypes(raw: string[] | undefined): StudioCodeTemplateId[] {
  const allowed = new Set([
    "BUG_DETECTION",
    "CODE_COMPLETION",
    "REFACTORING",
    "TEST_CASE_DESIGN",
    "PERFORMANCE_ANALYSIS",
  ]);
  return (raw ?? [])
    .map((x) => x.trim().toUpperCase().replace(/ /g, "_"))
    .filter((x) => allowed.has(x) && x !== "SYSTEM_DESIGN") as StudioCodeTemplateId[];
}

function normalizeFocusAreasForApply(areas: StudioFocusAreaItem[] | undefined): StudioFocusAreaItem[] {
  return (areas ?? []).map((fa, idx) => ({
    ...fa,
    weight: normalizeFocusWeight(fa.weight),
    orderIndex: fa.orderIndex ?? idx,
  }));
}

export function buildApplyRecommendationPatch(
  rec: RecommendedConfiguration
): Partial<StudioSettings> {
  const questionStyles = rec.questionStyles ?? [];
  const total = Math.min(50, Math.max(5, rec.numberOfQuestions || 15));
  const rawDist = rec.questionDistribution ?? [];
  // Đồng bộ count với số câu AI đề xuất (tránh lệch %/count từ RAG)
  const questionDistribution =
    rawDist.length > 0 ? syncDistributionCounts(rawDist, total) : rawDist;
  const focusAreas = normalizeFocusAreasForApply(rec.focusAreas);
  return {
    numberOfQuestions: total,
    difficulty: mapRecommendDifficulty(rec.difficulty),
    questionDistribution,
    focusAreas,
    questionStyles,
    questionTypes: deriveLegacyQuestionTypes(questionDistribution, questionStyles),
    enabledCodeTemplates: rec.codingTasksRecommended
      ? mapCodingTaskTypes(rec.codingTaskTypes)
      : undefined,
  };
}
