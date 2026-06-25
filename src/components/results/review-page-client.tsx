"use client";

import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
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
}

export function ReviewPageClient({ session, draftQuestions, isDraftView = false }: ReviewPageClientProps) {
  const { t } = useLanguage();
  const rp = t.reviewPage;
  const gsp = t.generationSessionPage;

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

      {/* Review questions section */}
      <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
        <ReviewQuestionsSection
          sessionId={session.id}
          initialQuestions={draftQuestions ?? session.generatedQuestions ?? []}
          status={session.status}
          failureMessage={session.failureMessage}
          readOnly={isDraftView}
        />
      </div>
    </div>
  );
}
