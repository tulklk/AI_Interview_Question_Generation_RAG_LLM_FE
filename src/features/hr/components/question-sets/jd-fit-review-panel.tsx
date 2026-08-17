"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalHeading, portalInput, portalSubtext } from "@/shared/utils/portal-ui";
import {
  getQuestionSetJdFit,
  reviewQuestionSetJdFit,
  saveQuestionSetJdText,
  uploadQuestionSetJdFile,
  type JdFitActionType,
  type JdFitFlag,
  type JdFitReview,
  type JdFitVerdict,
} from "@/features/hr/services/hr-jd-fit.service";

const VERDICT_CLASS: Record<JdFitVerdict, string> = {
  unfit: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  fair: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  good: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  excellent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
};

const FLAG_CLASS: Record<JdFitFlag, string> = {
  onJd: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  weak: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  offJd: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  duplicate: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

interface JdFitReviewPanelProps {
  questionSetId: string;
  autoRun?: boolean;
}

export function JdFitReviewPanel({ questionSetId, autoRun = false }: JdFitReviewPanelProps) {
  const { t, lang } = useLanguage();
  const p = t.reviewPage.jdFit;
  const { addToast } = useToast();
  const [open, setOpen] = useState(autoRun);
  const [loadingCache, setLoadingCache] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<JdFitReview | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [hasJobDescription, setHasJobDescription] = useState(true);
  const [showJdForm, setShowJdForm] = useState(false);
  const [jdText, setJdText] = useState("");
  const [savingJd, setSavingJd] = useState(false);

  const applyEnvelope = useCallback(
    (env: { review: JdFitReview | null; reviewedAt: string | null; isStale: boolean; hasJobDescription: boolean }, expand: boolean) => {
      setReview(env.review);
      setReviewedAt(env.reviewedAt);
      setIsStale(env.isStale);
      setHasJobDescription(env.hasJobDescription);
      if (!env.hasJobDescription) setShowJdForm(true);
      if (expand && env.review) setOpen(true);
    },
    []
  );

  const loadCache = useCallback(async () => {
    setLoadingCache(true);
    setError(null);
    try {
      const env = await getQuestionSetJdFit(questionSetId);
      applyEnvelope(env, autoRun || !!env.review);
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : p.failed;
      setError(msg);
    } finally {
      setLoadingCache(false);
    }
  }, [questionSetId, autoRun, applyEnvelope, p.failed]);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const env = await reviewQuestionSetJdFit(questionSetId);
      applyEnvelope(env, true);
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : p.failed;
      setError(msg);
      addToast("error", msg);
    } finally {
      setRunning(false);
    }
  }, [questionSetId, addToast, p.failed, applyEnvelope]);

  const saveJd = useCallback(async () => {
    const text = jdText.trim();
    if (!text) {
      addToast("error", p.jdRequired);
      return;
    }
    setSavingJd(true);
    setError(null);
    try {
      await saveQuestionSetJdText(questionSetId, text);
      setHasJobDescription(true);
      setShowJdForm(false);
      addToast("success", p.jdSaved);
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : p.jdSaveFailed;
      setError(msg);
      addToast("error", msg);
    } finally {
      setSavingJd(false);
    }
  }, [jdText, questionSetId, addToast, p.jdRequired, p.jdSaved, p.jdSaveFailed]);

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setSavingJd(true);
    setError(null);
    try {
      await uploadQuestionSetJdFile(questionSetId, file);
      setHasJobDescription(true);
      setShowJdForm(false);
      addToast("success", p.jdSaved);
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : p.jdSaveFailed;
      setError(msg);
      addToast("error", msg);
    } finally {
      setSavingJd(false);
    }
  }

  useEffect(() => {
    void loadCache();
  }, [loadCache]);

  function scrollToQuestion(questionId: string | null) {
    if (!questionId) return;
    document.getElementById(`jd-fit-q-${questionId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const flagLabel = (flag: JdFitFlag) => p.flags[flag];
  const actionLabel = (type: JdFitActionType) => p.actions[type];
  const note = (vi: string | null, en: string | null) => (lang === "vi" ? vi : en) || vi || en || "";
  const reviewedLabel = reviewedAt
    ? new Date(reviewedAt).toLocaleString(lang === "vi" ? "vi-VN" : "en-US")
    : null;

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={cn("text-sm font-semibold", portalHeading)}>{p.title}</p>
          <p className={cn("text-xs mt-0.5", portalSubtext)}>{p.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running || loadingCache || savingJd || !hasJobDescription}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold text-white hr-cta-btn disabled:opacity-50"
        >
          {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {running ? p.running : review ? p.rerun : p.run}
        </button>
      </div>

      {!loadingCache && (showJdForm || !hasJobDescription) && (
        <div className="mt-4 space-y-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20 p-3">
          <p className="text-[13px] text-amber-800 dark:text-amber-300">{p.jdMissingHint}</p>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={6}
            placeholder={p.jdPastePlaceholder}
            className={cn("w-full text-[13px] rounded-lg px-3 py-2", portalInput)}
            disabled={savingJd}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void saveJd()}
              disabled={savingJd}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold text-white hr-cta-btn disabled:opacity-50"
            >
              {savingJd ? <Loader2 size={14} className="animate-spin" /> : null}
              {p.jdSaveText}
            </button>
            <label className={cn("inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold border cursor-pointer", portalSubtext)}>
              <Upload size={14} />
              {p.jdUploadFile}
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf"
                className="hidden"
                disabled={savingJd}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  void onPickFile(file);
                }}
              />
            </label>
            {hasJobDescription && (
              <button type="button" onClick={() => setShowJdForm(false)} className="text-[12px] font-semibold hover:underline">
                {p.jdCancel}
              </button>
            )}
          </div>
        </div>
      )}

      {hasJobDescription && !showJdForm && !loadingCache && (
        <button
          type="button"
          onClick={() => setShowJdForm(true)}
          className={cn("mt-2 text-[12px] font-semibold hover:underline", portalSubtext)}
        >
          {p.jdReplace}
        </button>
      )}

      {loadingCache && (
        <p className={cn("text-sm mt-4 flex items-center gap-2", portalSubtext)}>
          <Loader2 size={14} className="animate-spin" /> {p.loadingCache}
        </p>
      )}

      {running && (
        <p className={cn("text-sm mt-4 flex items-center gap-2", portalSubtext)}>
          <Loader2 size={14} className="animate-spin" /> {p.runningHint}
        </p>
      )}

      {error && !running && !loadingCache && (
        <div className="mt-4 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            <button type="button" onClick={() => void (hasJobDescription ? run() : setShowJdForm(true))} className="mt-1 inline-flex items-center gap-1 font-semibold hover:underline">
              <RefreshCw size={12} /> {p.retry}
            </button>
          </div>
        </div>
      )}

      {open && review && !running && !loadingCache && (
        <div className="mt-4 space-y-4">
          {isStale && (
            <p className="text-[13px] rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-3 py-2">
              {p.stale}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-[12px] font-bold px-2.5 py-1 rounded-full", VERDICT_CLASS[review.verdict])}>
              {p.verdicts[review.verdict]}
            </span>
            {reviewedLabel && (
              <span className={cn("text-[11px]", portalSubtext)}>
                {p.reviewedAt}: {reviewedLabel}
              </span>
            )}
          </div>
          <p className={cn("text-sm leading-relaxed", portalHeading)}>
            {lang === "vi" ? review.summaryVi : review.summaryEn}
          </p>

          {review.jdSources.length > 0 && (
            <div>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wide mb-1.5", portalSubtext)}>
                {p.sourcesTitle}
              </p>
              <ul className="space-y-1.5">
                {review.jdSources.map((s) => (
                  <li
                    key={`jd-${s.chunkIndex}`}
                    className="text-[12px] rounded-md border border-gray-100 dark:border-gray-800 px-2.5 py-1.5"
                  >
                    <span className={cn("text-[10px] font-semibold", portalSubtext)}>
                      {p.sourceChunk.replace("{{n}}", String(s.chunkIndex))}
                    </span>
                    <p className={cn("mt-0.5 italic leading-relaxed", portalHeading)}>{`“${s.excerpt}”`}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.missingTopics.length > 0 && (
            <div>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wide mb-1.5", portalSubtext)}>
                {p.missingTitle}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {review.missingTopics.map((topic) => (
                  <li key={topic} className="text-[12px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.questionFlags.length > 0 && (
            <div>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wide mb-1.5", portalSubtext)}>
                {p.questionsTitle}
              </p>
              <ul className="space-y-2">
                {review.questionFlags.map((f, i) => (
                  <li key={`${f.questionId ?? i}-${f.flag}`}>
                    <button
                      type="button"
                      onClick={() => scrollToQuestion(f.questionId)}
                      className="w-full text-left rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 hover:border-primary/40 transition-colors"
                    >
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", FLAG_CLASS[f.flag])}>
                        {flagLabel(f.flag)}
                      </span>
                      {f.order != null && (
                        <span className={cn("ml-2 text-[11px]", portalSubtext)}>#{f.order}</span>
                      )}
                      <p className={cn("text-[13px] mt-1", portalHeading)}>{note(f.noteVi, f.noteEn)}</p>
                      {f.sources.slice(0, 2).map((s) => (
                        <p key={`${f.questionId}-${s.chunkIndex}`} className={cn("text-[11px] mt-1.5 italic", portalSubtext)}>
                          {p.sourceChunk.replace("{{n}}", String(s.chunkIndex))}: {`“${s.excerpt}”`}
                        </p>
                      ))}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.suggestedActions.length > 0 && (
            <div>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wide mb-1.5", portalSubtext)}>
                {p.suggestionsTitle}
              </p>
              <ul className="space-y-1.5">
                {review.suggestedActions.map((a, i) => (
                  <li key={`${a.type}-${a.questionId ?? i}`} className={cn("text-[13px]", portalHeading)}>
                    <span className="font-semibold">{actionLabel(a.type)}</span>
                    {" — "}
                    {note(a.reasonVi, a.reasonEn)}
                  </li>
                ))}
              </ul>
              <p className={cn("text-[11px] mt-2", portalSubtext)}>{p.noAutoFix}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
