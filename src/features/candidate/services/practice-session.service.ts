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
  /** SCRUM-399 */
  codeTemplateType?: string | null;
  codeSnippet?: string | null;
  attachedImageUrl?: string | null;
  /** SCRUM-400 */
  answerMethod?: "Text" | "Code" | null;
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
    codeTemplateType: pickOptionalString(src, "codeTemplateType") || null,
    codeSnippet: pickOptionalString(src, "codeSnippet") || null,
    attachedImageUrl: pickOptionalString(src, "attachedImageUrl") || null,
    answerMethod: (() => {
      const raw = pickOptionalString(src, "answerMethod");
      if (!raw) return null;
      const key = raw.trim().toLowerCase();
      if (key === "code") return "Code";
      if (key === "text") return "Text";
      return null;
    })(),
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
 * Per-question AI evaluation from GET .../feedback (SCRUM-332: không còn score lúc submit).
 */
export interface AnswerEvaluation {
  score: number | null;
  strengths: string[];
  improvements: string[];
  suggestion: string | null;
  dimensionScores: Record<string, number> | null;
  evaluationStatus: string;
  isLocked?: boolean;
  isTeaser?: boolean;
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
    isLocked: Boolean(src.isLocked ?? src.IsLocked),
    isTeaser: Boolean(src.isTeaser ?? src.IsTeaser),
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

/** Localized overall takeaway for a completed session, plus the skills it flags for improvement. */
export interface SessionAiInsight {
  vi: string;
  en: string;
  skillsToImproveVi: string[];
  skillsToImproveEn: string[];
}

export type PracticeFeedbackAccessLevel = "FreeTeaser" | "Full";

/** Persisted per-session feedback from GET .../feedback. */
export interface SessionFeedback {
  overallScore: number | null;
  accessLevel: PracticeFeedbackAccessLevel;
  aiInsight: SessionAiInsight | null;
  evaluations: Record<string, AnswerEvaluation>;
}

function normalizeAiInsight(raw: unknown): SessionAiInsight | null {
  const src = asRecord(raw);
  if (!src) return null;
  const vi = pickString(src, "vi");
  const en = pickString(src, "en");
  if (!vi && !en) return null;
  const skills = asRecord(src.skillsToImprove);
  return {
    vi,
    en,
    skillsToImproveVi: skills && Array.isArray(skills.vi) ? skills.vi.filter((s): s is string => typeof s === "string") : [],
    skillsToImproveEn: skills && Array.isArray(skills.en) ? skills.en.filter((s): s is string => typeof s === "string") : [],
  };
}

/**
 * Fetches the persisted feedback for a completed session.
 */
export async function getSessionFeedback(sessionId: string): Promise<SessionFeedback | null> {
  try {
    const res = await apiClient.get(`${BASE}/${sessionId}/feedback`);
    const src = extractData(res.data);
    if (!src) return null;
    const items = Array.isArray(src.items) ? src.items : [];
    const evaluations: Record<string, AnswerEvaluation> = {};
    for (const item of items) {
      const itemSrc = asRecord(item);
      if (!itemSrc) continue;
      const questionId = pickString(itemSrc, "questionId");
      const evaluation = normalizeAnswerEvaluation(item);
      if (questionId && evaluation) evaluations[questionId] = evaluation;
    }
    const accessRaw = pickString(src, "accessLevel");
    const accessLevel: PracticeFeedbackAccessLevel =
      accessRaw === "Full" ? "Full" : "FreeTeaser";
    return {
      overallScore: pickNullableNumber(src, "overallScore"),
      accessLevel,
      aiInsight: normalizeAiInsight(src.aiInsight),
      evaluations,
    };
  } catch {
    return null;
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
 * Lưu câu trả lời (SCRUM-332) — không chờ AI chấm. Score có sau complete.
 */
export async function submitAnswer(
  sessionId: string,
  payload: { questionId: string; answerText: string }
): Promise<{ evaluationStatus: string } | null> {
  const res = await apiClient.post(`${BASE}/${sessionId}/answers`, payload);
  const src = extractData(res.data) ?? asRecord(res.data) ?? {};
  return {
    evaluationStatus: pickString(src, "evaluationStatus") || "Pending",
  };
}

/** Normalizes the xpReward object returned by the complete endpoint. */
function normalizeXpReward(raw: unknown): import("@/features/gamification/types/gamification.types").XpReward | null {
  const d = asRecord(raw);
  if (!d) return null;
  const totalEarned = pickNumber(d, "totalEarned");
  if (totalEarned <= 0) return null; // nothing was earned — no notification

  const rawRewards = Array.isArray(d.rewards) ? d.rewards : [];
  const rewards = rawRewards.map((r: unknown) => {
    const rd = asRecord(r) ?? {};
    return {
      type: (rd.type as import("@/features/gamification/types/gamification.types").XpRewardType) ?? "QuestionSetCompleted",
      xp: pickNumber(rd, "xp"),
      label: typeof rd.label === "string" ? rd.label : typeof rd.description === "string" ? rd.description : "",
    };
  });

  const progressRaw = asRecord(d.progress);
  const progress = progressRaw
    ? {
        totalXp: pickNumber(progressRaw, "totalXp"),
        level: pickNumber(progressRaw, "level") || 1,
        currentLevelXp: pickNumber(progressRaw, "currentLevelXp"),
        xpRequiredForNextLevel: pickNumber(progressRaw, "xpRequiredForNextLevel") || 100,
        progressPercentage: pickNumber(progressRaw, "progressPercentage"),
        currentStreak: pickNumber(progressRaw, "currentStreak"),
        longestStreak: pickNumber(progressRaw, "longestStreak"),
        dailyGoalXp: pickNumber(progressRaw, "dailyGoalXp") || 50,
        todayXp: pickNumber(progressRaw, "todayXp"),
        dailyGoalCompleted: typeof progressRaw.dailyGoalCompleted === "boolean" ? progressRaw.dailyGoalCompleted : false,
        totalPracticeSessions: pickNumber(progressRaw, "totalPracticeSessions"),
        nextLevel: typeof progressRaw.nextLevel === "number" ? progressRaw.nextLevel : undefined,
      }
    : undefined;

  return {
    totalEarned,
    rewards,
    previousLevel: pickNumber(d, "previousLevel"),
    currentLevel: pickNumber(d, "currentLevel") || 1,
    previousTotalXp: pickNumber(d, "previousTotalXp"),
    currentTotalXp: pickNumber(d, "currentTotalXp"),
    levelUp: typeof d.levelUp === "boolean" ? d.levelUp : false,
    progress,
  };
}

export interface CompleteSessionResult {
  overallScore: number | null;
  durationSeconds: number;
  xpReward: import("@/features/gamification/types/gamification.types").XpReward | null;
}

/** Complete + AI evaluate sync — timeout dài hơn (batch chấm nhiều câu). */
const COMPLETE_TIMEOUT_MS = 120_000;

export async function completePracticeSession(sessionId: string): Promise<CompleteSessionResult> {
  const res = await apiClient.post(`${BASE}/${sessionId}/complete`, null, {
    timeout: COMPLETE_TIMEOUT_MS,
  });
  const src = extractData(res.data) ?? {};
  return {
    overallScore: pickNullableNumber(src, "overallScore"),
    durationSeconds: pickNumber(src, "durationSeconds"),
    xpReward: normalizeXpReward(src.xpReward),
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
  companyLogoUrl?: string | null;
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
  const durationMinutes =
    typeof src.durationMinutes === "number"
      ? src.durationMinutes
      : typeof src.durationSeconds === "number"
        ? Math.round(src.durationSeconds / 60)
        : 0;

  // Logo may be at top-level or nested inside questionSet / set / questionSetDetail
  const nested =
    asRecord(src.questionSet) ??
    asRecord(src.set) ??
    asRecord(src.questionSetDetail) ??
    null;
  const companyLogoUrl =
    pickOptionalString(src, "companyLogo", "companyLogoUrl", "logoUrl") ??
    (nested ? pickOptionalString(nested, "companyLogo", "companyLogoUrl", "logoUrl") : undefined) ??
    null;

  return {
    id,
    questionSetId: pickString(src, "questionSetId"),
    setTitle: pickString(src, "setTitle", "title"),
    company: pickString(src, "companyName", "company"),
    companyLogoUrl,
    score: pickNullableNumber(src, "score", "overallScore"),
    durationMinutes,
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
  if (!data) return fallback;
  for (const k of ["totalCount", "total", "count"]) {
    if (typeof data[k] === "number") return data[k] as number;
  }
  return fallback;
}

/** Lists a page of the candidate's completed practice sessions, most recent first. */
export async function listCompletedSessions(
  params: { page?: number; pageSize?: number; fromDate?: string; toDate?: string; keyword?: string } = {}
): Promise<PaginatedCompletedSessions> {
  try {
    const res = await apiClient.get(BASE, {
      params: {
        Status: "COMPLETED",
        Page: params.page ?? 1,
        PageSize: params.pageSize ?? 20,
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Keyword: params.keyword || undefined,
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
  const totalDurationMinutes =
    typeof src.totalDurationMinutes === "number"
      ? src.totalDurationMinutes
      : typeof src.totalDurationSeconds === "number"
        ? Math.round(src.totalDurationSeconds / 60)
        : 0;
  return {
    totalSessions: pickNumber(src, "totalSessions", "completedSessions"),
    averageScore: pickNullableNumber(src, "averageScore", "avgScore"),
    bestScore: pickNullableNumber(src, "bestScore", "highestScore", "maxScore"),
    latestScore: pickNullableNumber(src, "latestScore", "lastScore", "recentScore"),
    totalDurationMinutes,
  };
}
