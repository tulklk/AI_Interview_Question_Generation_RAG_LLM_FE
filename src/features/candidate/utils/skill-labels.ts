import { formatCategoryLabel } from "@/features/candidate/components/ui/pill";
import type { Lang } from "@/shared/providers/language-context";

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, "");
}

// BE's dimensionScores keys aren't a documented fixed enum — this covers the
// dimensions actually observed in AI evaluations. Unknown keys fall back to
// formatCategoryLabel (title-cased raw key) rather than guessing a translation.
const VI_LABELS: Record<string, string> = {
  clarity: "Độ rõ ràng",
  depth: "Chiều sâu",
  relevance: "Mức độ liên quan",
  structure: "Cấu trúc",
  technicalaccuracy: "Độ chính xác kỹ thuật",
  communication: "Giao tiếp",
  evidenceandexamples: "Bằng chứng và ví dụ",
  evidence: "Bằng chứng và ví dụ",
  problemsolving: "Giải quyết vấn đề",
  confidence: "Sự tự tin",
  timemanagement: "Quản lý thời gian",
  correctness: "Độ chính xác",
  completeness: "Độ đầy đủ",
};

/** Translates a raw AI dimension-score key ("technical_accuracy") into a display label for the current locale. */
export function translateDimensionKey(key: string, lang: Lang): string {
  if (lang === "vi") {
    const label = VI_LABELS[normalizeKey(key)];
    if (label) return label;
  }
  return formatCategoryLabel(key);
}

// questionType is an open-ended BE string (technical, behavioral, situational,
// problem-solving, system-design, ...) — this covers the values actually seen.
const VI_CATEGORY_LABELS: Record<string, string> = {
  technical: "Kỹ thuật",
  behavioral: "Hành vi",
  situational: "Tình huống",
  problemsolving: "Giải quyết vấn đề",
  systemdesign: "Thiết kế hệ thống",
  coding: "Lập trình",
};

/** Translates a raw question-type/category string into a display label for the current locale. */
export function translateQuestionCategory(category: string, lang: Lang): string {
  if (lang === "vi") {
    const label = VI_CATEGORY_LABELS[normalizeKey(category)];
    if (label) return label;
  }
  return formatCategoryLabel(category);
}
