"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, Sparkles, ArrowRight, Pencil, Check, X, Loader2, Bookmark, Users } from "lucide-react";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { SessionStatusBadge } from "@/features/interview/components/history/session-status-badge";
import { ReviewQuestionsSection } from "@/features/question/components/review-questions-section.lazy";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { cn } from "@/lib/cn";
import { portalHeading, portalInput, portalSubtext } from "@/shared/utils/portal-ui";
import { getHrBookmarkedSetIds, toggleHrBookmark } from "@/features/interview/services/interview.service";
import { JdFitReviewPanel } from "@/features/hr/components/question-sets/jd-fit-review-panel";
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
  onRenameTitle?: (title: string) => Promise<boolean>;
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
  onRenameTitle,
}: ReviewPageClientProps) {
  const { t } = useLanguage();
  const rp = t.reviewPage;
  const gsp = t.generationSessionPage;
  const router = useRouter();
  const { addToast } = useToast();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(session.jobTitle);
  const [savingTitle, setSavingTitle] = useState(false);

  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);

  useEffect(() => {
    if (!questionSetId) return;
    let cancelled = false;
    getHrBookmarkedSetIds().then((ids) => {
      if (!cancelled) setBookmarked(ids.has(questionSetId));
    });
    return () => { cancelled = true; };
  }, [questionSetId]);

  async function handleToggleBookmark() {
    if (!questionSetId || bookmarkBusy) return;
    setBookmarkBusy(true);
    try {
      const next = await toggleHrBookmark(questionSetId);
      setBookmarked(next);
      addToast("success", next ? rp.bookmarkAdded : rp.bookmarkRemoved);
    } catch {
      addToast("error", rp.bookmarkFailed);
    } finally {
      setBookmarkBusy(false);
    }
  }

  function startEditTitle() {
    setTitleValue(session.jobTitle);
    setEditingTitle(true);
  }

  function cancelEditTitle() {
    setEditingTitle(false);
    setTitleValue(session.jobTitle);
  }

  async function saveTitle() {
    const next = titleValue.trim();
    if (!next || next === session.jobTitle || !onRenameTitle || savingTitle) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    const ok = await onRenameTitle(next);
    setSavingTitle(false);
    if (ok) setEditingTitle(false);
  }

  function continueToGenerate() {
    localStorage.setItem("hr_gen_job", session.id);
    localStorage.setItem("hr_gen_view", "plan_review");
    if (session.planDraft) {
      localStorage.setItem("hr_gen_plan", JSON.stringify(session.planDraft));
    }
    router.push("/hr/generate-question");
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
          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveTitle();
                    if (e.key === "Escape") cancelEditTitle();
                  }}
                  disabled={savingTitle}
                  maxLength={500}
                  className={cn(
                    "text-xl font-bold rounded-lg px-2.5 py-1 outline-none focus:border-primary max-w-md",
                    portalInput
                  )}
                />
                <button
                  type="button"
                  onClick={() => void saveTitle()}
                  disabled={savingTitle || !titleValue.trim()}
                  title={rp.questionActions.save}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
                >
                  {savingTitle ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button
                  type="button"
                  onClick={cancelEditTitle}
                  disabled={savingTitle}
                  title={rp.questionActions.cancel}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className={cn("text-2xl font-bold truncate", portalHeading)}>{session.jobTitle}</h2>
                {onRenameTitle && (
                  <button
                    type="button"
                    onClick={startEditTitle}
                    title={rp.renameTitleBtn}
                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            )}
            <p className={cn("text-sm mt-1", portalSubtext)}>{rp.subtext}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {questionSetId && (
              <Link
                href="#jd-fit-review"
                title={rp.jdFit.title}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <Sparkles size={14} />
              </Link>
            )}
            {questionSetId && (
              <Link
                href={`/hr/question-sets/${questionSetId}/practitioners`}
                title={t.practitionersPage.heading}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <Users size={14} />
              </Link>
            )}
            {questionSetId && (
              <button
                type="button"
                onClick={() => void handleToggleBookmark()}
                disabled={bookmarkBusy}
                title={bookmarked ? rp.bookmarkRemoveTitle : rp.bookmarkAddTitle}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-40",
                  bookmarked
                    ? "text-amber-500 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
                    : "text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                )}
              >
                {bookmarkBusy
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Bookmark size={14} fill={bookmarked ? "currentColor" : "none"} />}
              </button>
            )}
            <SessionStatusBadge status={session.status} size="md" />
            {session.isFromStudio && (
              <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#6c47ff]/10 text-[#6c47ff]">
                Studio
              </span>
            )}
          </div>
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
              {[...new Set(session.planDraft.questionTypes)].map((qt) => (
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

      {questionSetId && (
        <div id="jd-fit-review" className="animate-fade-up" style={{ animationDelay: "70ms" }}>
          <Suspense fallback={null}>
            <JdFitSection questionSetId={questionSetId} />
          </Suspense>
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
            isFromStudio={session.isFromStudio}
          />
        </div>
      )}
    </div>
  );
}

function JdFitSection({ questionSetId }: { questionSetId: string }) {
  const searchParams = useSearchParams();
  const autoRun = searchParams.get("jdFit") === "1";
  return <JdFitReviewPanel questionSetId={questionSetId} autoRun={autoRun} />;
}
