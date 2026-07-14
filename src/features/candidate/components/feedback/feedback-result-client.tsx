"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { FeedbackPage } from "./feedback-page";
import {
  getPracticeFeedback,
  FeedbackNotReadyError,
  type PracticeFeedback,
} from "@/features/candidate/services/practice-session.service";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtextAlt } from "@/shared/utils/portal-ui";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10;

export function FeedbackResultClient() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id ?? "";
  const { t } = useLanguage();
  const p = t.jobseekerFeedbackPage;

  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    attemptsRef.current = 0;
    setLoading(true);
    setError(false);

    function attempt() {
      getPracticeFeedback(sessionId)
        .then((res) => {
          if (cancelled) return;
          setFeedback(res);
          setLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          attemptsRef.current += 1;
          if (err instanceof FeedbackNotReadyError && attemptsRef.current < MAX_POLL_ATTEMPTS) {
            timerRef.current = setTimeout(attempt, POLL_INTERVAL_MS);
            return;
          }
          setError(true);
          setLoading(false);
        });
    }

    attempt();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionId, reloadKey]);

  return (
    <JobseekerAppShell
      pageTitle="AI Feedback"
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

      {!loading && error && (
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

      {!loading && !error && feedback && <FeedbackPage session={feedback} />}
    </JobseekerAppShell>
  );
}
