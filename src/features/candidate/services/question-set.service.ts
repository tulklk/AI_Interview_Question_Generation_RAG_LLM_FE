import { apiClient } from "@/core/api/http-client";
import type { Difficulty, PracticeQuestion, QuestionCategory, QuestionSet } from "@/features/candidate/types/jobseeker";
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

function normalizeCategory(raw: unknown): QuestionCategory {
  const v = typeof raw === "string" ? raw.toLowerCase() : "";
  if (v === "behavioral") return "Behavioral";
  if (v === "situational") return "Situational";
  return "Technical";
}

function normalizeQuestion(raw: unknown, index: number): PracticeQuestion | null {
  const src = asRecord(raw);
  if (!src) return null;
  const text = pickString(src, "text", "question", "Question", "content");
  if (!text) return null;
  return {
    id: pickString(src, "id", "Id", "questionId") || `q-${index}`,
    text,
    category: normalizeCategory(src.category ?? src.Category ?? src.questionType),
    difficulty: normalizeDifficulty(src.difficulty ?? src.Difficulty),
    timeLimit: pickNumber(src, "timeLimit", "TimeLimit"),
  };
}

function normalizeQuestionSet(raw: unknown): QuestionSet | null {
  const root = asRecord(raw);
  if (!root) return null;
  const src = asRecord(root.data) ?? root;

  const id = pickString(src, "id", "Id", "questionSetId", "QuestionSetId");
  const title = pickString(src, "title", "Title", "jobTitle", "JobTitle", "name");
  if (!id && !title) return null;

  const companyName = pickString(src, "company", "companyName", "CompanyName") || "";
  const companyId = pickOptionalString(src, "companyId", "CompanyId");

  const rawQuestions = src.questions ?? src.Questions;
  const questions = Array.isArray(rawQuestions)
    ? rawQuestions.map((q, i) => normalizeQuestion(q, i)).filter((q): q is PracticeQuestion => q !== null)
    : [];

  const totalQuestions = pickNumber(src, "totalQuestions", "TotalQuestions", "questionCount") ?? questions.length;

  return {
    id: id || title,
    title: title || id,
    company: companyName,
    companyId,
    companyInitials: getCompanyInitials(companyName || title),
    companyColor: getCompanyColor(companyId || companyName || id),
    difficulty: normalizeDifficulty(src.difficulty ?? src.Difficulty),
    skills: pickStringArray(src, "skills", "Skills", "tags"),
    totalQuestions,
    estimatedTime: pickOptionalString(src, "estimatedTime", "EstimatedTime") ?? "",
    category: pickOptionalString(src, "category", "Category") ?? "",
    description: pickOptionalString(src, "description", "Description") ?? "",
    rating: pickNumber(src, "rating", "Rating"),
    attempts: pickNumber(src, "attempts", "Attempts", "attemptCount"),
    questions,
  };
}

function extractItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const root = asRecord(raw);
  if (!root) return [];

  const data = root.data;
  if (Array.isArray(data)) return data;

  const nested = asRecord(data);
  if (nested) {
    for (const key of ["items", "Items", "questionSets", "QuestionSets", "results", "Results"]) {
      if (Array.isArray(nested[key])) return nested[key] as unknown[];
    }
  }

  for (const key of ["items", "Items", "questionSets", "QuestionSets", "results", "Results"]) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }

  return [];
}

function extractTotal(raw: unknown, fallback: number): number {
  const root = asRecord(raw);
  if (!root) return fallback;

  const sources = [root, asRecord(root.data)].filter(Boolean) as Record<string, unknown>[];
  for (const src of sources) {
    for (const k of ["totalCount", "TotalCount", "total", "Total", "count", "Count"]) {
      const v = src[k];
      if (typeof v === "number" && v >= 0) return v;
    }
  }
  return fallback;
}

export async function listQuestionSets(params: ListQuestionSetsParams = {}): Promise<PaginatedQuestionSets> {
  const query: Record<string, string | number> = {};
  if (params.keyword?.trim()) query.keyword = params.keyword.trim();
  if (params.difficulty) query.difficulty = params.difficulty;
  if (params.skills && params.skills.length > 0) query.skills = params.skills.join(",");
  if (params.companyId) query.companyId = params.companyId;
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;

  const res = await apiClient.get("/api/candidate/question-sets", { params: query });
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
