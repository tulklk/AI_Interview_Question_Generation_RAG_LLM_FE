/**
 * SCRUM-513: thống kê chất lượng bộ câu hỏi cho HR.
 * GET /api/hr/question-sets/{id}/insights
 */

import { apiClient } from "@/core/api/http-client";

export type QuestionQualityFlag = "tooEasy" | "tooHard" | null;

export interface QuestionSetInsightsSummary {
  completedCount: number;
  averageScore: number | null;
  passRateOverall: number;
  evaluatedAnswerCount: number;
}

export interface QuestionInsightItem {
  questionId: string;
  order: number;
  questionText: string;
  skill: string | null;
  difficulty: string;
  evaluatedCount: number;
  averageScore: number | null;
  passCount: number;
  passRate: number;
  failRate: number;
  qualityFlag: QuestionQualityFlag;
}

export interface LeaderboardItem {
  rank: number;
  candidateUserId: string;
  candidateName: string;
  bestOverallScore: number;
  attemptCount: number;
  latestCompletedAt: string | null;
  isOfficialTest: boolean;
}

export interface RecentAttemptItem {
  sessionId: string;
  candidateUserId: string;
  candidateName: string;
  overallScore: number | null;
  completedAt: string | null;
  isOfficialTest: boolean;
}

export interface QuestionSetInsights {
  questionSetId: string;
  isHiringAssessment: boolean;
  passThreshold: number;
  summary: QuestionSetInsightsSummary;
  questions: QuestionInsightItem[];
  leaderboard: LeaderboardItem[];
  recentAttempts: RecentAttemptItem[];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function flag(v: unknown): QuestionQualityFlag {
  if (v === "tooEasy" || v === "tooHard") return v;
  return null;
}

function normalizeQuestion(raw: unknown): QuestionInsightItem {
  const d = asRecord(raw);
  return {
    questionId: str(d.questionId ?? d.QuestionId),
    order: num(d.order ?? d.Order),
    questionText: str(d.questionText ?? d.QuestionText),
    skill: strOrNull(d.skill ?? d.Skill),
    difficulty: str(d.difficulty ?? d.Difficulty),
    evaluatedCount: num(d.evaluatedCount ?? d.EvaluatedCount),
    averageScore: numOrNull(d.averageScore ?? d.AverageScore),
    passCount: num(d.passCount ?? d.PassCount),
    passRate: num(d.passRate ?? d.PassRate),
    failRate: num(d.failRate ?? d.FailRate),
    qualityFlag: flag(d.qualityFlag ?? d.QualityFlag),
  };
}

function normalizeLeader(raw: unknown): LeaderboardItem {
  const d = asRecord(raw);
  return {
    rank: num(d.rank ?? d.Rank),
    candidateUserId: str(d.candidateUserId ?? d.CandidateUserId),
    candidateName: str(d.candidateName ?? d.CandidateName),
    bestOverallScore: num(d.bestOverallScore ?? d.BestOverallScore),
    attemptCount: num(d.attemptCount ?? d.AttemptCount),
    latestCompletedAt: strOrNull(d.latestCompletedAt ?? d.LatestCompletedAt),
    isOfficialTest: Boolean(d.isOfficialTest ?? d.IsOfficialTest),
  };
}

function normalizeRecent(raw: unknown): RecentAttemptItem {
  const d = asRecord(raw);
  return {
    sessionId: str(d.sessionId ?? d.SessionId),
    candidateUserId: str(d.candidateUserId ?? d.CandidateUserId),
    candidateName: str(d.candidateName ?? d.CandidateName),
    overallScore: numOrNull(d.overallScore ?? d.OverallScore),
    completedAt: strOrNull(d.completedAt ?? d.CompletedAt),
    isOfficialTest: Boolean(d.isOfficialTest ?? d.IsOfficialTest),
  };
}

export async function getQuestionSetInsights(
  questionSetId: string,
  includePractice = false
): Promise<QuestionSetInsights> {
  const res = await apiClient.get(`/api/hr/question-sets/${questionSetId}/insights`, {
    params: includePractice ? { includePractice: true } : undefined,
  });
  const root = asRecord(res.data);
  const payload = root.data ? asRecord(root.data) : root;
  const summary = asRecord(payload.summary ?? payload.Summary);
  const questions = Array.isArray(payload.questions ?? payload.Questions)
    ? ((payload.questions ?? payload.Questions) as unknown[])
    : [];
  const leaderboard = Array.isArray(payload.leaderboard ?? payload.Leaderboard)
    ? ((payload.leaderboard ?? payload.Leaderboard) as unknown[])
    : [];
  const recent = Array.isArray(payload.recentAttempts ?? payload.RecentAttempts)
    ? ((payload.recentAttempts ?? payload.RecentAttempts) as unknown[])
    : [];

  return {
    questionSetId: str(payload.questionSetId ?? payload.QuestionSetId, questionSetId),
    isHiringAssessment: Boolean(payload.isHiringAssessment ?? payload.IsHiringAssessment),
    passThreshold: num(payload.passThreshold ?? payload.PassThreshold, 70),
    summary: {
      completedCount: num(summary.completedCount ?? summary.CompletedCount),
      averageScore: numOrNull(summary.averageScore ?? summary.AverageScore),
      passRateOverall: num(summary.passRateOverall ?? summary.PassRateOverall),
      evaluatedAnswerCount: num(summary.evaluatedAnswerCount ?? summary.EvaluatedAnswerCount),
    },
    questions: questions.map(normalizeQuestion),
    leaderboard: leaderboard.map(normalizeLeader),
    recentAttempts: recent.map(normalizeRecent),
  };
}
