"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { FeedbackPage } from "./feedback-page";
import {
  getPracticeSession,
  readAnswerEvaluations,
  ForbiddenError,
  type PracticeSessionDetail,
  type AnswerEvaluation,
} from "@/features/candidate/services/practice-session.service";
import { getQuestionSetById } from "@/features/candidate/services/question-set.service";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtextAlt } from "@/shared/utils/portal-ui";
import { registerScoringSession, markScoringDone, removeScoringEntry } from "@/features/candidate/components/ui/scoring-progress-badge";

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
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const pollAttemptsRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether scoring was ever in progress (for localStorage update on done)
  const wasScoring = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setForbidden(false);
    setSet(null);
    setFeedback({});
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
              setScoring(false);
            }
          })
          .catch(() => setScoring(false));
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
        // Per-question AI evaluation only ever arrives inline in the submit-answer
        // response (captured live during the session) — read whatever was saved.
        setFeedback(readAnswerEvaluations(s.id));
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
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [sessionId, reloadKey]);

  return (
    <JobseekerAppShell
      pageTitle="AI Feedback"
      fullWidth
      breadcrumb={[
        { label: "Jobseeker", href: "/jobseeker/dashboard" },
        { label: "History", href: "/jobseeker/history" },
        { label: "Feedback" },
      ]}
    >
      {loading && (
        <div className="py-20 flex items-center justify-center">
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
        <FeedbackPage session={session} feedback={feedback} scoring={scoring} setTitle={set?.title} companyName={set?.company} />
      )}
    </JobseekerAppShell>
  );
}
