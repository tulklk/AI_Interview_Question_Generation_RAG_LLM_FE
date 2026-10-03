type CoachReadinessLabels = {
  STRONG: string;
  MODERATE: string;
  WEAK: string;
  DEVELOPING: string;
  READY: string;
  NOT_READY: string;
};

type CoachLevelLabels = {
  Fresher: string;
  Junior: string;
  Middle: string;
  "Mid-level": string;
  Senior: string;
};

const READINESS_KEYS = new Set<string>([
  "STRONG",
  "MODERATE",
  "WEAK",
  "DEVELOPING",
  "READY",
  "NOT_READY",
]);

const LEVEL_ALIASES: Record<string, keyof CoachLevelLabels> = {
  fresher: "Fresher",
  junior: "Junior",
  middle: "Middle",
  "mid-level": "Mid-level",
  midlevel: "Mid-level",
  senior: "Senior",
};

/** Map API readiness codes to the active UI language. Unknown text stays as returned. */
export function localizeCoachReadiness(
  raw: string | null | undefined,
  labels: CoachReadinessLabels,
): string {
  const text = raw?.trim() ?? "";
  if (!text) return "";
  const key = text.toUpperCase().replace(/[\s-]+/g, "_");
  if (!READINESS_KEYS.has(key)) return text;
  return labels[key as keyof CoachReadinessLabels];
}

/** Map coach seniority names to the active UI language. Unknown text stays as returned. */
export function localizeCoachLevel(
  raw: string | null | undefined,
  labels: CoachLevelLabels,
): string {
  const text = raw?.trim() ?? "";
  if (!text) return "";
  const compact = text.toLowerCase().replace(/[\s_]+/g, "-");
  const key = LEVEL_ALIASES[compact];
  return key ? labels[key] : text;
}
