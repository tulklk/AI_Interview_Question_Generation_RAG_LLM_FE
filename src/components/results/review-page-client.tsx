"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { SessionStatusBadge } from "@/components/history/session-status-badge";
import { ReviewQuestionsSection } from "@/components/results/review-questions-section";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";
import type { GenerationSession, GeneratedQuestion } from "@/types/generation-session";

interface ReviewPageClientProps {
  session: GenerationSession;
  draftQuestions?: GeneratedQuestion[];
  isDraftView?: boolean;
  isGenerating?: boolean;
  isRetrying?: boolean;
}

export function ReviewPageClient({ session, draftQuestions, isDraftView = false, isGenerating = false, isRetrying = false }: ReviewPageClientProps) {
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
                  className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#6c47ff]/10 text-[#6c47ff]"
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
          className="animate-fade-up rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-5 py-4 flex items-center justify-between gap-4"
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors shrink-0"
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

      {/* Draft saved banner */}
      {isDraftView && (
        <div
          className="animate-fade-up rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3"
          style={{ animationDelay: "90ms" }}
        >
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Bản nháp đã lưu — chỉ xem
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
            Câu hỏi đã được lưu thành công. Để chỉnh sửa, hãy tạo phiên mới.
          </p>
        </div>
      )}

      {/* Loading animation while generating questions */}
      {isGenerating && (
        <div
          className="animate-fade-up rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 flex flex-col items-center justify-center gap-5"
          style={{ animationDelay: "120ms" }}
        >
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-violet-100 dark:bg-violet-950/40 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={28} className="text-violet-600 dark:text-violet-400" />
            </div>
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="175"
                strokeLinecap="round"
                className="text-violet-500 dark:text-violet-400 origin-center animate-[spin_2s_linear_infinite]"
                style={{ strokeDashoffset: "44" }}
              />
            </svg>
          </div>
          <div className="text-center">
            <p className={cn("text-base font-semibold", portalHeading)}>
              AI đang tạo câu hỏi phỏng vấn...
            </p>
            <p className={cn("text-sm mt-1.5", portalSubtext)}>
              Câu hỏi sẽ tự động hiển thị khi hoàn thành. Vui lòng chờ.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Retrying: COMPLETED but 0 questions — show brief spinner */}
      {isRetrying && !isGenerating && session.status !== "PLAN_PROPOSED" && (
        <div
          className="animate-fade-up rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-8 flex items-center gap-4"
          style={{ animationDelay: "120ms" }}
        >
          <Loader2 size={20} className="animate-spin text-violet-500 shrink-0" />
          <div>
            <p className={cn("text-sm font-semibold", portalHeading)}>{rp.loadingQuestionsTitle}</p>
            <p className={cn("text-xs mt-0.5", portalSubtext)}>{rp.loadingQuestionsSubtext}</p>
          </div>
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
            readOnly={isDraftView}
          />
        </div>
      )}
    </div>
  );
}
