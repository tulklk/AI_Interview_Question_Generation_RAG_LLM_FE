import { apiClient } from "@/core/api/http-client";

export type HrCandidateAchievementId =
  | "first-practice"
  | "streak-7"
  | "high-scorer"
  | "speed-demon"
  | "consistent-learner";

export interface HrCandidateAchievementFlag {
  id: HrCandidateAchievementId | string;
  earned: boolean;
}

export interface HrCandidatePracticeOnMySet {
  sessionId: string;
  questionSetId: string;
  title: string;
  sessionStatus: string;
  overallScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

/** SCRUM-401: ngày có practice trong cửa sổ heatmap. */
export interface HrCandidateHeatmapDay {
  date: string;
  count: number;
  minutes: number;
}

/** SCRUM-398 + SCRUM-401: overview ứng viên cho HR. */
export interface HrCandidateOverview {
  candidateUserId: string;
  candidateName: string;
  candidateEmail: string;
  targetRole: string | null;
  seniorityLevel: string | null;
  avatarUrl: string | null;
  bio: string | null;
  techStack: string[];
  linkedInUrl: string | null;
  githubUrl: string | null;
  totalSessions: number;
  averageScore: number | null;
  bestScore: number | null;
  currentStreakDays: number;
  hasFastSession: boolean;
  heatmapDays: HrCandidateHeatmapDay[];
  longestStreakDays: number;
  activeDaysInWindow: number;
  achievements: HrCandidateAchievementFlag[];
  practiceOnMySets: HrCandidatePracticeOnMySet[];
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function unwrapData(res: unknown): Record<string, unknown> | null {
  const r = asRecord(res);
  if (!r) return null;
  return asRecord(r.data) ?? r;
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
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
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

function normalizeAchievement(raw: unknown): HrCandidateAchievementFlag | null {
  const src = asRecord(raw);
  if (!src) return null;
  const id = pickStr(src, "id", "Id");
  if (!id) return null;
  return { id, earned: src.earned === true || src.Earned === true };
}

function normalizePractice(raw: unknown): HrCandidatePracticeOnMySet | null {
  const src = asRecord(raw);
  if (!src) return null;
  const questionSetId = pickStr(src, "questionSetId", "QuestionSetId");
  const sessionId = pickStr(src, "sessionId", "SessionId");
  if (!questionSetId) return null;
  return {
    sessionId,
    questionSetId,
    title: pickStr(src, "title", "Title") || "—",
    sessionStatus: pickStr(src, "sessionStatus", "SessionStatus") || "IN_PROGRESS",
    overallScore: pickNullableNum(src, "overallScore", "OverallScore"),
    startedAt: pickNullableStr(src, "startedAt", "StartedAt"),
    completedAt: pickNullableStr(src, "completedAt", "CompletedAt"),
  };
}

function normalizeHeatmapDay(raw: unknown): HrCandidateHeatmapDay | null {
  const src = asRecord(raw);
  if (!src) return null;
  const date = pickStr(src, "date", "Date");
  if (!date) return null;
  return {
    date,
    count: pickNum(src, "count", "Count"),
    minutes: pickNum(src, "minutes", "Minutes"),
  };
}

function normalizeOverview(raw: unknown): HrCandidateOverview | null {
  const src = unwrapData(raw) ?? asRecord(raw);
  if (!src) return null;
  const candidateUserId = pickStr(src, "candidateUserId", "CandidateUserId");
  if (!candidateUserId) return null;

  const achievementsRaw = src.achievements ?? src.Achievements;
  const practiceRaw = src.practiceOnMySets ?? src.PracticeOnMySets;
  const heatmapRaw = src.heatmapDays ?? src.HeatmapDays;

  return {
    candidateUserId,
    candidateName: pickStr(src, "candidateName", "CandidateName"),
    candidateEmail: pickStr(src, "candidateEmail", "CandidateEmail"),
    targetRole: pickNullableStr(src, "targetRole", "TargetRole"),
    seniorityLevel: pickNullableStr(src, "seniorityLevel", "SeniorityLevel"),
    avatarUrl: pickNullableStr(src, "avatarUrl", "AvatarUrl"),
    bio: pickNullableStr(src, "bio", "Bio"),
    techStack: pickStrArr(src, "techStack", "TechStack"),
    linkedInUrl: pickNullableStr(src, "linkedInUrl", "LinkedInUrl"),
    githubUrl: pickNullableStr(src, "githubUrl", "GithubUrl"),
    totalSessions: pickNum(src, "totalSessions", "TotalSessions"),
    averageScore: pickNullableNum(src, "averageScore", "AverageScore"),
    bestScore: pickNullableNum(src, "bestScore", "BestScore"),
    currentStreakDays: pickNum(src, "currentStreakDays", "CurrentStreakDays"),
    hasFastSession: src.hasFastSession === true || src.HasFastSession === true,
    heatmapDays: Array.isArray(heatmapRaw)
      ? heatmapRaw.map(normalizeHeatmapDay).filter((x): x is HrCandidateHeatmapDay => x !== null)
      : [],
    longestStreakDays: pickNum(src, "longestStreakDays", "LongestStreakDays"),
    activeDaysInWindow: pickNum(src, "activeDaysInWindow", "ActiveDaysInWindow"),
    achievements: Array.isArray(achievementsRaw)
      ? achievementsRaw.map(normalizeAchievement).filter((x): x is HrCandidateAchievementFlag => x !== null)
      : [],
    practiceOnMySets: Array.isArray(practiceRaw)
      ? practiceRaw.map(normalizePractice).filter((x): x is HrCandidatePracticeOnMySet => x !== null)
      : [],
  };
}

export async function getHrCandidateOverview(candidateUserId: string): Promise<HrCandidateOverview> {
  const res = await apiClient.get(`/api/hr/candidates/${candidateUserId}/overview`);
  const data = normalizeOverview(res.data);
  if (!data) throw new Error("Invalid candidate overview response");
  return data;
}

export interface HrSessionFeedbackItem {
  questionId: string;
  questionText: string;
  questionType: string;
  difficulty: string;
  answerText: string;
  score: number | null;
  strengths: string[];
  improvements: string[];
  suggestion: string | null;
  dimensionScores: Record<string, number> | null;
  evaluationStatus: string;
}

export interface HrSessionFeedback {
  sessionId: string;
  overallScore: number | null;
  status: string;
  accessLevel: string;
  aiInsight: { vi: string; en: string; skillsToImproveVi: string[]; skillsToImproveEn: string[] } | null;
  items: HrSessionFeedbackItem[];
}

export async function getHrSessionFeedback(sessionId: string): Promise<HrSessionFeedback> {
  const res = await apiClient.get(`/api/hr/practice-sessions/${sessionId}/feedback`);
  const src = unwrapData(res.data) ?? asRecord(res.data);
  if (!src) throw new Error("Invalid session feedback response");
  const itemsRaw = src.items ?? src.Items;
  const insightSrc = asRecord(src.aiInsight ?? src.AiInsight);
  const skills = insightSrc ? asRecord(insightSrc.skillsToImprove ?? insightSrc.SkillsToImprove) : null;
  return {
    sessionId: pickStr(src, "sessionId", "SessionId"),
    overallScore: pickNullableNum(src, "overallScore", "OverallScore"),
    status: pickStr(src, "status", "Status"),
    accessLevel: pickStr(src, "accessLevel", "AccessLevel"),
    aiInsight: insightSrc
      ? {
          vi: pickStr(insightSrc, "vi", "Vi"),
          en: pickStr(insightSrc, "en", "En"),
          skillsToImproveVi: Array.isArray(skills?.vi) ? skills!.vi.filter((x): x is string => typeof x === "string") : [],
          skillsToImproveEn: Array.isArray(skills?.en) ? skills!.en.filter((x): x is string => typeof x === "string") : [],
        }
      : null,
    items: Array.isArray(itemsRaw)
      ? itemsRaw.map((raw) => {
          const item = asRecord(raw);
          if (!item) return null;
          const dim = asRecord(item.dimensionScores ?? item.DimensionScores);
          const dimensionScores: Record<string, number> = {};
          if (dim) {
            for (const [k, v] of Object.entries(dim)) {
              if (typeof v === "number") dimensionScores[k] = v;
            }
          }
          return {
            questionId: pickStr(item, "questionId", "QuestionId"),
            questionText: pickStr(item, "questionText", "QuestionText"),
            questionType: pickStr(item, "questionType", "QuestionType"),
            difficulty: pickStr(item, "difficulty", "Difficulty"),
            answerText: typeof item.answerText === "string" ? item.answerText : pickStr(item, "answerText", "AnswerText"),
            score: pickNullableNum(item, "score", "Score"),
            strengths: pickStrArr(item, "strengths", "Strengths"),
            improvements: pickStrArr(item, "improvements", "Improvements"),
            suggestion: pickNullableStr(item, "suggestion", "Suggestion"),
            dimensionScores: Object.keys(dimensionScores).length ? dimensionScores : null,
            evaluationStatus: pickStr(item, "evaluationStatus", "EvaluationStatus"),
          };
        }).filter((x): x is HrSessionFeedbackItem => x !== null && Boolean(x.questionId))
      : [],
  };
}
