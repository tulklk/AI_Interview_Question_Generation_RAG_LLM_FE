import { apiClient } from "@/core/api/http-client";

export type MarketplaceSortBy = "featured" | "newest" | "most_practiced" | "highest_rated";

export interface AdminMarketplaceListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  companyId?: string;
  hrUserId?: string;
  sortBy?: MarketplaceSortBy;
}

export interface AdminMarketplaceListItem {
  id: string;
  title: string;
  description?: string | null;
  hrUserId: string;
  hrName: string;
  hrEmail: string;
  companyId: string;
  companyName: string;
  companyLogo?: string | null;
  difficulty?: string;
  skills?: string[];
  totalQuestions: number;
  estimatedTimeMinutes?: number;
  timeLimitMinutes?: number | null;
  attemptCount: number;
  uniqueCandidateCount: number;
  rating?: number | null;
  isPinned: boolean;
  isTrending?: boolean;
  pinnedAt?: string | null;
  publishedAt?: string | null;
}

export interface AdminMarketplacePractitioner {
  candidateUserId: string;
  candidateName: string;
  candidateEmail: string;
  targetRole?: string | null;
  seniorityLevel?: string | null;
  status: string;
  overallScore?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface AdminMarketplaceQuestionSummary {
  id: string;
  order: number;
  question: string;
  questionType: string;
  difficulty: string;
  skill?: string | null;
}

export interface AdminMarketplaceDetail extends AdminMarketplaceListItem {
  description?: string | null;
  timeLimitMinutes?: number | null;
  questions: AdminMarketplaceQuestionSummary[];
  practitioners: AdminMarketplacePractitioner[];
}

export interface AdminMarketplaceStats {
  totalPublished: number;
  practicesLast7Days: number;
  pinnedCount: number;
  topHrs: Array<{
    hrUserId: string;
    hrName: string;
    companyName: string;
    publishedSetCount: number;
    attemptCount: number;
  }>;
  topSkills: Array<{ skill: string; questionCount: number }>;
}

export interface PaginatedMarketplace {
  items: AdminMarketplaceListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function unwrapData(raw: unknown): Record<string, unknown> {
  const root = asRecord(raw);
  if (!root) return {};
  return asRecord(root.data) ?? root;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number" && !Number.isNaN(val)) return val;
  }
  return undefined;
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "boolean") return val;
  }
  return false;
}

function pickOptionalString(obj: Record<string, unknown>, ...keys: string[]): string | null | undefined {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string") return val;
    if (val === null) return null;
  }
  return undefined;
}

function pickStringArray(obj: Record<string, unknown>, ...keys: string[]): string[] {
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) return val.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function normalizeListItem(raw: unknown): AdminMarketplaceListItem | null {
  const src = asRecord(raw);
  if (!src) return null;
  const id = pickString(src, "id");
  if (!id) return null;
  return {
    id,
    title: pickString(src, "title") || id,
    description: pickOptionalString(src, "description"),
    hrUserId: pickString(src, "hrUserId"),
    hrName: pickString(src, "hrName"),
    hrEmail: pickString(src, "hrEmail"),
    companyId: pickString(src, "companyId"),
    companyName: pickString(src, "companyName"),
    companyLogo: pickOptionalString(src, "companyLogo"),
    difficulty: pickString(src, "difficulty") || "Medium",
    skills: pickStringArray(src, "skills"),
    totalQuestions: pickNumber(src, "totalQuestions") ?? 0,
    estimatedTimeMinutes: pickNumber(src, "estimatedTimeMinutes"),
    timeLimitMinutes: pickNumber(src, "timeLimitMinutes") ?? null,
    attemptCount: pickNumber(src, "attemptCount") ?? 0,
    uniqueCandidateCount: pickNumber(src, "uniqueCandidateCount") ?? 0,
    rating: pickNumber(src, "rating") ?? null,
    isPinned: pickBool(src, "isPinned"),
    isTrending: pickBool(src, "isTrending"),
    pinnedAt: pickOptionalString(src, "pinnedAt"),
    publishedAt: pickOptionalString(src, "publishedAt"),
  };
}

export async function getMarketplaceStats(): Promise<AdminMarketplaceStats> {
  const res = await apiClient.get("/api/admin/marketplace/stats");
  const data = unwrapData(res.data);
  const topHrsRaw = Array.isArray(data.topHrs) ? data.topHrs : [];
  const topSkillsRaw = Array.isArray(data.topSkills) ? data.topSkills : [];

  return {
    totalPublished: pickNumber(data, "totalPublished") ?? 0,
    practicesLast7Days: pickNumber(data, "practicesLast7Days") ?? 0,
    pinnedCount: pickNumber(data, "pinnedCount") ?? 0,
    topHrs: topHrsRaw.map((row) => {
      const r = asRecord(row) ?? {};
      return {
        hrUserId: pickString(r, "hrUserId"),
        hrName: pickString(r, "hrName"),
        companyName: pickString(r, "companyName"),
        publishedSetCount: pickNumber(r, "publishedSetCount") ?? 0,
        attemptCount: pickNumber(r, "attemptCount") ?? 0,
      };
    }),
    topSkills: topSkillsRaw.map((row) => {
      const r = asRecord(row) ?? {};
      return {
        skill: pickString(r, "skill"),
        questionCount: pickNumber(r, "questionCount") ?? 0,
      };
    }),
  };
}

export async function listMarketplaceQuestionSets(
  params: AdminMarketplaceListParams = {}
): Promise<PaginatedMarketplace> {
  const query: Record<string, string | number> = {};
  if (params.page) query.Page = params.page;
  if (params.pageSize) query.PageSize = params.pageSize;
  if (params.keyword?.trim()) query.Keyword = params.keyword.trim();
  if (params.companyId) query.CompanyId = params.companyId;
  if (params.hrUserId) query.HrUserId = params.hrUserId;
  if (params.sortBy) query.SortBy = params.sortBy;

  const res = await apiClient.get("/api/admin/marketplace/question-sets", { params: query });
  const data = unwrapData(res.data);
  const itemsRaw = Array.isArray(data.items) ? data.items : [];
  const items = itemsRaw.map(normalizeListItem).filter((x): x is AdminMarketplaceListItem => x !== null);

  return {
    items,
    totalCount: pickNumber(data, "totalCount") ?? items.length,
    page: pickNumber(data, "page") ?? params.page ?? 1,
    pageSize: pickNumber(data, "pageSize") ?? params.pageSize ?? 20,
  };
}

export async function getMarketplaceQuestionSetById(id: string): Promise<AdminMarketplaceDetail> {
  const res = await apiClient.get(`/api/admin/marketplace/question-sets/${id}`);
  const data = unwrapData(res.data);
  const base = normalizeListItem(data);
  if (!base) throw new Error("Không đọc được chi tiết bộ câu hỏi.");

  const questionsRaw = Array.isArray(data.questions) ? data.questions : [];
  const practitionersRaw = Array.isArray(data.practitioners) ? data.practitioners : [];

  return {
    ...base,
    description: pickOptionalString(data, "description"),
    timeLimitMinutes: pickNumber(data, "timeLimitMinutes") ?? null,
    questions: questionsRaw.map((row) => {
      const r = asRecord(row) ?? {};
      return {
        id: pickString(r, "id"),
        order: pickNumber(r, "order") ?? 0,
        question: pickString(r, "question"),
        questionType: pickString(r, "questionType"),
        difficulty: pickString(r, "difficulty"),
        skill: pickOptionalString(r, "skill"),
      };
    }),
    practitioners: practitionersRaw.map((row) => {
      const r = asRecord(row) ?? {};
      return {
        candidateUserId: pickString(r, "candidateUserId"),
        candidateName: pickString(r, "candidateName"),
        candidateEmail: pickString(r, "candidateEmail"),
        targetRole: pickOptionalString(r, "targetRole"),
        seniorityLevel: pickOptionalString(r, "seniorityLevel"),
        status: pickString(r, "status"),
        overallScore: pickNumber(r, "overallScore") ?? null,
        startedAt: pickOptionalString(r, "startedAt"),
        completedAt: pickOptionalString(r, "completedAt"),
      };
    }),
  };
}

export async function pinMarketplaceQuestionSet(id: string): Promise<void> {
  await apiClient.post(`/api/admin/marketplace/question-sets/${id}/pin`);
}

export async function unpinMarketplaceQuestionSet(id: string): Promise<void> {
  await apiClient.delete(`/api/admin/marketplace/question-sets/${id}/pin`);
}

function extractBeErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { error?: string; detail?: string; message?: string } } })
    ?.response?.data;
  return data?.error ?? data?.detail ?? data?.message ?? "";
}

function parseAbandonedSessionCount(raw: unknown): number {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const inner = rec.data && typeof rec.data === "object" ? (rec.data as Record<string, unknown>) : rec;
  const n = Number(inner.abandonedSessionCount ?? inner.AbandonedSessionCount ?? 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export async function unpublishMarketplaceQuestionSet(id: string): Promise<number> {
  try {
    const { data } = await apiClient.post<unknown>(`/api/admin/marketplace/question-sets/${id}/unpublish`);
    return parseAbandonedSessionCount(data);
  } catch (err) {
    throw new Error(extractBeErrorMessage(err));
  }
}
