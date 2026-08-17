import { apiClient } from "@/core/api/http-client";

export interface HrTalentItem {
  sessionId: string;
  candidateUserId: string;
  candidateName: string;
  candidateEmail: string;
  targetRole: string | null;
  seniorityLevel: string | null;
  questionSetId: string;
  questionSetTitle: string;
  sessionStatus: string;
  overallScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
  recommendationId: string | null;
  recommendationStatus: string | null;
  invitationStatus: string | null;
}

export interface ListHrTalentParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  questionSetId?: string;
  status?: string;
  minScore?: number | null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickNullableStr(obj: Record<string, unknown>, ...keys: string[]): string | null {
  const s = pickStr(obj, ...keys);
  return s || null;
}

function pickNullableNum(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function extractList(res: unknown): unknown[] {
  const r = asRecord(res);
  if (!r) return [];
  const data = asRecord(r.data) ?? r;
  if (Array.isArray(data)) return data;
  const items = data.items ?? data.Items;
  return Array.isArray(items) ? items : [];
}

function extractTotal(res: unknown, fallback: number): number {
  const r = asRecord(res);
  if (!r) return fallback;
  const data = asRecord(r.data) ?? r;
  const v = data.totalCount ?? data.TotalCount ?? data.total ?? data.count;
  return typeof v === "number" ? v : fallback;
}

function normalizeItem(raw: unknown): HrTalentItem | null {
  const src = asRecord(raw);
  if (!src) return null;
  const sessionId = pickStr(src, "sessionId", "SessionId");
  const candidateUserId = pickStr(src, "candidateUserId", "CandidateUserId");
  const questionSetId = pickStr(src, "questionSetId", "QuestionSetId");
  if (!sessionId || !candidateUserId || !questionSetId) return null;
  return {
    sessionId,
    candidateUserId,
    candidateName: pickStr(src, "candidateName", "CandidateName"),
    candidateEmail: pickStr(src, "candidateEmail", "CandidateEmail"),
    targetRole: pickNullableStr(src, "targetRole", "TargetRole"),
    seniorityLevel: pickNullableStr(src, "seniorityLevel", "SeniorityLevel"),
    questionSetId,
    questionSetTitle: pickStr(src, "questionSetTitle", "QuestionSetTitle"),
    sessionStatus: pickStr(src, "sessionStatus", "SessionStatus") || "IN_PROGRESS",
    overallScore: pickNullableNum(src, "overallScore", "OverallScore"),
    startedAt: pickNullableStr(src, "startedAt", "StartedAt"),
    completedAt: pickNullableStr(src, "completedAt", "CompletedAt"),
    recommendationId: pickNullableStr(src, "recommendationId", "RecommendationId"),
    recommendationStatus: pickNullableStr(src, "recommendationStatus", "RecommendationStatus"),
    invitationStatus: pickNullableStr(src, "invitationStatus", "InvitationStatus"),
  };
}

export async function listHrTalent(
  params: ListHrTalentParams = {}
): Promise<{ items: HrTalentItem[]; totalCount: number }> {
  const res = await apiClient.get("/api/hr/talent", {
    params: {
      Page: params.page ?? 1,
      PageSize: params.pageSize ?? 20,
      Keyword: params.keyword || undefined,
      QuestionSetId: params.questionSetId || undefined,
      Status: params.status || undefined,
      MinScore: params.minScore ?? undefined,
    },
  });
  const items = extractList(res.data)
    .map(normalizeItem)
    .filter((x): x is HrTalentItem => x !== null);
  return { items, totalCount: extractTotal(res.data, items.length) };
}

export async function invitePractitioner(
  questionSetId: string,
  candidateUserId: string,
  message?: string
): Promise<void> {
  await apiClient.post(
    `/api/hr/question-sets/${questionSetId}/practitioners/${candidateUserId}/invite`,
    { message: message?.trim() || null }
  );
}
