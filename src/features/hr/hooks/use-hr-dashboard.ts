"use client";

import { useCallback, useEffect, useState } from "react";
import { listRecommendations } from "@/features/hr/services/recommendation.service";
import {
  getHrDashboard,
  type HrDashboardHiringFunnel,
  type HrDashboardRecentSession,
} from "@/features/hr/services/hr-dashboard.service";
import type { CandidateRecommendation } from "@/features/hr/services/recommendation.service";

export interface DailyActivity {
  date: string; // "MM/DD"
  sessions: number;
}

export interface QuestionTypeCount {
  type: string;
  count: number;
}

export interface HrDashboardData {
  candidates: CandidateRecommendation[];
  totalSessions: number;
  completedSessions: number;
  totalQuestionsGenerated: number;
  successRate: number;
  thisMonthSessions: number;
  topRole: string;
  dailyActivity: DailyActivity[];
  questionTypeDistribution: QuestionTypeCount[];
  /** IQGS-HR-DUMMY: dùng type aggregate thật — không stub GenerationSession với question "x" */
  recentSessions: HrDashboardRecentSession[];
  weekOverWeekTrend: "up" | "down" | "flat" | null;
  hiringFunnel: HrDashboardHiringFunnel | null;
  loading: boolean;
  error: boolean;
  reload: () => void;
}

function toRecommendationStub(row: {
  id: string;
  candidateName: string;
  candidateEmail: string;
  targetRole: string;
  score: number;
  status: CandidateRecommendation["status"];
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
    return {
      candidates: aggregate.topRecommendations.map(toRecommendationStub),
      totalSessions: aggregate.kpis?.totalSessions ?? 0,
      completedSessions: aggregate.kpis?.completedSessions ?? 0,
      totalQuestionsGenerated: aggregate.kpis?.totalQuestionsGenerated ?? 0,
      successRate: aggregate.kpis?.successRate ?? 0,
      thisMonthSessions: aggregate.kpis?.thisMonthSessions ?? 0,
      topRole: aggregate.kpis?.topRole ?? "",
      dailyActivity: aggregate.dailyActivity,
      questionTypeDistribution: aggregate.questionTypeDistribution,
      recentSessions: aggregate.recentSessions,
      weekOverWeekTrend: aggregate.insights?.weekOverWeekTrend ?? null,
      hiringFunnel: aggregate.hiringFunnel,
      loading,
      error,
      reload,
    };
  }

  return {
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
