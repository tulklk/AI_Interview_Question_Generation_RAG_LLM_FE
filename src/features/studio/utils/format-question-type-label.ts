/** Display labels for StudioQuestionType enums (keep enum values unchanged). */
const EN_LABELS: Record<string, string> = {
  Technical: "Technical",
  SystemDesign: "System Design",
  ProblemSolving: "Problem Solving",
  Behavioral: "Behavioral",
  Situational: "Situational",
};

const VI_LABELS: Record<string, string> = {
  Technical: "Kỹ thuật",
  SystemDesign: "Hệ thống",
  ProblemSolving: "Giải quyết vấn đề",
  Behavioral: "Hành vi",
  Situational: "Tình huống",
};

/** Fallback: insert spaces before capitals (SystemDesign → System Design). */
function spacePascalCase(raw: string): string {
  return raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

export function formatStudioQuestionTypeLabel(
  type: string | null | undefined,
  lang: "en" | "vi" = "en"
): string {
  const key = (type || "").trim();
  if (!key) return "";
  const map = lang === "vi" ? VI_LABELS : EN_LABELS;
  return map[key] ?? spacePascalCase(key);
}
