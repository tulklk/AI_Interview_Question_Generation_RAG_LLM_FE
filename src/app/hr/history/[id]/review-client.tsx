"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { ReviewPageClient } from "@/features/question/components/review-page-client";
import { getGenerationSession, getGenerationJob, getJobQuestions, getDraft } from "@/features/interview/services/interview.service";
import { getLocalSession, toGenerationSession } from "@/features/interview/utils/local-history";
import type { GenerationSession, DraftQuestionSet, GenerationStatus } from "@/features/interview/types/generation-session";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

const QUESTION_GENERATING_STATUSES: GenerationStatus[] = [
  "CONFIRMED", "QUEUED", "QUESTION_QUEUED", "QUESTION_PROCESSING", "PROCESSING",
];

function isGeneratingQuestions(status: GenerationStatus): boolean {
  return QUESTION_GENERATING_STATUSES.includes(status);
}

// Statuses that belong in the Generate wizard, not the history review page
const GENERATE_WIZARD_STATUSES = new Set<string>([
  "PLAN_PROPOSED", "DRAFT",
  "QUEUED", "PROCESSING", "PLAN_QUEUED",
  "CONFIRMED", "QUESTION_QUEUED", "QUESTION_PROCESSING",
  "FAILED",
]);

function redirectToGenerate(job: GenerationSession, router: ReturnType<typeof useRouter>) {
  const status = job.status as string;
  let view = "polling";
  let phase = "plan";

  if (status === "PLAN_PROPOSED") {
    view = "plan_review"; phase = "plan";
  } else if (status === "DRAFT") {
    view = "draft_view"; phase = "questions";
  } else if (["CONFIRMED", "QUESTION_QUEUED", "QUESTION_PROCESSING"].includes(status)) {
    view = "polling"; phase = "questions";
  } else if (["QUEUED", "PROCESSING", "PLAN_QUEUED"].includes(status)) {
    view = "polling"; phase = "plan";
  } else if (status === "FAILED") {
    view = "failed"; phase = job.planDraft ? "questions" : "plan";
  } else {
    // COMPLETED with no questions yet
    view = "polling"; phase = "questions";
  }

  localStorage.setItem("hr_gen_job",           job.id);
  localStorage.setItem("hr_gen_view",          view);
  localStorage.setItem("hr_gen_polling_phase", phase);
  if (job.planDraft) {
    localStorage.setItem("hr_gen_plan", JSON.stringify(job.planDraft));
  }
  router.replace("/hr/generate");
}

export function HrReviewPageClient() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const router = useRouter();
  const { t } = useLanguage();
  const rp = t.reviewPage;
  const [session, setSession] = useState<GenerationSession | null>(null);
  const [draft, setDraft] = useState<DraftQuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingActiveRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadJob(jobId: string): Promise<GenerationSession | null> {
    const job = await getGenerationJob(jobId);
    if (!job) return getGenerationSession(jobId);

    if (job.status === "COMPLETED") {
      // Primary: questions endpoint
      const qs = await getJobQuestions(jobId);
      if (qs.length > 0) return { ...job, generatedQuestions: qs };

      // Fallback 1: inline questions from job GET response (filter out stubs)
      const inlineQs = (job.generatedQuestions ?? []).filter(q => q.question.trim() !== "");
      if (inlineQs.length > 0) return { ...job, generatedQuestions: inlineQs };

      // Fallback 2: draft endpoint (try even if hasDraft is not set, questionSetId may exist)
      const qSetId = job.questionSetId;
      if (qSetId) {
        const d = await getDraft(qSetId);
        if (d?.questions && d.questions.length > 0) {
          setDraft(d);
          return job;
        }
      }

      // Return job as-is — empty questions will trigger retry flow
      return job;
    }

    if (job.hasDraft && job.questionSetId) {
      const d = await getDraft(job.questionSetId);
      if (d) setDraft(d);
    }

    return job;
  }

  function scheduleNextPoll(jobId: string) {
    if (!pollingActiveRef.current) return;
    pollingRef.current = setTimeout(async () => {
      try {
        const updated = await loadJob(jobId);
        if (!updated || !pollingActiveRef.current) return;
        setSession(updated);
        if (isGeneratingQuestions(updated.status)) {
          scheduleNextPoll(jobId);
        }
      } catch {
        if (pollingActiveRef.current) scheduleNextPoll(jobId);
      }
    }, 3000);
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    pollingActiveRef.current = true;

    if (id.startsWith("local-")) {
      const local = getLocalSession(id);
      if (local) setSession(toGenerationSession(local));
      else setError("Session not found.");
      setLoading(false);
      return;
    }

    function hasQuestions(job: GenerationSession): boolean {
      const qs = job.generatedQuestions ?? [];
      return qs.some(q => q.question.trim() !== "");
    }

    loadJob(id)
      .then((job) => {
        if (!job) { setError(rp.sessionNotFound); return; }

        // Sessions that belong in the Generate wizard → redirect immediately
        if (GENERATE_WIZARD_STATUSES.has(job.status as string)) {
          redirectToGenerate(job, router);
          return;
        }

        // COMPLETED but 0 questions — try once more (BE may still be saving)
        if (job.status === "COMPLETED" && !hasQuestions(job)) {
          setRetrying(true);
          retryTimerRef.current = setTimeout(async () => {
            try {
              const updated = await loadJob(id);
              if (!updated) return;
              // After retry: if still no questions, go to generate polling
              if (!hasQuestions(updated)) {
                redirectToGenerate(updated, router);
                return;
              }
              setSession(updated);
            } catch { /* silent */ } finally {
              setRetrying(false);
            }
          }, 2500);
          setSession(job);
          return;
        }

        setSession(job);
        if (isGeneratingQuestions(job.status)) {
          scheduleNextPoll(id);
        }
      })
      .catch(() => setError(rp.sessionLoadFailed))
      .finally(() => setLoading(false));

    return () => {
      pollingActiveRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <AppShell
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: rp.breadcrumbHistory, href: "/hr/history" },
        { label: rp.breadcrumbReview },
      ]}
      pageTitle={rp.breadcrumbReview}
    >
      {loading && (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
            <Loader2 size={26} className="animate-spin text-[#7C3AED] dark:text-[#a78bff]" />
          </div>
          <div className="text-center">
            <p className={cn("text-sm font-semibold", portalHeading)}>{rp.loadingSession}</p>
            <p className={cn("text-xs mt-1", portalSubtext)}>{rp.loadingSessionSub}</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 max-w-lg">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className={cn("text-sm font-medium", portalHeading)}>{error}</p>
        </div>
      )}

      {!loading && !error && session && (
        <ReviewPageClient
          session={session}
          draftQuestions={draft?.questions}
          isDraftView={!!draft}
          isGenerating={isGeneratingQuestions(session.status)}
          isRetrying={retrying}
        />
      )}
    </AppShell>
  );
}
