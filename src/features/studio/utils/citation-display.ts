import type {
  PlanProvenanceBlock,
  StudioQuestion,
  StudioQuestionCitation,
} from "@/features/studio/types/studio.types";

/** SCRUM-392: canonical JD source id from RAG */
export const JD_SOURCE_FILE = "job-description";

export type QuestionProvenanceOrigin = "HR" | "SYSTEM" | "LLM";
export type QuestionSourceRole = "why-asked" | "technical-body" | "sample-answer" | "rubric";

export function isJdCitation(sourceFile: string | null | undefined): boolean {
  if (!sourceFile) return false;
  const n = sourceFile.trim().toLowerCase();
  return n === JD_SOURCE_FILE || n === "jd" || n === "job description" || n === "job_description";
}

export function resolveCitationOrigin(
  cit: StudioQuestionCitation
): QuestionProvenanceOrigin | null {
  const raw = (cit.origin ?? "").trim().toUpperCase();
  if (raw === "HR" || raw === "SYSTEM" || raw === "LLM") return raw;
  if (isJdCitation(cit.sourceFile)) return "HR";
  const kb = (cit.knowledgeBase ?? "").trim().toLowerCase();
  if (kb === "system") return "SYSTEM";
  if (kb === "hr") return "HR";
  return null;
}

/** JD (primary) first, then Admin, then LLM/other. */
export function sortCitationsPrimaryFirst(
  citations: StudioQuestionCitation[] | null | undefined
): StudioQuestionCitation[] {
  if (!citations?.length) return [];
  const jd: StudioQuestionCitation[] = [];
  const admin: StudioQuestionCitation[] = [];
  const llm: StudioQuestionCitation[] = [];
  const other: StudioQuestionCitation[] = [];
  for (const c of citations) {
    const origin = resolveCitationOrigin(c);
    if (origin === "HR") jd.push(c);
    else if (origin === "SYSTEM") admin.push(c);
    else if (origin === "LLM") llm.push(c);
    else other.push(c);
  }
  return [...jd, ...admin, ...llm, ...other];
}

/**
 * SCRUM-392/421: UI luôn có dòng JD; legacy câu cũ không fake excerpt.
 */
export function citationsForDisplay(
  citations: StudioQuestionCitation[] | null | undefined
): StudioQuestionCitation[] {
  const sorted = sortCitationsPrimaryFirst(citations);
  if (sorted.some((c) => isJdCitation(c.sourceFile) || resolveCitationOrigin(c) === "HR"))
    return sorted;
  return [{ sourceFile: JD_SOURCE_FILE, chunkIndex: 0, excerpt: null, origin: "HR" }, ...sorted];
}

export function formatCitationExcerpt(
  excerpt: string | null | undefined,
  maxLen = 140
): string | null {
  const text = (excerpt ?? "").trim();
  if (!text) return null;
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

/** Reason LLM: chỉ giữ nguồn suy luận, bỏ chú thích kỹ thuật retrieve (data cũ). */
export function formatLlmProvenanceReason(
  reason: string | null | undefined,
  maxLen = 72
): string | null {
  const cleaned = (reason ?? "")
    .replace(/\s*[—\-–]\s*không khớp excerpt chunk retrieve\b/gi, "")
    .replace(/\s*[—\-–]\s*BE validator fallback\b/gi, "")
    .trim();
  return formatCitationExcerpt(cleaned || null, maxLen);
}

export function citationDisplayName(
  sourceFile: string,
  labels: { jobDescription: string }
): string {
  return isJdCitation(sourceFile) ? labels.jobDescription : sourceFile;
}

/** SCRUM-425: nhãn Đoạn #n từ chunkIndex (template i18n có {{n}}). */
export function formatJdChunkLabel(
  chunkIndex: number | null | undefined,
  template: string
): string | null {
  if (chunkIndex == null || !Number.isFinite(chunkIndex) || chunkIndex < 0) return null;
  return template.replace("{{n}}", String(chunkIndex));
}

/**
 * Primary line cho citation JD: "Job Description · Đoạn #n" hoặc chỉ tên file.
 */
export function formatJdCitationPrimary(
  cit: StudioQuestionCitation,
  labels: { jobDescription: string; sourceChunk: string }
): string {
  const name = citationDisplayName(cit.sourceFile, {
    jobDescription: labels.jobDescription,
  });
  if (!isJdCitation(cit.sourceFile)) return name;
  const chunkLabel = formatJdChunkLabel(cit.chunkIndex, labels.sourceChunk);
  return chunkLabel ? `${name} · ${chunkLabel}` : name;
}

export interface CitationRoleLabels {
  sourceRoleJd: string;
  sourceRoleAdmin: string;
  sourceRoleLlm: string;
  sourceWhyAsked: string;
  sourceTechnicalBody: string;
  /** Legacy fallback */
  sourcePrimary: string;
  sourceSecondary: string;
}

/** Badge vai trò SCRUM-421 — thay Chính/Phụ khi có origin. */
export function citationRoleBadge(
  cit: StudioQuestionCitation,
  labels: CitationRoleLabels
): { badge: string; hint?: string | null; tone: "jd" | "admin" | "llm" | "legacy" } {
  const origin = resolveCitationOrigin(cit);
  if (origin === "HR")
    return { badge: labels.sourceRoleJd, hint: labels.sourceWhyAsked, tone: "jd" };
  if (origin === "SYSTEM")
    return { badge: labels.sourceRoleAdmin, hint: labels.sourceTechnicalBody, tone: "admin" };
  if (origin === "LLM")
    return {
      badge: labels.sourceRoleLlm,
      hint: formatLlmProvenanceReason(cit.reason, 80) ?? cit.reason,
      tone: "llm",
    };
  const primary = isJdCitation(cit.sourceFile);
  return {
    badge: primary ? labels.sourcePrimary : labels.sourceSecondary,
    tone: "legacy",
  };
}

export function groupQuestionSources(question: StudioQuestion): {
  jd: StudioQuestionCitation[];
  admin: StudioQuestionCitation[];
  llm: StudioQuestionCitation[];
} {
  const rows = citationsForDisplay(question.citations);
  const jd: StudioQuestionCitation[] = [];
  const admin: StudioQuestionCitation[] = [];
  const llm: StudioQuestionCitation[] = [];
  for (const c of rows) {
    const origin = resolveCitationOrigin(c);
    if (origin === "HR") jd.push(c);
    else if (origin === "SYSTEM") admin.push(c);
    else if (origin === "LLM") llm.push(c);
    else if (isJdCitation(c.sourceFile)) jd.push(c);
    else if ((c.knowledgeBase ?? "").toLowerCase() === "system") admin.push(c);
    // A citation whose origin can't be resolved at all (missing/legacy data) must
    // still land somewhere — silently dropping it hid sources from the UI and
    // undercounted sourceCount. "admin" is the same generic bucket the legacy
    // citationRoleBadge() path already falls back to for non-JD citations.
    else admin.push(c);
  }
  return { jd, admin, llm };
}

export function formatQuestionSourceSummary(
  question: StudioQuestion,
  labels: CitationRoleLabels & { jobDescription: string; missingAdminWarning: string }
): string {
  if (question.missingAdminWarning) return labels.missingAdminWarning;
  const { jd, admin, llm } = groupQuestionSources(question);
  const parts: string[] = [];
  if (jd.length > 0) parts.push(labels.sourceRoleJd);
  if (admin.length > 0) {
    const name = citationDisplayName(admin[0]!.sourceFile, {
      jobDescription: labels.jobDescription,
    });
    parts.push(`${labels.sourceRoleAdmin} (${name})`);
  }
  if (llm.length > 0 || question.sourceProvenance?.items.some((i) => i.origin === "LLM"))
    parts.push(labels.sourceRoleLlm);
  return parts.join(" · ") || labels.sourceRoleJd;
}

export type { PlanProvenanceBlock };
