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

function lookupLabel(map: Record<string, string>, raw: string): string | undefined {
  if (map[raw]) return map[raw];
  const compact = raw.toLowerCase().replace(/[\s_-]/g, "");
  for (const [key, label] of Object.entries(map)) {
    if (key.toLowerCase() === compact) return label;
  }
  return undefined;
}

export function formatStudioQuestionTypeLabel(
  type: string | null | undefined,
  lang: "en" | "vi" = "en"
): string {
  const key = (type || "").trim();
  if (!key) return "";
  const map = lang === "vi" ? VI_LABELS : EN_LABELS;
  return lookupLabel(map, key) ?? spacePascalCase(key);
}

const DIFFICULTY_EN: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const DIFFICULTY_VI: Record<string, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};

export function formatStudioDifficultyLabel(
  difficulty: string | null | undefined,
  lang: "en" | "vi" = "en"
): string {
  const key = (difficulty || "").trim().toLowerCase();
  if (!key) return "";
  const map = lang === "vi" ? DIFFICULTY_VI : DIFFICULTY_EN;
  return map[key] ?? (difficulty || "").trim();
}
