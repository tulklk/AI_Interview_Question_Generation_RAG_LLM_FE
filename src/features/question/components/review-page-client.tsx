"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, Sparkles, Pencil, Check, X, Loader2, Bookmark, Users, Globe, PenLine, Clock, UserCheck } from "lucide-react";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { SessionStatusBadge } from "@/features/interview/components/history/session-status-badge";
import { ReviewQuestionsSection } from "@/features/question/components/review-questions-section.lazy";
import { QuestionSetInfoCard } from "@/features/question/components/question-set-info-card";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { cn } from "@/lib/cn";
import { portalHeading, portalInput, portalSubtext } from "@/shared/utils/portal-ui";
import { getHrBookmarkedSetIds, toggleHrBookmark, getDraft } from "@/features/interview/services/interview.service";
import { getJobDescription } from "@/features/studio/services/studio.service";
import { JdFitReviewPanel } from "@/features/hr/components/question-sets/jd-fit-review-panel";
import { JobDescriptionViewer } from "@/features/question/components/job-description-viewer";
import type { GenerationSession, GeneratedQuestion } from "@/features/interview/types/generation-session";

export type JdMetaUpdate = {
  content?: string | null;
  sourceType?: "PastedText" | "UploadedFile";
  fileName?: string | null;
};

interface ReviewPageClientProps {
  session: GenerationSession;
  draftQuestions?: GeneratedQuestion[];
  isGenerating?: boolean;
  isRetrying?: boolean;
  questionSetId?: string;
  /** JD đã lưu trên bộ — viewer cột trái. */
  jobDescription?: string | null;
  jdSourceType?: "PastedText" | "UploadedFile" | null;
  jdOriginalFileName?: string | null;
  sourceProjectId?: string | null;
  onJobDescriptionChange?: (next: JdMetaUpdate) => void;
  publishStatus?: "DRAFT" | "PUBLISHED" | null;
  onPublishStatusChange?: (status: "DRAFT" | "PUBLISHED") => void;
  onDraftSaved?: (questionSetId: string) => void;
  initialTimeLimitMinutes?: number | null;
  initialAutoRecommendEnabled?: boolean;
  initialRecommendationMinScore?: number;
  onRenameTitle?: (title: string) => Promise<boolean>;
}

export function ReviewPageClient({
  session,
  draftQuestions,
  isGenerating = false,
  isRetrying = false,
  questionSetId,
  jobDescription: jobDescriptionProp,
  jdSourceType: jdSourceTypeProp,
  jdOriginalFileName: jdFileNameProp,
  sourceProjectId,
  onJobDescriptionChange,
  publishStatus,
  onPublishStatusChange,
  onDraftSaved,
  initialTimeLimitMinutes,
  initialAutoRecommendEnabled,
  initialRecommendationMinScore,
  onRenameTitle,
}: ReviewPageClientProps) {
  const { t } = useLanguage();
  const rp = t.reviewPage;
  const gsp = t.generationSessionPage;
  const { addToast } = useToast();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(session.jobTitle);
  const [savingTitle, setSavingTitle] = useState(false);
  const [jobDescription, setJobDescription] = useState<string | null | undefined>(
    jobDescriptionProp ?? session.jdContent
  );
  const [jdSourceType, setJdSourceType] = useState<"PastedText" | "UploadedFile">(
    jdSourceTypeProp === "UploadedFile" ? "UploadedFile" : "PastedText"
  );
  const [jdOriginalFileName, setJdOriginalFileName] = useState<string | null>(
    jdFileNameProp ?? null
  );

  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);

  useEffect(() => {
    setJobDescription(jobDescriptionProp ?? session.jdContent);
    setJdSourceType(jdSourceTypeProp === "UploadedFile" ? "UploadedFile" : "PastedText");
    setJdOriginalFileName(jdFileNameProp ?? null);
  }, [jobDescriptionProp, session.jdContent, jdSourceTypeProp, jdFileNameProp]);

  // Bộ Save cũ thiếu meta file → fallback đọc Studio project
  useEffect(() => {
    if (!sourceProjectId) return;
    if (jdSourceTypeProp === "UploadedFile" && jdFileNameProp) return;
    let cancelled = false;
    (async () => {
      try {
        const studioJd = await getJobDescription(sourceProjectId);
        if (cancelled || !studioJd) return;
        if (studioJd.sourceType === "UploadedFile" && studioJd.originalFileName) {
          setJdSourceType("UploadedFile");
          setJdOriginalFileName(studioJd.originalFileName);
          if (!jobDescription && studioJd.content?.trim()) {
            setJobDescription(studioJd.content.trim());
          }
        }
      } catch {
        // Không chặn History nếu Studio JD không đọc được
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceProjectId, jdSourceTypeProp, jdFileNameProp, jobDescription]);

  useEffect(() => {
    if (!questionSetId) return;
    let cancelled = false;
    getHrBookmarkedSetIds().then((ids) => {
      if (!cancelled) setBookmarked(ids.has(questionSetId));
    });
    return () => { cancelled = true; };
  }, [questionSetId]);

  async function handleJdSaved(meta: JdMetaUpdate) {
    if (meta.content != null) {
      setJobDescription(meta.content);
      setJdSourceType(meta.sourceType === "UploadedFile" ? "UploadedFile" : "PastedText");
      setJdOriginalFileName(
        meta.sourceType === "UploadedFile" ? meta.fileName ?? null : null
      );
      onJobDescriptionChange?.(meta);
      return;
    }
    // Upload: giữ tên file ngay; refetch text + meta từ BE
    if (meta.sourceType === "UploadedFile" && meta.fileName) {
      setJdSourceType("UploadedFile");
      setJdOriginalFileName(meta.fileName);
    }
    if (!questionSetId) return;
    const refreshed = await getDraft(questionSetId);
    const nextContent = refreshed?.jobDescription ?? null;
    const nextType =
      refreshed?.jdSourceType === "UploadedFile" || meta.sourceType === "UploadedFile"
        ? "UploadedFile"
        : "PastedText";
    const nextFile =
      refreshed?.jdOriginalFileName ??
      (nextType === "UploadedFile" ? meta.fileName ?? null : null);
    setJobDescription(nextContent);
    setJdSourceType(nextType);
    setJdOriginalFileName(nextFile);
    onJobDescriptionChange?.({
      content: nextContent,
      sourceType: nextType,
      fileName: nextFile,
    });
  }

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

  const questionCount =
    draftQuestions?.length ?? session.generatedQuestions?.length ?? 0;
  const metaParts = [
    rp.questionCount.replace("{{count}}", String(questionCount)),
    initialTimeLimitMinutes != null
      ? rp.timeLimitLabel.replace("{{min}}", String(initialTimeLimitMinutes))
      : rp.noTimeLimitLabel,
    initialAutoRecommendEnabled
      ? rp.recSettingsLabelOn.replace(
          "{{score}}",
          String(initialRecommendationMinScore ?? 70)
        )
      : rp.recSettingsLabelOff,
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4 xl:space-y-5">
      {/* Unified page header */}
      <div className="animate-fade-up space-y-3">
        <Link
          href="/hr/history"
          className={cn(
            "inline-flex items-center gap-1.5 text-sm transition-colors hover:text-gray-700 dark:hover:text-gray-300",
            portalSubtext
          )}
        >
          <ArrowLeft size={14} />
          {rp.backToHistory}
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
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
                    "text-xl font-bold rounded-lg px-2.5 py-1 outline-none focus:border-primary max-w-md w-full",
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
              <div className="flex flex-wrap items-center gap-2 group">
                <h2 className={cn("text-xl sm:text-2xl font-bold break-words", portalHeading)}>
                  {session.jobTitle}
                </h2>
                {onRenameTitle && (
                  <button
                    type="button"
                    onClick={startEditTitle}
                    title={rp.renameTitleBtn}
                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                {publishStatus && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                      publishStatus === "PUBLISHED"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/50"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                    )}
                  >
                    {publishStatus === "PUBLISHED" ? <Globe size={11} /> : <PenLine size={11} />}
                    {publishStatus === "PUBLISHED" ? rp.statusPublished : rp.statusDraft}
                  </span>
                )}
                {session.isFromStudio && (
                  <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#6c47ff]/10 text-[#6c47ff]">
                    Studio
                  </span>
                )}
              </div>
            )}
            <p className={cn("text-sm", portalSubtext)}>{rp.subtext}</p>
            <p className={cn("text-xs flex flex-wrap items-center gap-x-1.5 gap-y-1", portalSubtext)}>
              {metaParts.map((part, i) => (
                <span key={part} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden className="text-gray-300 dark:text-gray-600">•</span>}
                  {i === 1 && <Clock size={11} className="opacity-70" aria-hidden />}
                  {i === 2 && <UserCheck size={11} className="opacity-70" aria-hidden />}
                  {part}
                </span>
              ))}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
          </div>
        </div>
      </div>

      {/* Plan summary */}
      {session.planDraft && (
        <div
          className="animate-fade-up rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
          style={{ animationDelay: "60ms" }}
        >
          <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2", portalSubtext)}>
            Interview Plan
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
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

      {/* Questions ~70% left · sticky sidebar ~30% right (JD + info) */}
      <div
        className={cn(
          "gap-4 xl:gap-5",
          questionSetId
            ? "flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:items-start"
            : "space-y-4"
        )}
      >
        <div className="min-w-0 order-2 xl:order-1 space-y-4">
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
                initialAutoRecommendEnabled={initialAutoRecommendEnabled}
                initialRecommendationMinScore={initialRecommendationMinScore}
                isFromStudio={session.isFromStudio}
              />
            </div>
          )}
        </div>

        {questionSetId && (
          <aside
            id="jd-fit-review"
            className="order-1 xl:order-2 w-full space-y-4 xl:sticky xl:top-24 xl:self-start"
            style={{ animationDelay: "70ms" }}
          >
            <QuestionSetInfoCard
              title={rp.setInfoTitle}
              rows={[
                {
                  label: rp.setInfoStatus,
                  value:
                    publishStatus === "PUBLISHED"
                      ? rp.statusPublished
                      : publishStatus === "DRAFT"
                        ? rp.statusDraft
                        : "—",
                },
                {
                  label: rp.setInfoQuestions,
                  value: String(questionCount),
                },
                {
                  label: rp.setInfoTimeLimit,
                  value:
                    initialTimeLimitMinutes != null
                      ? rp.timeLimitLabel.replace("{{min}}", String(initialTimeLimitMinutes))
                      : rp.noTimeLimitLabel,
                },
                {
                  label: rp.setInfoScore,
                  value: initialAutoRecommendEnabled
                    ? `≥ ${initialRecommendationMinScore ?? 70}`
                    : rp.recSettingsLabelOff,
                },
              ]}
            />
            <JobDescriptionViewer
              jobDescription={jobDescription}
              sourceType={jdSourceType}
              originalFileName={jdOriginalFileName}
              title={rp.jdViewer.title}
              emptyLabel={rp.jdViewer.empty}
              collapseLabel={rp.collapseJd}
              expandLabel={rp.viewFullJd}
              missingBadge={rp.jdViewer.missingBadge}
              statsTemplate={rp.jdViewer.stats}
              fromFileLabel={rp.jdViewer.fromFile}
              viewParsedLabel={rp.jdViewer.viewParsed}
              compactPreview
            />
            <Suspense fallback={null}>
              <JdFitSection
                questionSetId={questionSetId}
                onJobDescriptionSaved={(meta) => void handleJdSaved(meta)}
              />
            </Suspense>
          </aside>
        )}
      </div>
    </div>
  );
}

function JdFitSection({
  questionSetId,
  onJobDescriptionSaved,
}: {
  questionSetId: string;
  onJobDescriptionSaved?: (meta: JdMetaUpdate) => void;
}) {
  const searchParams = useSearchParams();
  const autoRun = searchParams.get("jdFit") === "1";
  return (
    <JdFitReviewPanel
      questionSetId={questionSetId}
      autoRun={autoRun}
      onJobDescriptionSaved={onJobDescriptionSaved}
    />
  );
}
