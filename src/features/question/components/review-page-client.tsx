"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Sparkles, ArrowRight } from "lucide-react";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { SessionStatusBadge } from "@/features/interview/components/history/session-status-badge";
import { ReviewQuestionsSection } from "@/features/question/components/review-questions-section";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type { GenerationSession, GeneratedQuestion } from "@/features/interview/types/generation-session";

interface ReviewPageClientProps {
  session: GenerationSession;
  draftQuestions?: GeneratedQuestion[];
  isGenerating?: boolean;
  isRetrying?: boolean;
  questionSetId?: string;
  publishStatus?: "DRAFT" | "PUBLISHED" | null;
  onPublishStatusChange?: (status: "DRAFT" | "PUBLISHED") => void;
  onDraftSaved?: (questionSetId: string) => void;
  initialTimeLimitMinutes?: number | null;
}

export function ReviewPageClient({
  session,
  draftQuestions,
  isGenerating = false,
  isRetrying = false,
  questionSetId,
  publishStatus,
  onPublishStatusChange,
  onDraftSaved,
  initialTimeLimitMinutes,
}: ReviewPageClientProps) {
  const { t } = useLanguage();
  const rp = t.reviewPage;
  const gsp = t.generationSessionPage;
  const router = useRouter();

  function continueToGenerate() {
    localStorage.setItem("hr_gen_job", session.id);
    localStorage.setItem("hr_gen_view", "plan_review");
    if (session.planDraft) {
      localStorage.setItem("hr_gen_plan", JSON.stringify(session.planDraft));
    }
    router.push("/hr/generate");
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="animate-fade-up">
        <Link
          href="/hr/history"
          className={cn(
            "inline-flex items-center gap-1.5 text-sm transition-colors mb-3 hover:text-gray-700 dark:hover:text-gray-300",
            portalSubtext
          )}
        >
          <ArrowLeft size={14} />
          {rp.backToHistory}
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className={cn("text-2xl font-bold", portalHeading)}>{session.jobTitle}</h2>
            <p className={cn("text-sm mt-1", portalSubtext)}>{rp.subtext}</p>
          </div>
          <SessionStatusBadge status={session.status} size="md" />
        </div>
      </div>

      {/* Plan summary */}
      {session.planDraft && (
        <div
          className="animate-fade-up rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
          style={{ animationDelay: "60ms" }}
        >
          <p className={cn("text-xs font-semibold uppercase tracking-wide mb-3", portalSubtext)}>
            Interview Plan
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className={cn("text-xs font-semibold", portalSubtext)}>Role · </span>
              <span className={cn("font-medium", portalHeading)}>{session.planDraft.role}</span>
            </div>
            <div>
              <span className={cn("text-xs font-semibold", portalSubtext)}>Level · </span>
              <span className={cn("font-medium", portalHeading)}>{session.planDraft.level}</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {session.planDraft.questionTypes.map((qt) => (
                <span
                  key={qt}
                  className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary"
                >
                  {qt}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Plan proposed CTA */}
      {session.status === "PLAN_PROPOSED" && (
        <div
          className="animate-fade-up rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">
                {rp.planReadyTitle}
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                {rp.planReadySubtext}
              </p>
            </div>
          </div>
          <button
            onClick={continueToGenerate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors w-full sm:w-auto sm:shrink-0"
          >
            {rp.continuePlanReview}
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Error banner for failed sessions */}
      {session.status === "FAILED" && session.failureMessage && (
        <div
          className="animate-fade-up flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3"
          style={{ animationDelay: "80ms" }}
        >
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {gsp.errors.generationFailed}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {session.failureMessage}
            </p>
          </div>
        </div>
      )}

      {/* Loading animation while generating questions */}
      {isGenerating && (
        <div
          className="animate-fade-up rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-10"
          style={{ animationDelay: "120ms" }}
        >
          <AiLoadingSpinner
            text="AI đang tạo câu hỏi phỏng vấn..."
            subtext="Câu hỏi sẽ tự động hiển thị khi hoàn thành. Vui lòng chờ."
          />
        </div>
      )}

      {/* Retrying: COMPLETED but 0 questions — show brief spinner */}
      {isRetrying && !isGenerating && session.status !== "PLAN_PROPOSED" && (
        <div
          className="animate-fade-up rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8"
          style={{ animationDelay: "120ms" }}
        >
          <AiLoadingSpinner
            text={rp.loadingQuestionsTitle}
            subtext={rp.loadingQuestionsSubtext}
          />
        </div>
      )}

      {/* Review questions section — hidden when plan pending or actively generating or retrying */}
      {!isGenerating && !isRetrying && session.status !== "PLAN_PROPOSED" && (
        <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
          <ReviewQuestionsSection
            sessionId={session.id}
            initialQuestions={draftQuestions ?? session.generatedQuestions ?? []}
            status={session.status}
            failureMessage={session.failureMessage}
            questionSetId={questionSetId}
            publishStatus={publishStatus}
            onPublishStatusChange={onPublishStatusChange}
            onDraftSaved={onDraftSaved}
            initialTimeLimitMinutes={initialTimeLimitMinutes}
          />
        </div>
      )}
    </div>
  );
}
