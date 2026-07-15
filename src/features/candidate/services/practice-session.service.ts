import { apiClient } from "@/core/api/http-client";
import type { AnswerRecord, QuestionCategory, Difficulty } from "@/features/candidate/types/jobseeker";

export class FeedbackNotReadyError extends Error {
  constructor(message = "Feedback not ready") {
    super(message);
    this.name = "FeedbackNotReadyError";
  }
}

export interface SkillDimensionScore {
  skill: string;
  score: number;
  fullMark: number;
}

export interface PracticeFeedback {
  sessionId: string;
  overallScore: number;
  aiInsight?: string;
  dimensionScores: SkillDimensionScore[];
  answers: AnswerRecord[];
  questionSetId?: string;
  setTitle?: string;
  companyName?: string;
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

function extractRoot(raw: unknown): Record<string, unknown> | null {
  const root = asRecord(raw);
  if (!root) return null;
  return asRecord(root.data) ?? root;
}

export interface StartedPracticeSession {
  sessionId: string;
  startedAt?: string;
}

export async function startPracticeSession(questionSetId: string): Promise<StartedPracticeSession> {
  const res = await apiClient.post("/practice-sessions", { questionSetId });
  const src = extractRoot(res.data);
  const sessionId = src ? pickString(src, "sessionId", "id", "SessionId", "Id") : "";
  if (!sessionId) throw new Error("Invalid response from start practice session");
  const startedAt = src ? pickString(src, "startedAt", "StartedAt", "createdAt") || undefined : undefined;
  return { sessionId, startedAt };
}

export async function submitAnswer(
  sessionId: string,
  payload: { questionId: string; answer: string }
): Promise<void> {
  await apiClient.post(`/practice-sessions/${sessionId}/answers`, payload);
}

export async function completePracticeSession(sessionId: string): Promise<void> {
  await apiClient.post(`/practice-sessions/${sessionId}/complete`);
}

export interface SessionAnswerEntry {
  questionId: string;
  answer: string | undefined;
}

export interface PracticeSessionState {
  sessionId: string;
  questionSetId?: string;
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt?: string;
  answers: SessionAnswerEntry[];
}

function normalizeSessionState(raw: unknown): PracticeSessionState | null {
  const src = extractRoot(raw);
  if (!src) return null;
  const sessionId = pickString(src, "sessionId", "id", "SessionId", "Id");
  if (!sessionId) return null;

  const rawAnswers = src.answers ?? src.Answers;
  const answers = Array.isArray(rawAnswers)
    ? rawAnswers
        .map((a) => {
          const aSrc = asRecord(a);
          if (!aSrc) return null;
          const questionId = pickString(aSrc, "questionId", "QuestionId", "id");
          if (!questionId) return null;
          return { questionId, answer: pickString(aSrc, "answer", "Answer") || undefined };
        })
        .filter((a): a is SessionAnswerEntry => a !== null)
    : [];

  const statusRaw = pickString(src, "status", "Status").toUpperCase();

  return {
    sessionId,
    questionSetId: pickString(src, "questionSetId", "QuestionSetId") || undefined,
    status: statusRaw === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
    startedAt: pickString(src, "startedAt", "StartedAt", "createdAt") || undefined,
    answers,
  };
}

/** GET /practice-sessions/{id} — hydrate an existing session (resume after refresh/reconnect). */
export async function getPracticeSession(sessionId: string): Promise<PracticeSessionState | null> {
  try {
    const res = await apiClient.get(`/practice-sessions/${sessionId}`);
    return normalizeSessionState(res.data);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

function extractList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const root = asRecord(raw);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data;
  const nested = asRecord(root.data) ?? root;
  if (Array.isArray(nested.items)) return nested.items as unknown[];
  return [];
}

/** Finds an IN_PROGRESS session for this question set, if the candidate left one behind. */
export async function findInProgressSession(questionSetId: string): Promise<PracticeSessionState | null> {
  try {
    const res = await apiClient.get("/practice-sessions", {
      params: { questionSetId, status: "IN_PROGRESS" },
    });
    const first = extractList(res.data)[0];
    return first ? normalizeSessionState(first) : null;
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return null;
    throw err;
  }
}

export interface CompletedSessionSummary {
  id: string;
  questionSetId: string;
  setTitle: string;
  company: string;
  completedAt?: string;
  score: number;
  durationMinutes: number;
  skills: string[];
  totalQuestions: number;
}

function normalizeCompletedSession(raw: unknown): CompletedSessionSummary | null {
  const src = asRecord(raw);
  if (!src) return null;
  const id = pickString(src, "sessionId", "id", "SessionId", "Id");
  if (!id) return null;
  return {
    id,
    questionSetId: pickString(src, "questionSetId", "QuestionSetId"),
    setTitle: pickString(src, "setTitle", "SetTitle", "jobTitle", "title"),
    company: pickString(src, "company", "companyName", "CompanyName"),
    completedAt: pickString(src, "completedAt", "CompletedAt", "endedAt", "updatedAt") || undefined,
    score: pickNumber(src, "score", "overallScore", "Score") ?? 0,
    durationMinutes: pickNumber(src, "durationMinutes", "DurationMinutes", "duration") ?? 0,
    skills: pickStringArray(src, "skills", "Skills"),
    totalQuestions: pickNumber(src, "totalQuestions", "TotalQuestions", "questionCount") ?? 0,
  };
}

/** Lists the candidate's completed practice sessions, most recent first. */
export async function listCompletedSessions(): Promise<CompletedSessionSummary[]> {
  try {
    const res = await apiClient.get("/practice-sessions", { params: { status: "COMPLETED" } });
    return extractList(res.data)
      .map(normalizeCompletedSession)
      .filter((s): s is CompletedSessionSummary => s !== null);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) return [];
    throw err;
  }
}

function normalizeAnswer(raw: unknown, index: number): AnswerRecord | null {
  const src = asRecord(raw);
  if (!src) return null;
  return {
    questionId: pickString(src, "questionId", "QuestionId", "id") || `q-${index}`,
    questionText: pickString(src, "questionText", "QuestionText", "question"),
    category: normalizeCategory(src.category ?? src.Category),
    difficulty: normalizeDifficulty(src.difficulty ?? src.Difficulty),
    answer: pickString(src, "answer", "Answer"),
    aiScore: pickNumber(src, "aiScore", "AiScore", "score") ?? 0,
    strengths: pickStringArray(src, "strengths", "Strengths"),
    improvements: pickStringArray(src, "improvements", "Improvements"),
    suggestion: pickString(src, "suggestion", "Suggestion"),
  };
}

export async function getPracticeFeedback(sessionId: string): Promise<PracticeFeedback> {
  try {
    const res = await apiClient.get(`/practice-sessions/${sessionId}/feedback`);
    const src = extractRoot(res.data);
    if (!src) throw new FeedbackNotReadyError();

    const rawAnswers = src.answers ?? src.Answers;
    const answers = Array.isArray(rawAnswers)
      ? rawAnswers.map((a, i) => normalizeAnswer(a, i)).filter((a): a is AnswerRecord => a !== null)
      : [];

    const rawDimensions = src.dimensionScores ?? src.DimensionScores ?? src.skillScores;
    const dimensionScores = Array.isArray(rawDimensions)
      ? rawDimensions
          .map((d) => {
            const dSrc = asRecord(d);
            if (!dSrc) return null;
            const skill = pickString(dSrc, "skill", "Skill", "name");
            if (!skill) return null;
            return {
              skill,
              score: pickNumber(dSrc, "score", "Score") ?? 0,
              fullMark: pickNumber(dSrc, "fullMark", "FullMark") ?? 100,
            };
          })
          .filter((d): d is SkillDimensionScore => d !== null)
      : [];

    return {
      sessionId,
      overallScore: pickNumber(src, "overallScore", "OverallScore", "score") ?? 0,
      aiInsight: pickString(src, "aiInsight", "AiInsight", "insight") || undefined,
      dimensionScores,
      answers,
      questionSetId: pickString(src, "questionSetId", "QuestionSetId") || undefined,
      setTitle: pickString(src, "setTitle", "SetTitle", "jobTitle") || undefined,
      companyName: pickString(src, "company", "companyName", "CompanyName") || undefined,
    };
  } catch (err) {
    if (err instanceof FeedbackNotReadyError) throw err;
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 202) throw new FeedbackNotReadyError();
    throw err;
  }
}
