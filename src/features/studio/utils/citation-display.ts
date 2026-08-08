import type { StudioQuestionCitation } from "@/features/studio/types/studio.types";

/** SCRUM-392: canonical JD source id from RAG */
export const JD_SOURCE_FILE = "job-description";

export function isJdCitation(sourceFile: string | null | undefined): boolean {
  if (!sourceFile) return false;
  const n = sourceFile.trim().toLowerCase();
  return n === JD_SOURCE_FILE || n === "jd" || n === "job description" || n === "job_description";
}

/** JD (primary) first, then KB sources. */
export function sortCitationsPrimaryFirst(
  citations: StudioQuestionCitation[] | null | undefined
): StudioQuestionCitation[] {
  if (!citations?.length) return [];
  const jd: StudioQuestionCitation[] = [];
  const other: StudioQuestionCitation[] = [];
  for (const c of citations) {
    if (isJdCitation(c.sourceFile)) jd.push(c);
    else other.push(c);
  }
  return [...jd, ...other];
}

/**
 * SCRUM-392: UI luôn có dòng CHÍNH = JD.
 * SCRUM-394: không inject excerpt:null — thiếu excerpt thì để trống,
 * RAG post-process phải đảm bảo excerpt khi generate mới.
 */
export function citationsForDisplay(
  citations: StudioQuestionCitation[] | null | undefined
): StudioQuestionCitation[] {
  const sorted = sortCitationsPrimaryFirst(citations);
  if (sorted.some((c) => isJdCitation(c.sourceFile))) return sorted;
  // Câu cũ chưa có JD: vẫn hiện nhãn Chính, excerpt để trống (không fake quote)
  return [{ sourceFile: JD_SOURCE_FILE, chunkIndex: 0, excerpt: null }, ...sorted];
}

/** Format excerpt giống nguồn Phụ — dùng chung cho Chính/Phụ. */
export function formatCitationExcerpt(
  excerpt: string | null | undefined,
  maxLen = 140
): string | null {
  const text = (excerpt ?? "").trim();
  if (!text) return null;
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

export function citationDisplayName(
  sourceFile: string,
  labels: { jobDescription: string }
): string {
  return isJdCitation(sourceFile) ? labels.jobDescription : sourceFile;
}
