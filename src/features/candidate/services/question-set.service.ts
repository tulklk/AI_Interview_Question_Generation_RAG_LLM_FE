import { apiClient } from "@/core/api/http-client";
import type { Difficulty, PracticeQuestion, QuestionSet } from "@/features/candidate/types/jobseeker";
import { getCompanyColor, getCompanyInitials } from "@/features/candidate/utils/company-visual";

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export interface ListQuestionSetsParams {
  keyword?: string;
  difficulty?: Difficulty;
  skills?: string[];
  companyId?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedQuestionSets {
  items: QuestionSet[];
  totalCount: number;
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickOptionalString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
  }
  return undefined;
}

function pickNullableString(obj: Record<string, unknown>, ...keys: string[]): string | null | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
    if (v === null) return null;
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
  }
  return undefined;
}

function pickStringArray(obj: Record<string, unknown>, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function normalizeDifficulty(raw: unknown): Difficulty {
  const v = typeof raw === "string" ? raw.toLowerCase() : "";
  if (v === "easy") return "Easy";
  if (v === "hard") return "Hard";
  return "Medium";
}

function formatEstimatedTime(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return "";
  return `${Math.round(minutes)} min`;
}

function normalizeQuestion(raw: unknown, index: number): PracticeQuestion | null {
  const src = asRecord(raw);
  if (!src) return null;
  const text = pickString(src, "question", "text", "content");
  if (!text) return null;
  return {
    id: pickString(src, "id", "questionId") || `q-${index}`,
    text,
    category: pickString(src, "questionType", "category") || "technical",
    difficulty: normalizeDifficulty(src.difficulty),
    skill: pickOptionalString(src, "skill"),
    timeLimit: pickNumber(src, "timeLimit"),
  };
}

function normalizeQuestionSet(raw: unknown): QuestionSet | null {
  const root = asRecord(raw);
  if (!root) return null;
  const src = asRecord(root.data) ?? root;

  const id = pickString(src, "id", "questionSetId");
  const title = pickString(src, "title", "jobTitle", "name");
  if (!id && !title) return null;

  const companyName = pickString(src, "companyName", "company") || "";
  const companyLogoUrl = pickNullableString(src, "companyLogo", "companyLogoUrl");

  const rawQuestions = src.questions;
  const questions = Array.isArray(rawQuestions)
    ? rawQuestions.map((q, i) => normalizeQuestion(q, i)).filter((q): q is PracticeQuestion => q !== null)
    : [];

  const totalQuestions = pickNumber(src, "totalQuestions") ?? questions.length;
  const estimatedTimeMinutes = pickNumber(src, "estimatedTimeMinutes");
  // null (or absent) means "no limit" per the BE contract — pickNumber already
  // collapses both to undefined, which QuestionSet.timeLimitMinutes treats the same way.
  const timeLimitMinutes = pickNumber(src, "timeLimitMinutes");
  // BE's rating is on a 0–10 scale (confirmed live: values of 10, 2.5, 0) but the
  // UI is a 5-star widget — convert here so every consumer gets an already-correct
  // 0–5 value instead of each one re-deriving it.
  const rawRating = pickNumber(src, "rating");
  const rating = rawRating !== undefined ? Math.round(rawRating * 5) / 10 : undefined;

  // BE now populates top-level skills[] on both list and detail endpoints
  // (previously always empty, even though each question carried its own real
  // `skill` tag — fixed BE-side). Keep the derive-from-questions fallback for
  // safety in case a set predates the fix or skills[] is empty for any reason.
  const topLevelSkills = pickStringArray(src, "skills");
  const skills = topLevelSkills.length > 0
    ? topLevelSkills
    : Array.from(new Set(questions.map((q) => q.skill).filter((s): s is string => Boolean(s))));

  return {
    id: id || title,
    title: title || id,
    company: companyName,
    companyLogoUrl,
    companyInitials: getCompanyInitials(companyName || title),
    companyColor: getCompanyColor(companyName || id),
    difficulty: normalizeDifficulty(src.difficulty),
    skills,
    totalQuestions,
    estimatedTime: formatEstimatedTime(estimatedTimeMinutes),
    estimatedTimeMinutes,
    timeLimitMinutes,
    rating,
    attempts: pickNumber(src, "attempts", "attemptCount"),
    questions,
  };
}

function extractItems(raw: unknown): unknown[] {
  const root = asRecord(raw);
  if (!root) return Array.isArray(raw) ? raw : [];
  const data = asRecord(root.data);
  if (data && Array.isArray(data.items)) return data.items;
  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.items)) return root.items;
  return [];
}

function extractTotal(raw: unknown, fallback: number): number {
  const root = asRecord(raw);
  if (!root) return fallback;
  const data = asRecord(root.data);
  const totalCount = data ? pickNumber(data, "totalCount") : undefined;
  return totalCount ?? pickNumber(root, "totalCount") ?? fallback;
}

export async function listQuestionSets(params: ListQuestionSetsParams = {}): Promise<PaginatedQuestionSets> {
  const query: Record<string, string | number | string[]> = {};
  if (params.keyword?.trim()) query.Keyword = params.keyword.trim();
  if (params.difficulty) query.Difficulty = params.difficulty;
  if (params.skills && params.skills.length > 0) query.Skills = params.skills;
  if (params.companyId) query.CompanyId = params.companyId;
  if (params.page) query.Page = params.page;
  if (params.pageSize) query.PageSize = params.pageSize;

  // indexes: null serializes arrays as repeated `Skills=a&Skills=b` (ASP.NET Core's
  // expected format for `[FromQuery] string[]`) instead of axios's default `Skills[]=a`.
  const res = await apiClient.get("/api/candidate/question-sets", { params: query, paramsSerializer: { indexes: null } });
  const rawItems = extractItems(res.data);
  const items = rawItems.map(normalizeQuestionSet).filter((s): s is QuestionSet => s !== null);

  return { items, totalCount: extractTotal(res.data, items.length) };
}

export async function getQuestionSetById(id: string): Promise<QuestionSet> {
  try {
    const res = await apiClient.get(`/api/candidate/question-sets/${id}`);
    const set = normalizeQuestionSet(res.data);
    if (!set) throw new NotFoundError();
    return set;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) throw new NotFoundError();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Bookmarks — POST toggles (add on 1st call, remove on 2nd); only PUBLISHED
// sets can be bookmarked (BE returns 404 otherwise, which can't happen from
// candidate-facing pages since those only ever list PUBLISHED sets).
// ---------------------------------------------------------------------------

/** Toggles the bookmark on a question set and returns the new state. */
export async function toggleBookmark(questionSetId: string): Promise<boolean> {
  const res = await apiClient.post(`/api/candidate/question-sets/${questionSetId}/bookmark`);
  const root = asRecord(res.data);
  const data = root ? asRecord(root.data) : null;
  return data?.bookmarked === true;
}

/** Ids of all question sets the candidate has bookmarked — for cross-referencing card state. */
export async function getBookmarkedSetIds(): Promise<Set<string>> {
  try {
    const res = await apiClient.get("/api/candidate/bookmarks");
    const ids = extractItems(res.data)
      .map((raw) => asRecord(raw))
      .filter((r): r is Record<string, unknown> => r !== null)
      .map((r) => pickString(r, "id", "questionSetId"))
      .filter((id) => id !== "");
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export async function listBookmarkedQuestionSets(): Promise<QuestionSet[]> {
  const res = await apiClient.get("/api/candidate/bookmarks");
  return extractItems(res.data)
    .map(normalizeQuestionSet)
    .filter((s): s is QuestionSet => s !== null);
}
