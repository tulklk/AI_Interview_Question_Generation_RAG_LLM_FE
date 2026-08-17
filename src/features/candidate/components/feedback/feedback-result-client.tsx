"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { FeedbackPage } from "./feedback-page";
import { QuestionSetFeedbackDialog } from "./question-set-feedback-dialog";
import {
  getPracticeSession,
  readAnswerEvaluations,
  getSessionFeedback,
  listCompletedSessions,
  ForbiddenError,
  type PracticeSessionDetail,
  type AnswerEvaluation,
  type SessionAiInsight,
  type PracticeFeedbackAccessLevel,
} from "@/features/candidate/services/practice-session.service";
import {
  getQuestionSetById,
  getMyQuestionSetFeedback,
} from "@/features/candidate/services/question-set.service";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtextAlt } from "@/shared/utils/portal-ui";
import { registerScoringSession, markScoringDone, removeScoringEntry } from "@/features/candidate/components/ui/scoring-progress-badge";
import { cleanTitle } from "@/features/candidate/utils/clean-title";
import { isCoachGeneratedSetId } from "@/features/candidate/utils/coach-job-storage";
import type { XpReward } from "@/features/gamification/types/gamification.types";

// AI scoring can still be in progress right after "complete" — the score comes
// back as null until BE's worker finishes. Poll quietly in the background while
// the rest of the page (questions + your answers) is already shown.
const SCORE_POLL_INTERVAL_MS = 3000;
const SCORE_POLL_MAX_ATTEMPTS = 8;

export function FeedbackResultClient() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id ?? "";
  const { t } = useLanguage();
  const p = t.jobseekerFeedbackPage;

  const [session, setSession] = useState<PracticeSessionDetail | null>(null);
  const [feedback, setFeedback] = useState<Record<string, AnswerEvaluation>>({});
  const [aiInsight, setAiInsight] = useState<SessionAiInsight | null>(null);
  const [accessLevel, setAccessLevel] = useState<PracticeFeedbackAccessLevel>("Full");
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null | undefined>(undefined);
  const [xpReward, setXpReward] = useState<XpReward | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [scoring, setScoring] = useState(false);
  /** P4: true when the score poll exhausted all attempts and still no score. */
  const [scoringTimedOut, setScoringTimedOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const pollAttemptsRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether scoring was ever in progress (for localStorage update on done)
  const wasScoring = useRef(false);
  // P4: track the cancelled state for the current effect (updated each reloadKey cycle)
  const pollCancelledRef = useRef(false);

  // ── Question-set feedback dialog ──────────────────────────────────────────
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  // Only check once per result-page load — ref so we don't re-trigger on set state changes
  const feedbackCheckedRef = useRef(false);

  // Read XP reward stored by practice-session before navigation — one-shot, then clear.
  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;
    const key = `practice-xp-reward-${sessionId}`;
    const raw = window.sessionStorage.getItem(key);
    if (raw) {
      try { setXpReward(JSON.parse(raw) as XpReward); } catch { /* malformed — ignore */ }
      window.sessionStorage.removeItem(key);
    }
  }, [sessionId]);

  // Once we know the questionSetId (from session data), check whether the
  // candidate has already submitted a rating.  If not, open the dialog after
  // a short delay so they can first absorb their result.
  useEffect(() => {
    const qsId = session?.questionSetId;
    if (!qsId || !set || feedbackCheckedRef.current) return;

    // Drill / bộ luyện skill cá nhân: không hỏi đánh giá sao (không phải marketplace).
    if (/^drill\b/i.test(set.title.trim())) {
      feedbackCheckedRef.current = true;
      return;
    }

    // AI Coach-generated sets: không phải marketplace, không hỏi đánh giá.
    if (isCoachGeneratedSetId(qsId)) {
      feedbackCheckedRef.current = true;
      return;
    }

    feedbackCheckedRef.current = true;
    getMyQuestionSetFeedback(qsId).then((existing) => {
      if (existing === null) {
        const t = setTimeout(() => setShowFeedbackDialog(true), 1500);
        return () => clearTimeout(t);
      }
    });
  }, [session?.questionSetId, set]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    pollCancelledRef.current = false;
    setLoading(true);
    setError(false);
    setForbidden(false);
    setSet(null);
    setFeedback({});
    setAiInsight(null);
    setAccessLevel("Full");
    setPreviousScore(undefined);
    setScoringTimedOut(false);
    pollAttemptsRef.current = 0;

    function pollScore(id: string) {
      pollTimerRef.current = setTimeout(() => {
        if (cancelled) return;
        getPracticeSession(id)
          .then((s) => {
            if (cancelled || !s) return;
            setSession(s);
            if (s.overallScore !== null) {
              setScoring(false);
              setScoringTimedOut(false);
              if (wasScoring.current) {
                markScoringDone(id);
                wasScoring.current = false;
              }
              return;
            }
            pollAttemptsRef.current += 1;
            if (pollAttemptsRef.current < SCORE_POLL_MAX_ATTEMPTS) {
              pollScore(id);
            } else {
              // P4 fix: mark timed-out so the UI can show a retry button instead
              // of silently leaving the "score not available" text with no action.
              setScoring(false);
              setScoringTimedOut(true);
            }
          })
          .catch(() => {
            // Guard against a stale rejection from a superseded poll cycle
            // (e.g. the user navigated to a different session's feedback page
            // while this request was still in flight) clobbering the current
            // cycle's scoring state — same guard the .then() above already has.
            if (cancelled) return;
            setScoring(false);
            setScoringTimedOut(true);
          });
      }, SCORE_POLL_INTERVAL_MS);
    }

    getPracticeSession(sessionId)
      .then((s) => {
        if (cancelled) return;
        if (!s) {
          setError(true);
          return;
        }
        setSession(s);
        // Show whatever was captured live in this tab immediately, then hydrate
        // from the persisted GET .../feedback endpoint (works across tabs/devices,
        // and also carries the overall aiInsight the inline capture never has).
        setFeedback(readAnswerEvaluations(s.id));
        getSessionFeedback(s.id).then((fb) => {
          if (cancelled || !fb) return;
          if (Object.keys(fb.evaluations).length > 0) setFeedback(fb.evaluations);
          setAiInsight(fb.aiInsight);
          setAccessLevel(fb.accessLevel);
          if (fb.overallScore !== null) {
            setSession((prev) => (prev ? { ...prev, overallScore: fb.overallScore } : prev));
          }
        });
        if (s.overallScore === null) {
          wasScoring.current = true;
          setScoring(true);
          registerScoringSession(s.id, "");
          pollScore(s.id);
        } else {
          // Score already computed — remove any stale badge entry immediately
          removeScoringEntry(s.id);
        }
        if (s.questionSetId) {
          getQuestionSetById(s.questionSetId)
            .then((qs) => {
              if (!cancelled) {
                setSet(qs);
                // Only update badge title when scoring is still in progress —
                // if score was already available, the badge was already removed above.
                if (qs?.title && s.overallScore === null) registerScoringSession(s.id, qs.title);
              }
            })
            .catch(() => {
              // Non-critical — header just omits title/company.
            });

          // Find the most recent OTHER completed+scored attempt of this same
          // question set to power a "vs. last attempt" comparison — null when
          // this is the only attempt, so the UI can say so honestly.
          listCompletedSessions({ pageSize: 50 })
            .then((res) => {
              if (cancelled) return;
              const prior = res.items
                .filter((item) => item.questionSetId === s.questionSetId && item.id !== s.id && item.score !== null)
                .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime())[0];
              setPreviousScore(prior?.score ?? null);
            })
            .catch(() => setPreviousScore(null));
        } else {
          setPreviousScore(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ForbiddenError) setForbidden(true);
        else setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      pollCancelledRef.current = true;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [sessionId, reloadKey]);

  /** P4: Re-start score polling without navigating or re-fetching the full page. */
  function retryScoring() {
    if (!session) return;
    setScoringTimedOut(false);
    setScoring(true);
    pollAttemptsRef.current = 0;
    wasScoring.current = true;
    pollCancelledRef.current = false;
    registerScoringSession(session.id, set?.title ?? "");
    // Inline poll: re-uses the same sessionId from the outer effect's closure via the ref.
    function doPoll(id: string) {
      pollTimerRef.current = setTimeout(() => {
        if (pollCancelledRef.current) return;
        getPracticeSession(id)
          .then((s) => {
            if (pollCancelledRef.current || !s) return;
            setSession(s);
            if (s.overallScore !== null) {
              setScoring(false);
              setScoringTimedOut(false);
              markScoringDone(id);
              wasScoring.current = false;
              return;
            }
            pollAttemptsRef.current += 1;
            if (pollAttemptsRef.current < SCORE_POLL_MAX_ATTEMPTS) {
              doPoll(id);
            } else {
              setScoring(false);
              setScoringTimedOut(true);
            }
          })
          .catch(() => {
            // Same guard as the .then() above — a stale rejection from a
            // cancelled/superseded retry cycle must not touch current state.
            if (pollCancelledRef.current) return;
            setScoring(false);
            setScoringTimedOut(true);
          });
      }, SCORE_POLL_INTERVAL_MS);
    }
    doPoll(session.id);
  }

  return (
    <JobseekerAppShell
      pageTitle={p.pageTitle}
      fullWidth
      breadcrumb={[
        { label: "jobseeker", href: "/candidate/dashboard" },
        { label: "history", href: "/candidate/history" },
        { label: "feedback" },
      ]}
    >
      {loading && (
        /* Centre within the content pane (sidebar is w-62.5 = 250 px on lg+) */
        <div className="fixed inset-0 lg:left-62.5 flex items-center justify-center z-10 pointer-events-none">
          <AiLoadingSpinner text={p.loadingFeedback} subtext={p.loadingFeedbackSub} />
        </div>
      )}

      {!loading && forbidden && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Lock size={28} className="text-gray-400 dark:text-gray-500" />
          <p className={cn("text-[14px]", portalSubtextAlt)}>{p.feedbackForbidden}</p>
        </div>
      )}

      {!loading && !forbidden && error && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className={cn("text-[14px]", portalSubtextAlt)}>{p.feedbackLoadFailed}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline"
          >
            <RefreshCw size={13} />
            {p.retryLoadBtn}
          </button>
        </div>
      )}

      {!loading && !error && !forbidden && session && (
        <>
          <FeedbackPage
            session={session}
            feedback={feedback}
            aiInsight={aiInsight}
            accessLevel={accessLevel}
            scoring={scoring}
            scoringTimedOut={scoringTimedOut}
            onRetryScore={retryScoring}
            setTitle={set ? cleanTitle(set.title) : undefined}
            companyName={set?.company}
            companyLogoUrl={set?.companyLogoUrl}
            previousScore={previousScore}
            xpReward={xpReward}
          />

          {/* Rating dialog — shows once after completion if no prior feedback.
              Hidden for drill sets and AI Coach-generated sets. */}
          {session.questionSetId &&
            !/^drill\b/i.test(set?.title?.trim() ?? "") &&
            !isCoachGeneratedSetId(session.questionSetId) && (
            <QuestionSetFeedbackDialog
              open={showFeedbackDialog}
              questionSetId={session.questionSetId}
              questionSetTitle={set ? cleanTitle(set.title) : undefined}
              onClose={() => setShowFeedbackDialog(false)}
              onSubmitted={() => setShowFeedbackDialog(false)}
            />
          )}
        </>
      )}
    </JobseekerAppShell>
  );
}
