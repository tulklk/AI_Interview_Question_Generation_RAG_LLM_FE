import { apiClient } from "@/core/api/http-client";

export type RecommendationStatus = "NEW" | "VIEWED" | "SHORTLISTED" | "INVITED" | "DISMISSED";

export interface CandidateRecommendation {
  id: string;
  candidateName: string;
  candidateEmail: string;
  targetRole: string;
  techStack: string[];
  score: number;
  questionSetId: string;
  questionSetTitle: string;
  completedAt: string | null;
  status: RecommendationStatus;
  recommendationReason?: string | null;
}

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickNum(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

function pickStrArr(obj: Record<string, unknown>, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function normalizeStatus(raw: string): RecommendationStatus {
  const u = raw.toUpperCase() as RecommendationStatus;
  return (["NEW", "VIEWED", "SHORTLISTED", "INVITED", "DISMISSED"] as RecommendationStatus[]).includes(u)
    ? u
    : "NEW";
}

function normalizeRec(raw: unknown): CandidateRecommendation | null {
  const src = asRecord(raw);
  if (!src) return null;
  const id = pickStr(src, "id", "recommendationId");
  if (!id) return null;
  return {
    id,
    candidateName: pickStr(src, "candidateName", "fullName", "name"),
    candidateEmail: pickStr(src, "candidateEmail", "email"),
    targetRole: pickStr(src, "targetRole", "role"),
    techStack: pickStrArr(src, "techStack", "skills", "techstack"),
    score: pickNum(src, "score", "overallScore"),
    questionSetId: pickStr(src, "questionSetId"),
    questionSetTitle: pickStr(src, "questionSetTitle", "setTitle", "title"),
    completedAt: typeof src.completedAt === "string" ? src.completedAt : null,
    status: normalizeStatus(pickStr(src, "status") || "NEW"),
    recommendationReason:
      typeof src.recommendationReason === "string"
        ? src.recommendationReason
        : typeof src.reason === "string"
          ? src.reason
          : null,
  };
}

function extractList(res: unknown): unknown[] {
  const r = asRecord(res);
  if (!r) return [];
  const data = asRecord(r.data) ?? r;
  if (Array.isArray(data)) return data;
  const items = data.items ?? data.data ?? data.recommendations;
  return Array.isArray(items) ? items : [];
}

function extractTotal(res: unknown, fallback: number): number {
  const r = asRecord(res);
  if (!r) return fallback;
  const data = asRecord(r.data) ?? r;
  const v = data.totalCount ?? data.total ?? data.count;
  return typeof v === "number" ? v : fallback;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ListRecommendationsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  questionSetId?: string;
  minScore?: number;
}

export async function listRecommendations(
  params: ListRecommendationsParams = {}
): Promise<{ items: CandidateRecommendation[]; totalCount: number }> {
  const res = await apiClient.get("/api/hr/recommendations", {
    params: {
      Page: params.page ?? 1,
      PageSize: params.pageSize ?? 12,
      Status: params.status || undefined,
      QuestionSetId: params.questionSetId || undefined,
      MinScore: params.minScore ?? undefined,
    },
  });
  const items = extractList(res.data)
    .map(normalizeRec)
    .filter((r): r is CandidateRecommendation => r !== null);
  return { items, totalCount: extractTotal(res.data, items.length) };
}

export async function getRecommendation(id: string): Promise<CandidateRecommendation | null> {
  try {
    const res = await apiClient.get(`/api/hr/recommendations/${id}`);
    return normalizeRec(asRecord(res.data)?.data ?? res.data);
  } catch {
    // No single-item endpoint — fall back to searching the list
    const { items } = await listRecommendations({ pageSize: 100 });
    return items.find((r) => r.id === id) ?? null;
  }
}

export async function shortlistRecommendation(id: string): Promise<void> {
  await apiClient.post(`/api/hr/recommendations/${id}/shortlist`);
}

export async function dismissRecommendation(id: string): Promise<void> {
  await apiClient.post(`/api/hr/recommendations/${id}/dismiss`);
}

export async function inviteRecommendation(id: string, message?: string): Promise<void> {
  await apiClient.post(`/api/hr/recommendations/${id}/invite`, {
    message: message?.trim() || null,
  });
}
