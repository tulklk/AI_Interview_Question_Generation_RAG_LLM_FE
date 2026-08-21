import { SAMPLE_JDS } from "@/features/studio/data/sample-jds";
import type { AnalyzeJobDescriptionResponse } from "@/features/studio/types/studio.types";

const GENERIC_ROLES = new Set(
  [
    "software engineer",
    "software developer",
    "developer",
    "engineer",
    "it engineer",
    "programmer",
  ].map((s) => s.toLowerCase())
);

function normalizeJdText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function isGenericRole(role: string | null | undefined): boolean {
  if (!role?.trim()) return true;
  return GENERIC_ROLES.has(role.trim().toLowerCase());
}

/** Match pasted/saved content against catalog samples (VI or EN body). */
export function matchSampleJdTitle(
  content: string,
  locale: "vi" | "en"
): string | null {
  const normalized = normalizeJdText(content);
  if (!normalized) return null;

  for (const sample of SAMPLE_JDS) {
    const vi = normalizeJdText(sample.content.vi);
    const en = normalizeJdText(sample.content.en);
    if (normalized === vi || normalized === en) {
      return sample.title[locale];
    }
  }
  return null;
}

/** Pull role from common opening lines in sample / pasted JDs. */
export function extractRoleFromJdOpening(content: string): string | null {
  const head = content.slice(0, 400).replace(/\s+/g, " ").trim();
  if (!head) return null;

  const vi = head.match(/tìm kiếm một\s+(.+?)\s+với/i);
  if (vi?.[1]) return cleanExtractedRole(vi[1]);

  const en = head.match(/looking for an?\s+(.+?)\s+with/i);
  if (en?.[1]) return cleanExtractedRole(en[1]);

  return null;
}

function cleanExtractedRole(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/\s*(·|,).*$/, "")
    .trim();
}

/**
 * Prefer a concrete role from SAMPLE_JDS / JD opening when BE returns a generic
 * detectedRole (e.g. "Software Engineer" for a Mobile Developer JD).
 */
export function refineJdSummary(
  content: string,
  summary: AnalyzeJobDescriptionResponse,
  locale: "vi" | "en"
): AnalyzeJobDescriptionResponse {
  const fromSample = matchSampleJdTitle(content, locale);
  const fromOpening = fromSample ? null : extractRoleFromJdOpening(content);
  const concrete = fromSample ?? fromOpening;

  if (!concrete) return summary;
  if (!isGenericRole(summary.detectedRole)) return summary;

  return {
    ...summary,
    detectedRole: concrete,
  };
}
