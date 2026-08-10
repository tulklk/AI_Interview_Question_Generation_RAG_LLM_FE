"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, Star, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import {
  submitQuestionSetFeedback,
} from "@/features/candidate/services/question-set.service";

interface QuestionSetFeedbackDialogProps {
  open: boolean;
  questionSetId: string;
  /** Shown in the dialog header for context */
  questionSetTitle?: string;
  onClose: () => void;
  /** Called after a successful submit */
  onSubmitted?: () => void;
}

export function QuestionSetFeedbackDialog({
  open,
  questionSetId,
  questionSetTitle,
  onClose,
  onSubmitted,
}: QuestionSetFeedbackDialogProps) {
  const { t } = useLanguage();
  const d = t.questionSetFeedbackDialog;
  const { addToast } = useToast();

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [selectedStar, setSelectedStar] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ratingError, setRatingError] = useState(false);

  const MAX_COMMENT = 2000;
  const activeStar = hoveredStar ?? selectedStar;

  async function handleSubmit() {
    if (!selectedStar) {
      setRatingError(true);
      return;
    }
    setRatingError(false);
    setSubmitting(true);
    try {
      await submitQuestionSetFeedback(questionSetId, {
        rating: selectedStar,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      addToast("success", d.submitted);
      setTimeout(() => {
        onSubmitted?.();
        onClose();
      }, 1800);
    } catch {
      addToast("error", d.submitError);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            className={cn(
              "relative z-10 w-full max-w-md rounded-2xl shadow-2xl",
              "bg-white dark:bg-gray-900",
              "border border-gray-100 dark:border-gray-800"
            )}
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            {!submitting && !submitted && (
              <button
                type="button"
                onClick={handleClose}
                className={cn(
                  "absolute top-3.5 right-3.5 z-10",
                  "w-7 h-7 rounded-full flex items-center justify-center",
                  "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
                  "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                )}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            )}

            <div className="p-6">
              {submitted ? (
                /* ── Success state ────────────────────────────────────────── */
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle2 size={48} className="text-emerald-500" />
                  </motion.div>
                  <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
                    {d.submitted}
                  </p>
                </div>
              ) : (
                /* ── Form state ───────────────────────────────────────────── */
                <>
                  {/* Header */}
                  <div className="mb-5">
                    <p className="text-[16px] font-bold text-gray-900 dark:text-white leading-snug pr-6">
                      {d.title}
                    </p>
                    {questionSetTitle && (
                      <p className="text-[12px] text-violet-600 dark:text-violet-400 font-medium mt-1 truncate">
                        {questionSetTitle}
                      </p>
                    )}
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
                      {d.subtitle}
                    </p>
                  </div>

                  {/* Star rating */}
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                      {d.ratingLabel}
                    </p>
                    <div
                      className="flex items-center gap-1.5"
                      onMouseLeave={() => setHoveredStar(null)}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            setSelectedStar(star);
                            setRatingError(false);
                          }}
                          onMouseEnter={() => setHoveredStar(star)}
                          aria-label={d.starLabels[star - 1]}
                          className="group transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star
                            size={28}
                            className={cn(
                              "transition-colors duration-100",
                              (activeStar ?? 0) >= star
                                ? "text-amber-400 fill-amber-400"
                                : "text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700"
                            )}
                          />
                        </button>
                      ))}
                      {activeStar && (
                        <span className="ml-2 text-[12px] font-medium text-gray-600 dark:text-gray-300">
                          {d.starLabels[activeStar - 1]}
                        </span>
                      )}
                    </div>
                    {ratingError && (
                      <p className="text-[11px] text-red-500 mt-1.5">
                        {d.ratingRequired}
                      </p>
                    )}
                  </div>

                  {/* Comment */}
                  <div className="mb-5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5">
                      {d.commentLabel}
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_COMMENT)
                          setComment(e.target.value);
                      }}
                      rows={3}
                      placeholder={d.commentPlaceholder}
                      className={cn(
                        "w-full resize-none rounded-xl px-3 py-2.5 text-[13px]",
                        "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                        "text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500",
                        "focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400",
                        "transition-colors"
                      )}
                    />
                    <p className="text-right text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      {comment.length} / {MAX_COMMENT}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={submitting}
                      className={cn(
                        "h-9 px-4 text-[13px] font-medium rounded-lg transition-colors",
                        "text-gray-600 dark:text-gray-300",
                        "hover:bg-gray-100 dark:hover:bg-gray-800",
                        "disabled:opacity-50"
                      )}
                    >
                      {d.skipBtn}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className={cn(
                        "flex items-center gap-2 h-9 px-5 text-[13px] font-semibold rounded-lg transition-all",
                        "bg-violet-600 hover:bg-violet-700 text-white",
                        "disabled:opacity-60"
                      )}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          {d.submitting}
                        </>
                      ) : (
                        d.submitBtn
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
