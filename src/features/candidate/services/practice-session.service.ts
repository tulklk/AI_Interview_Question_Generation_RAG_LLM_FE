import { apiClient } from "@/core/api/http-client";
import type { Difficulty } from "@/features/candidate/types/jobseeker";

const BASE = "/api/candidate/practice-sessions";

/** Thrown when the BE returns 403 — the session exists but belongs to another candidate. */
export class ForbiddenError extends Error {
  constructor(message = "You don't have access to this session") {
    super(message);
    this.name = "ForbiddenError";
  }
}

function rethrowForbidden(err: unknown): never {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 403) throw new ForbiddenError();
  throw err;
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

function pickNullableNumber(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
    if (v === null) return null;
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
  }
  return 0;
}

function normalizeDifficulty(raw: unknown): Difficulty {
  const v = typeof raw === "string" ? raw.toLowerCase() : "";
  if (v === "easy") return "Easy";
  if (v === "hard") return "Hard";
  return "Medium";
}

function extractData(raw: unknown): Record<string, unknown> | null {
  const root = asRecord(raw);
  if (!root) return null;
  return asRecord(root.data) ?? root;
}

// ---------------------------------------------------------------------------
// Session detail (start / resume / get) — the real API returns the full
// question list with each question's own answerText (null until answered),
// so a single call both starts/resumes a session AND hydrates its state.
// ---------------------------------------------------------------------------

export interface PracticeSessionQuestion {
  id: string;
  order: number;
  question: string;
  questionType: string;
  difficulty: Difficulty;
  skill?: string;
  focusArea?: string;
  answerText: string | null;
}

export interface PracticeSessionDetail {
  id: string;
  questionSetId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  startedAt?: string;
  completedAt?: string | null;
  overallScore: number | null;
  /** HR-configured limit that applied when this session started; null = untimed. */
  timeLimitMinutes: number | null;
  /** Absolute deadline (startedAt + timeLimitMinutes) BE enforces server-side; null = untimed. */
  expiresAt: string | null;
  questions: PracticeSessionQuestion[];
}

function normalizeSessionQuestion(raw: unknown): PracticeSessionQuestion | null {
  const src = asRecord(raw);
  if (!src) return null;
  const id = pickString(src, "id", "questionId");
  const question = pickString(src, "question");
  if (!id || !question) return null;
  return {
    id,
    order: pickNumber(src, "order"),
    question,
    questionType: pickString(src, "questionType") || "technical",
    difficulty: normalizeDifficulty(src.difficulty),
    skill: pickOptionalString(src, "skill"),
    focusArea: pickOptionalString(src, "focusArea"),
    answerText: typeof src.answerText === "string" ? src.answerText : null,
  };
}

function normalizeSessionDetail(raw: unknown): PracticeSessionDetail | null {
  const src = extractData(raw);
  if (!src) return null;
  const id = pickString(src, "id", "sessionId");
  if (!id) return null;

  const rawQuestions = src.questions;
  const questions = Array.isArray(rawQuestions)
    ? rawQuestions.map(normalizeSessionQuestion).filter((q): q is PracticeSessionQuestion => q !== null)
    : [];

  const statusRaw = pickString(src, "status").toUpperCase();

  return {
    id,
    questionSetId: pickString(src, "questionSetId"),
    status: statusRaw === "COMPLETED" ? "COMPLETED" : statusRaw === "ABANDONED" ? "ABANDONED" : "IN_PROGRESS",
    startedAt: pickOptionalString(src, "startedAt"),
    completedAt: pickOptionalString(src, "completedAt") ?? null,
    overallScore: pickNullableNumber(src, "overallScore"),
    timeLimitMinutes: pickNullableNumber(src, "timeLimitMinutes"),
    expiresAt: pickOptionalString(src, "expiresAt") ?? null,
    questions,
  };
}

// BE's auto-resume (find-existing-or-create) isn't atomic — two POSTs that land
// close enough together (e.g. React StrictMode's double-effect in dev, or a
// double-click before navigation completes) can each pass the "no IN_PROGRESS
// session yet" check and create two separate sessions. Dedupe concurrent calls
// for the same set in this tab so only one request ever goes out.
const inFlightStarts = new Map<string, Promise<PracticeSessionDetail>>();

/**
 * Starts a practice session for this question set. If the candidate already has
 * an IN_PROGRESS session for the same set, the BE returns that one instead of
 * creating a new one (auto-resume) — the returned questions[] already carry any
 * previously-submitted answerText, so this single call both starts and hydrates.
 */
export async function startPracticeSession(questionSetId: string): Promise<PracticeSessionDetail> {
  const inFlight = inFlightStarts.get(questionSetId);
  if (inFlight) return inFlight;

  const request = (async () => {
    let res;
    try {
      res = await apiClient.post(BASE, { questionSetId });
    } catch (err) {
      rethrowForbidden(err);
    }
    const session = normalizeSessionDetail(res.data);
    if (!session) throw new Error("Invalid response from start practice session");
    return session;
  })();

  inFlightStarts.set(questionSetId, request);
  try {
    return await request;
  } finally {
    inFlightStarts.delete(questionSetId);
  }
}

export async function getPracticeSession(sessionId: string): Promise<PracticeSessionDetail | null> {
  try {
    const res = await apiClient.get(`${BASE}/${sessionId}`);
    return normalizeSessionDetail(res.data);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    rethrowForbidden(err);
  }
}

function normalizeDimensionScores(raw: unknown): Record<string, number> | null {
  const src = asRecord(raw);
  if (!src) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === "number") out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Per-question AI evaluation. BE has no GET endpoint for this — it's only ever
 * returned inline, once, in the POST .../answers response — so it's captured
 * there and carried to the results page via sessionStorage (see
 * saveAnswerEvaluation/readAnswerEvaluations below). If the candidate views
 * results in a new tab/browser session, this data is simply unavailable and
 * the per-question breakdown is omitted — a real limitation of not having a
 * persisted BE source, not a bug in the FE capture itself.
 */
export interface AnswerEvaluation {
  score: number | null;
  strengths: string[];
  improvements: string[];
  suggestion: string | null;
  dimensionScores: Record<string, number> | null;
  evaluationStatus: string;
}

function normalizeAnswerEvaluation(raw: unknown): AnswerEvaluation | null {
  const src = extractData(raw);
  if (!src) return null;
  return {
    score: pickNullableNumber(src, "score"),
    strengths: Array.isArray(src.strengths) ? src.strengths.filter((s): s is string => typeof s === "string") : [],
    improvements: Array.isArray(src.improvements) ? src.improvements.filter((s): s is string => typeof s === "string") : [],
    suggestion: pickOptionalString(src, "suggestion") ?? null,
    dimensionScores: normalizeDimensionScores(src.dimensionScores),
    evaluationStatus: pickString(src, "evaluationStatus") || "Unknown",
  };
}

function feedbackStorageKey(sessionId: string): string {
  return `practice-feedback-${sessionId}`;
}

export function readAnswerEvaluations(sessionId: string): Record<string, AnswerEvaluation> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(feedbackStorageKey(sessionId));
    return raw ? (JSON.parse(raw) as Record<string, AnswerEvaluation>) : {};
  } catch {
    return {};
  }
}

function saveAnswerEvaluation(sessionId: string, questionId: string, evaluation: AnswerEvaluation): void {
  if (typeof window === "undefined") return;
  try {
    const map = readAnswerEvaluations(sessionId);
    map[questionId] = evaluation;
    window.sessionStorage.setItem(feedbackStorageKey(sessionId), JSON.stringify(map));
  } catch {
    // Best-effort only — worst case that question's AI eval just doesn't render later.
  }
}

function extractList(raw: unknown): unknown[] {
  const root = asRecord(raw);
  if (!root) return Array.isArray(raw) ? raw : [];
  const data = asRecord(root.data);
  if (data && Array.isArray(data.items)) return data.items;
  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.items)) return root.items;
  return [];
}

/** Read-only check for an in-progress session on this set, without starting/resuming one as a side effect. */
export async function findInProgressSession(questionSetId: string): Promise<{ sessionId: string } | null> {
  try {
    const res = await apiClient.get(BASE, { params: { QuestionSetId: questionSetId, Status: "IN_PROGRESS" } });
    const first = asRecord(extractList(res.data)[0]);
    const sessionId = first ? pickString(first, "sessionId", "id") : "";
    return sessionId ? { sessionId } : null;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

/**
 * Submits an answer. The response carries that question's AI evaluation
 * (score/strengths/improvements/suggestion) inline — captured to sessionStorage
 * here (see readAnswerEvaluations) since there's no way to fetch it again later.
 */
export async function submitAnswer(
  sessionId: string,
  payload: { questionId: string; answerText: string }
): Promise<AnswerEvaluation | null> {
  const res = await apiClient.post(`${BASE}/${sessionId}/answers`, payload);
  const evaluation = normalizeAnswerEvaluation(res.data);
  if (evaluation) saveAnswerEvaluation(sessionId, payload.questionId, evaluation);
  return evaluation;
}

export interface CompleteSessionResult {
  overallScore: number | null;
  durationSeconds: number;
}

export async function completePracticeSession(sessionId: string): Promise<CompleteSessionResult> {
  const res = await apiClient.post(`${BASE}/${sessionId}/complete`);
  const src = extractData(res.data) ?? {};
  return {
    overallScore: pickNullableNumber(src, "overallScore"),
    durationSeconds: pickNumber(src, "durationSeconds"),
  };
}

export async function abandonPracticeSession(sessionId: string): Promise<void> {
  await apiClient.post(`${BASE}/${sessionId}/abandon`);
}

// ---------------------------------------------------------------------------
// History list
// ---------------------------------------------------------------------------

export interface CompletedSessionSummary {
  id: string;
  questionSetId: string;
  setTitle: string;
  company: string;
  score: number | null;
  durationMinutes: number;
  startedAt?: string;
  completedAt?: string;
}

function normalizeCompletedSession(raw: unknown): CompletedSessionSummary | null {
  const src = asRecord(raw);
  if (!src) return null;
  const id = pickString(src, "sessionId", "id");
  if (!id) return null;
  return {
    id,
    questionSetId: pickString(src, "questionSetId"),
    setTitle: pickString(src, "setTitle", "title"),
    company: pickString(src, "companyName", "company"),
    score: pickNullableNumber(src, "score", "overallScore"),
    durationMinutes: Math.round(pickNumber(src, "durationSeconds") / 60),
    startedAt: pickOptionalString(src, "startedAt"),
    completedAt: pickOptionalString(src, "completedAt"),
  };
}

export interface PaginatedCompletedSessions {
  items: CompletedSessionSummary[];
  totalCount: number;
}

function extractTotal(raw: unknown, fallback: number): number {
  const data = extractData(raw);
  return data ? pickNumber(data, "totalCount") || fallback : fallback;
}

/** Lists a page of the candidate's completed practice sessions, most recent first. */
export async function listCompletedSessions(
  params: { page?: number; pageSize?: number; fromDate?: string; toDate?: string } = {}
): Promise<PaginatedCompletedSessions> {
  try {
    const res = await apiClient.get(BASE, {
      params: {
        Status: "COMPLETED",
        Page: params.page ?? 1,
        PageSize: params.pageSize ?? 20,
        FromDate: params.fromDate,
        ToDate: params.toDate,
      },
    });
    const items = extractList(res.data)
      .map(normalizeCompletedSession)
      .filter((s): s is CompletedSessionSummary => s !== null);
    return { items, totalCount: extractTotal(res.data, items.length) };
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return { items: [], totalCount: 0 };
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface PracticeStats {
  totalSessions: number;
  averageScore: number | null;
  bestScore: number | null;
  latestScore: number | null;
  totalDurationMinutes: number;
}

export async function getPracticeStats(): Promise<PracticeStats> {
  const res = await apiClient.get(`${BASE}/stats`);
  const src = extractData(res.data) ?? {};
  return {
    totalSessions: pickNumber(src, "totalSessions"),
    averageScore: pickNullableNumber(src, "averageScore"),
    bestScore: pickNullableNumber(src, "bestScore"),
    latestScore: pickNullableNumber(src, "latestScore"),
    totalDurationMinutes: Math.round(pickNumber(src, "totalDurationSeconds") / 60),
  };
}
