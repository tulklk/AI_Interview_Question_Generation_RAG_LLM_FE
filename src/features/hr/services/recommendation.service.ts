import { apiClient } from "@/core/api/http-client";

export type RecommendationStatus = "NEW" | "VIEWED" | "SHORTLISTED" | "INVITED" | "DISMISSED";

/** List item — payload nhẹ (SCRUM-328). */
export interface CandidateRecommendation {
  id: string;
  candidateUserId: string;
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
  /** Only set once the candidate has ACCEPTED the invite — sent by the candidate themself, not their profile phone. */
  invitationResponseMessage: string | null;
  invitationSharedPhoneNumber: string | null;
}

/** Detail — kèm profile/CV/stats (SCRUM-377). */
export interface CandidateRecommendationDetail extends CandidateRecommendation {
  avatarUrl: string | null;
  bio: string | null;
  address: string | null;
  phoneNumber: string | null;
  linkedInUrl: string | null;
  githubUrl: string | null;
  hasCv: boolean;
  cvFileName: string | null;
  cvUploadedAt: string | null;
  cvSummary: string | null;
  cvSkills: string[];
  totalSessions: number;
  averageScore: number | null;
  bestScore: number | null;
  hasFastSession: boolean;
}

export interface RecommendationCvDownload {
  cvFileName: string;
  contentType: string | null;
  uploadedAt: string | null;
  downloadUrl: string;
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

function pickNullableNum(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function pickNullableStr(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickStrArr(obj: Record<string, unknown>, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
  }
  return false;
}

/** true nếu bất kỳ key nào có giá trị truthy (bool true hoặc string không rỗng). */
function pickHasFlag(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean" && v) return true;
    if (typeof v === "string" && v.trim()) return true;
  }
  return false;
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
    candidateUserId: pickStr(src, "candidateUserId", "CandidateUserId"),
    candidateName: pickStr(src, "candidateName", "fullName", "name"),
    candidateEmail: pickStr(src, "candidateEmail", "email"),
    targetRole: pickStr(src, "targetRole", "role"),
    techStack: pickStrArr(src, "techStack", "skills", "techstack"),
    score: pickNum(src, "score", "overallScore"),
    questionSetId: pickStr(src, "questionSetId"),
    questionSetTitle: pickStr(src, "questionSetTitle", "setTitle", "title"),
    completedAt: pickStr(src, "completedAt", "recommendedAt") || null,
    status: normalizeStatus(pickStr(src, "status") || "NEW"),
    recommendationReason:
      typeof src.recommendationReason === "string"
        ? src.recommendationReason
        : typeof src.reason === "string"
          ? src.reason
          : null,
    invitationResponseMessage: pickNullableStr(src, "invitationResponseMessage"),
    invitationSharedPhoneNumber: pickNullableStr(src, "invitationSharedPhoneNumber"),
  };
}

function normalizeDetail(raw: unknown): CandidateRecommendationDetail | null {
  const base = normalizeRec(raw);
  if (!base) return null;
  const src = asRecord(raw);
  if (!src) return null;
  const cvFileName = pickNullableStr(src, "cvFileName", "CvFileName");
  const hasCv =
    pickHasFlag(src, "hasCv", "HasCv")
    || !!cvFileName
    || !!pickNullableStr(src, "cvUploadedAt", "CvUploadedAt");
  return {
    ...base,
    avatarUrl: pickNullableStr(src, "avatarUrl", "AvatarUrl"),
    bio: pickNullableStr(src, "bio", "Bio"),
    address: pickNullableStr(src, "address", "Address"),
    phoneNumber: pickNullableStr(src, "phoneNumber", "PhoneNumber"),
    linkedInUrl: pickNullableStr(src, "linkedInUrl", "LinkedInUrl", "linkedinUrl"),
    githubUrl: pickNullableStr(src, "githubUrl", "GithubUrl"),
    hasCv,
    cvFileName,
    cvUploadedAt: pickNullableStr(src, "cvUploadedAt", "CvUploadedAt"),
    cvSummary: pickNullableStr(src, "cvSummary", "CvSummary"),
    cvSkills: pickStrArr(src, "cvSkills", "CvSkills"),
    totalSessions: pickNum(src, "totalSessions", "TotalSessions"),
    averageScore: pickNullableNum(src, "averageScore", "AverageScore"),
    bestScore: pickNullableNum(src, "bestScore", "BestScore"),
    hasFastSession: pickBool(src, "hasFastSession", "HasFastSession"),
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

export type RecommendationSortBy = "score" | "date";
export type RecommendationSortDir = "asc" | "desc";

export interface ListRecommendationsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  questionSetId?: string;
  /** Server-side min overall score (SCRUM-328). */
  minScore?: number;
  sortBy?: RecommendationSortBy;
  sortDir?: RecommendationSortDir;
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
      MinScore: params.minScore,
      SortBy: params.sortBy ?? "score",
      SortDir: params.sortDir ?? "desc",
    },
  });
  const items = extractList(res.data)
    .map(normalizeRec)
    .filter((r): r is CandidateRecommendation => r !== null);
  return { items, totalCount: extractTotal(res.data, items.length) };
}

export async function getRecommendation(id: string): Promise<CandidateRecommendationDetail | null> {
  // SCRUM-377: detail trả profile/CV/stats — normalizeDetail.
  const res = await apiClient.get(`/api/hr/recommendations/${id}`);
  return normalizeDetail(asRecord(res.data)?.data ?? res.data);
}

export async function getRecommendationCv(id: string): Promise<RecommendationCvDownload> {
  const res = await apiClient.get(`/api/hr/recommendations/${id}/cv`);
  const src = asRecord(asRecord(res.data)?.data ?? res.data);
  if (!src) throw new Error("Invalid CV response");
  const downloadUrl = pickStr(src, "downloadUrl", "DownloadUrl");
  if (!downloadUrl) throw new Error("Missing downloadUrl");
  return {
    cvFileName: pickStr(src, "cvFileName", "CvFileName") || "cv",
    contentType: pickNullableStr(src, "contentType", "ContentType"),
    uploadedAt: pickNullableStr(src, "uploadedAt", "UploadedAt"),
    downloadUrl,
  };
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

/**
 * Sends an offline interview-offer email directly to the candidate, independent
 * of the in-app /invite flow — works for any recommendation regardless of status.
 * BE returns 409 if the candidate already accepted the most recent offer.
 */
export async function sendRecommendationOffer(id: string, message: string): Promise<void> {
  await apiClient.post(`/api/hr/recommendations/${id}/offer`, { message });
}
