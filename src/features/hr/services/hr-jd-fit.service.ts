import { apiClient } from "@/core/api/http-client";
import { extractErrorMessage } from "@/core/interceptors/error.interceptor";

export type JdFitVerdict = "unfit" | "fair" | "good" | "excellent";
export type JdFitFlag = "onJd" | "weak" | "offJd" | "duplicate";
export type JdFitActionType = "add" | "rewrite" | "remove";

export interface JdFitSource {
  chunkIndex: number;
  excerpt: string;
}

export interface JdFitQuestionFlag {
  questionId: string | null;
  order: number | null;
  flag: JdFitFlag;
  noteVi: string | null;
  noteEn: string | null;
  sources: JdFitSource[];
}

export interface JdFitSuggestedAction {
  type: JdFitActionType;
  questionId: string | null;
  reasonVi: string | null;
  reasonEn: string | null;
}

export interface JdFitReview {
  verdict: JdFitVerdict;
  summaryVi: string;
  summaryEn: string;
  questionFlags: JdFitQuestionFlag[];
  missingTopics: string[];
  suggestedActions: JdFitSuggestedAction[];
  jdSources: JdFitSource[];
}

export interface JdFitReviewEnvelope {
  review: JdFitReview | null;
  reviewedAt: string | null;
  contentHash: string | null;
  isStale: boolean;
  hasJobDescription: boolean;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function unwrapData(data: unknown): Record<string, unknown> {
  const root = asRecord(data);
  return root.data ? asRecord(root.data) : root;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const VERDICTS = new Set<JdFitVerdict>(["unfit", "fair", "good", "excellent"]);
const FLAGS = new Set<JdFitFlag>(["onJd", "weak", "offJd", "duplicate"]);
const ACTIONS = new Set<JdFitActionType>(["add", "rewrite", "remove"]);

function parseSources(raw: unknown): JdFitSource[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const out: JdFitSource[] = [];
  for (const item of raw) {
    const r = asRecord(item);
    const idx = typeof r.chunkIndex === "number" ? r.chunkIndex : Number(r.chunkIndex);
    const excerpt = str(r.excerpt);
    if (!Number.isInteger(idx) || idx < 0 || !excerpt || seen.has(idx)) continue;
    seen.add(idx);
    out.push({ chunkIndex: idx, excerpt });
  }
  return out;
}

function normalizeReview(raw: unknown): JdFitReview | null {
  const d = asRecord(raw);
  const verdictRaw = (str(d.verdict) ?? "").toLowerCase();
  const verdict = VERDICTS.has(verdictRaw as JdFitVerdict) ? (verdictRaw as JdFitVerdict) : null;
  const summaryVi = str(d.summaryVi);
  const summaryEn = str(d.summaryEn);
  if (!verdict || !summaryVi || !summaryEn) return null;

  const flagsRaw = Array.isArray(d.questionFlags) ? d.questionFlags : [];
  const actionsRaw = Array.isArray(d.suggestedActions) ? d.suggestedActions : [];
  const topicsRaw = Array.isArray(d.missingTopics) ? d.missingTopics : [];

  return {
    verdict,
    summaryVi,
    summaryEn,
    jdSources: parseSources(d.jdSources),
    missingTopics: topicsRaw.map((t) => str(t)).filter((t): t is string => !!t),
    questionFlags: flagsRaw.map((item) => {
      const r = asRecord(item);
      const flag = str(r.flag) as JdFitFlag | null;
      return {
        questionId: str(r.questionId),
        order: typeof r.order === "number" ? r.order : null,
        flag: flag && FLAGS.has(flag) ? flag : "onJd",
        noteVi: str(r.noteVi),
        noteEn: str(r.noteEn),
        sources: parseSources(r.sources),
      };
    }).filter((f) => FLAGS.has(f.flag)),
    suggestedActions: actionsRaw.map((item) => {
      const r = asRecord(item);
      const type = (str(r.type) ?? "").toLowerCase() as JdFitActionType;
      return {
        type: ACTIONS.has(type) ? type : null,
        questionId: str(r.questionId),
        reasonVi: str(r.reasonVi),
        reasonEn: str(r.reasonEn),
      };
    }).filter((a): a is JdFitSuggestedAction => a.type !== null),
  };
}

function normalizeEnvelope(raw: unknown): JdFitReviewEnvelope {
  const d = unwrapData(raw);
  const nested = d.review && typeof d.review === "object" ? d.review : null;
  const review = nested ? normalizeReview(nested) : normalizeReview(d);
  return {
    review,
    reviewedAt: str(d.reviewedAt),
    contentHash: str(d.contentHash),
    isStale: d.isStale === true,
    hasJobDescription: d.hasJobDescription !== false,
  };
}

export async function getQuestionSetJdFit(questionSetId: string): Promise<JdFitReviewEnvelope> {
  try {
    const { data } = await apiClient.get(`/api/hr/question-sets/${questionSetId}/jd-fit-review`);
    return normalizeEnvelope(data);
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function uploadQuestionSetJdFile(questionSetId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  try {
    await apiClient.post(`/api/hr/question-sets/${questionSetId}/job-description`, form, {
      timeout: 120_000,
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function saveQuestionSetJdText(questionSetId: string, jobDescription: string): Promise<void> {
  try {
    await apiClient.put(`/api/hr/question-sets/${questionSetId}/job-description`, { jobDescription });
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function reviewQuestionSetJdFit(questionSetId: string): Promise<JdFitReviewEnvelope> {
  try {
    const { data } = await apiClient.post(
      `/api/hr/question-sets/${questionSetId}/jd-fit-review`,
      {},
      { timeout: 120_000 }
    );
    const parsed = normalizeEnvelope(data);
    if (!parsed.review) throw new Error("Invalid JD fit review payload.");
    return parsed;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}
