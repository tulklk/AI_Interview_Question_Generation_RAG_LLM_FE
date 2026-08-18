"use client";

import { useCallback, useEffect, useState } from "react";
import { listRecommendations } from "@/features/hr/services/recommendation.service";
import { getHrDashboard, type HrDashboardHiringFunnel } from "@/features/hr/services/hr-dashboard.service";
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
  dailyActivity: DailyActivity[];
  questionTypeDistribution: QuestionTypeCount[];
  recentSessions: GenerationSession[];
  weekOverWeekTrend: "up" | "down" | "flat" | null;
  hiringFunnel: HrDashboardHiringFunnel | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
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
    candidateUserId: "",
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
    invitationStatus: null,
    latestOfferStatus: null,
    viewedAt: null,
    fitPercent: null,
    invitationScheduledAtUtc: null,
    invitationTimeZoneId: null,
    invitationMeetingMode: null,
    invitationMeetingLink: null,
    invitationLocation: null,
  };
}

/**
 * Dashboard chỉ dùng GET /api/hr/dashboard (aggregate Studio).
 * Không còn fallback question-generation-jobs/plans (V1 → 410).
 */
export function useHrDashboard(): HrDashboardData {
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

    getHrDashboard({ activityDays: 30, recentLimit: 7, recommendationsLimit: 20 })
      .then(async (agg) => {
        if (cancelled) return;
        if (agg) {
          setAggregate(agg);
          setLoading(false);
          return;
        }
        // Soft fallback: recommendations only
        const recs = await listRecommendations({ pageSize: 20 }).catch(() => ({ items: [], totalCount: 0 }));
        if (cancelled) return;
        setCandidates(recs.items);
        setError(true);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
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
      hiringFunnel: aggregate.hiringFunnel,
      loading,
      error,
      reload,
    };
  }

  return {
    sessions: [],
    candidates,
    totalSessions: 0,
    completedSessions: 0,
    totalQuestionsGenerated: 0,
    successRate: 0,
    thisMonthSessions: 0,
    topRole: "",
    dailyActivity: [],
    questionTypeDistribution: [],
    recentSessions: [],
    weekOverWeekTrend: null,
    hiringFunnel: null,
    loading,
    error,
    reload,
  };
}
