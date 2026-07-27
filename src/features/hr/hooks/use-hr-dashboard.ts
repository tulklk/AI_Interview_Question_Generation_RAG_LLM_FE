"use client";

import { useCallback, useEffect, useState } from "react";
import { getGenerationJobs, getGenerationPlans } from "@/features/interview/services/interview.service";
import { listRecommendations } from "@/features/hr/services/recommendation.service";
import { getHrDashboard } from "@/features/hr/services/hr-dashboard.service";
import type { GenerationSession, QuestionType, DifficultyLevel } from "@/features/interview/types/generation-session";
import type { CandidateRecommendation } from "@/features/hr/services/recommendation.service";

export interface DailyActivity {
  date: string;   // "MM/DD"
  sessions: number;
}

export interface QuestionTypeCount {
  type: string;
  count: number;
}

export interface HrDashboardData {
  sessions: GenerationSession[];
  candidates: CandidateRecommendation[];
  totalSessions: number;
  completedSessions: number;
  totalQuestionsGenerated: number;
  successRate: number;
  thisMonthSessions: number;
  topRole: string;
  dailyActivity: DailyActivity[];   // last 30 days
  questionTypeDistribution: QuestionTypeCount[];
  recentSessions: GenerationSession[];
  /** Week-over-week trend supplied directly by the BE aggregate, when available —
   *  preferred over the client-side 14-day dailyActivity heuristic. */
  weekOverWeekTrend: "up" | "down" | "flat" | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

function getQuestionCount(session: GenerationSession): number {
  const actual = (session.generatedQuestions ?? []).filter((q) => q.question).length;
  if (actual > 0) return actual;
  return session.planDraft?.questionCount ?? (session.generatedQuestions?.length ?? 0);
}

function buildDailyActivity(sessions: GenerationSession[]): DailyActivity[] {
  const now = new Date();
  const days: DailyActivity[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 86400000;
    const count = sessions.filter((s) => {
      const t = new Date(s.createdAt).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
    days.push({ date: label, sessions: count });
  }
  return days;
}

function buildTypeDistribution(sessions: GenerationSession[]): QuestionTypeCount[] {
  const map = new Map<string, number>();
  sessions.forEach((s) => {
    (s.generatedQuestions ?? []).forEach((q) => {
      if (!q.question) return;
      const t = q.questionType ?? "Technical";
      map.set(t, (map.get(t) ?? 0) + 1);
    });
    // If no actual questions, count from planDraft questionTypes
    if (!(s.generatedQuestions ?? []).some((q) => q.question)) {
      const types = s.planDraft?.questionTypes ?? [];
      const perType = Math.max(1, Math.floor(getQuestionCount(s) / Math.max(types.length, 1)));
      types.forEach((t) => {
        map.set(t, (map.get(t) ?? 0) + perType);
      });
    }
  });
  return Array.from(map.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/** Turns an aggregate recent-session summary into a minimal, render-compatible GenerationSession. */
function toGenerationSessionStub(row: {
  id: string; role: string; level: string; status: string; questionsCount: number; createdAt: string;
}): GenerationSession {
  const questionType: QuestionType = "Technical";
  const difficulty: DifficultyLevel = "Medium";
  const createdAt = row.createdAt || new Date().toISOString();
  return {
    id: row.id,
    jobTitle: row.role || "Interview Questions",
    hrOwner: "",
    status: (row.status as GenerationSession["status"]) || "COMPLETED",
    planDraft: row.role
      ? {
          role: row.role,
          level: row.level,
          difficulty,
          questionCount: row.questionsCount,
          questionTypes: [questionType],
          topics: [],
        }
      : undefined,
    generatedQuestions: Array.from({ length: row.questionsCount }, (_, i) => ({
      id: `${row.id}-stub-${i}`,
      question: "x",
      questionType,
      difficulty,
      orderIndex: i,
    })),
    createdAt,
    updatedAt: createdAt,
  };
}

function toRecommendationStub(row: {
  id: string; candidateName: string; candidateEmail: string; targetRole: string; score: number; status: CandidateRecommendation["status"];
}): CandidateRecommendation {
  return {
    id: row.id,
    candidateName: row.candidateName,
    candidateEmail: row.candidateEmail,
    targetRole: row.targetRole,
    techStack: [],
    score: row.score,
    questionSetId: "",
    questionSetTitle: "",
    completedAt: null,
    status: row.status,
    invitationResponseMessage: null,
    invitationSharedPhoneNumber: null,
  };
}

export function useHrDashboard(): HrDashboardData {
  const [sessions, setSessions] = useState<GenerationSession[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecommendation[]>([]);
  const [aggregate, setAggregate] = useState<Awaited<ReturnType<typeof getHrDashboard>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setAggregate(null);

    // Fetch aggregate and plans in parallel — plans provide real job titles that
    // the aggregate's recentSessions may not include.
    Promise.all([
      getHrDashboard({ activityDays: 30, recentLimit: 7, recommendationsLimit: 20 }).catch(() => null),
      getGenerationPlans().catch(() => [] as Awaited<ReturnType<typeof getGenerationPlans>>),
    ])
      .then(([agg, plans]) => {
        if (cancelled) return;
        if (agg) {
          if (plans.length > 0) {
            const titleMap = new Map(plans.map((p) => [p.id, p.jobTitle]));
            setAggregate({
              ...agg,
              recentSessions: agg.recentSessions.map((row) => ({
                ...row,
                role: titleMap.get(row.id) || row.role,
              })),
            });
          } else {
            setAggregate(agg);
          }
          setLoading(false);
          return;
        }
        throw new Error("dashboard aggregate unavailable");
      })
      .catch(() => {
        // Fallback: old per-endpoint client-side aggregation.
        Promise.all([
          getGenerationJobs(),
          getGenerationPlans().catch(() => [] as Awaited<ReturnType<typeof getGenerationPlans>>),
          listRecommendations({ pageSize: 20 }).catch(() => ({ items: [], totalCount: 0 })),
        ])
          .then(([jobs, plans, recs]) => {
            if (cancelled) return;
            const planTitleMap = new Map(plans.map((p) => [p.id, p.jobTitle]));
            const enriched = jobs.map((s) => ({
              ...s,
              jobTitle: planTitleMap.get(s.id) || s.jobTitle,
            }));
            setSessions(enriched);
            setCandidates(recs.items);
          })
          .catch(() => {
            if (!cancelled) setError(true);
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (aggregate) {
    const recentSessions = aggregate.recentSessions.map(toGenerationSessionStub);
    return {
      sessions: [],
      candidates: aggregate.topRecommendations.map(toRecommendationStub),
      totalSessions: aggregate.kpis?.totalSessions ?? 0,
      completedSessions: aggregate.kpis?.completedSessions ?? 0,
      totalQuestionsGenerated: aggregate.kpis?.totalQuestionsGenerated ?? 0,
      successRate: aggregate.kpis?.successRate ?? 0,
      thisMonthSessions: aggregate.kpis?.thisMonthSessions ?? 0,
      topRole: aggregate.kpis?.topRole ?? "",
      dailyActivity: aggregate.dailyActivity,
      questionTypeDistribution: aggregate.questionTypeDistribution,
      recentSessions,
      weekOverWeekTrend: aggregate.insights?.weekOverWeekTrend ?? null,
      loading,
      error,
      reload,
    };
  }

  const completedSessions = sessions.filter((s) => s.status === "COMPLETED").length;
  const totalSessions = sessions.length;
  const totalQuestionsGenerated = sessions.reduce((sum, s) => sum + getQuestionCount(s), 0);
  const successRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonthSessions = sessions.filter((s) => new Date(s.createdAt).getTime() >= monthStart).length;

  const roleFreq = new Map<string, number>();
  sessions.forEach((s) => {
    const r = s.jobTitle?.trim();
    if (r && r !== "Interview Questions") {
      roleFreq.set(r, (roleFreq.get(r) ?? 0) + 1);
    }
  });
  const topRole = Array.from(roleFreq.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  const dailyActivity = buildDailyActivity(sessions);
  const questionTypeDistribution = buildTypeDistribution(sessions);
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 7);

  return {
    sessions,
    candidates,
    totalSessions,
    completedSessions,
    totalQuestionsGenerated,
    successRate,
    thisMonthSessions,
    topRole,
    dailyActivity,
    questionTypeDistribution,
    recentSessions,
    weekOverWeekTrend: null,
    loading,
    error,
    reload,
  };
}
