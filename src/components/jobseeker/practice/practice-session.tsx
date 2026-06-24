"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer, ChevronLeft, ChevronRight, Send, X,
  Loader2, Sparkles, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import type { QuestionSet } from "@/types/jobseeker";
import { Pill, getCategoryBadgeClass, getDifficultyBadgeClass } from "@/components/jobseeker/ui/pill";
import {
  portalDivider,
  portalHeadingAlt,
  portalSubtextAlt,
} from "@/lib/portal-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

interface PracticeSessionProps {
  set: QuestionSet;
}

export function PracticeSession({ set }: PracticeSessionProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const p = t.jobseekerPracticePage;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [evaluating, setEvaluating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 min
  const [direction, setDirection] = useState(1);
  const [exitOpen, setExitOpen] = useState(false);

  const question = set.questions[currentIdx];
  const totalQuestions = set.questions.length;
  const progress = ((currentIdx + 1) / totalQuestions) * 100;
  const currentAnswer = answers[question.id] ?? "";
  const isSubmitted = submitted[question.id] ?? false;
  const isLast = currentIdx === totalQuestions - 1;

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  function navigate(delta: number) {
    setDirection(delta);
    setCurrentIdx((i) => Math.min(Math.max(0, i + delta), totalQuestions - 1));
  }

  const handleSubmitAnswer = useCallback(() => {
    if (!currentAnswer.trim() || isSubmitted) return;
    setEvaluating(true);
    setTimeout(() => {
      setEvaluating(false);
      setSubmitted((prev) => ({ ...prev, [question.id]: true }));
      // Auto-advance if not last
      if (!isLast) {
        setTimeout(() => navigate(1), 600);
      }
    }, 2000);
  }, [currentAnswer, isSubmitted, question.id, isLast]);

  function handleFinish() {
    router.push(`/jobseeker/practice/${set.id}/result`);
  }

  const allAnswered = set.questions.every((q) => submitted[q.id]);

  const variants = {
    enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  return (
    <>
    <ConfirmDialog
      open={exitOpen}
      title={p.exitConfirmTitle}
      message={p.exitConfirmMessage}
      confirmLabel={p.exitConfirmBtn}
      cancelLabel={p.exitCancelBtn}
      variant="danger"
      onConfirm={() => router.push(`/jobseeker/sets/${set.id}`)}
      onCancel={() => setExitOpen(false)}
    />
    <div className="min-h-screen hr-main-bg flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className={cn("hr-topbar px-8 h-14 flex items-center justify-between shrink-0 border-b", portalDivider)}>
        {/* Left: set info */}
        <div className="flex items-center gap-3">
          <div className={cn("w-7 h-7 rounded-lg text-white text-[11px] font-bold flex items-center justify-center", set.companyColor)}>
            {set.companyInitials}
          </div>
          <div>
            <p className={cn("text-[13px] font-[600] leading-none", portalHeadingAlt)}>{set.title}</p>
            <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{set.company}</p>
          </div>
        </div>

        {/* Center: progress */}
        <div className="flex items-center gap-3 flex-1 mx-10">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className={cn("text-[12px] font-[600] shrink-0 tabular-nums", portalSubtextAlt)}>
            {p.question} {currentIdx + 1} {p.of} {totalQuestions}
          </span>
        </div>

        {/* Right: timer + exit */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-1.5 text-[13px] font-[600] tabular-nums",
            timeLeft < 300 ? "text-red-500" : portalSubtextAlt
          )}>
            <Timer size={14} />
            {formatTime(timeLeft)}
          </div>
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={p.exitConfirmBtn}
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-[760px] flex flex-col gap-5">

          {/* Question card */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={question.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="hr-glass-card p-8"
            >
              {/* Category + difficulty badges */}
              <div className="flex items-center gap-2 mb-5">
                <Pill className={getCategoryBadgeClass(question.category)}>{question.category}</Pill>
                <Pill className={getDifficultyBadgeClass(question.difficulty)}>{question.difficulty}</Pill>
              </div>

              {/* Question text */}
              <p className={cn("text-[20px] font-[700] leading-[30px]", portalHeadingAlt)}>
                {question.text}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Answer area */}
          <div className="hr-glass-card p-6">
            {isSubmitted ? (
              /* Submitted state */
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span className="text-[13px] font-[600]">Answer submitted</span>
                </div>
                <p className={cn("text-[14px] leading-[22px] whitespace-pre-wrap", portalSubtextAlt)}>
                  {currentAnswer}
                </p>
              </motion.div>
            ) : (
              /* Input state */
              <>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                  placeholder={p.answerPlaceholder}
                  disabled={evaluating}
                  className={cn(
                    "w-full min-h-[180px] text-[14px] font-[400] bg-transparent outline-none resize-none leading-[24px]",
                    portalHeadingAlt,
                    "placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  )}
                />
                <div className={cn("flex items-center justify-between mt-3 pt-3 border-t", portalDivider)}>
                  <span className={cn(
                    "text-[12px] font-[500]",
                    currentAnswer.length < 150 ? "text-gray-400 dark:text-gray-500" : "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {currentAnswer.length} {p.characters}
                    {currentAnswer.length < 150 && (
                      <span className="text-gray-400 dark:text-gray-500"> · {p.minRecommended}</span>
                    )}
                  </span>

                  {evaluating ? (
                    <div className="flex items-center gap-2 text-[13px] text-primary">
                      <Loader2 size={13} className="animate-spin" />
                      {p.aiThinking}
                    </div>
                  ) : (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!currentAnswer.trim()}
                      className="shimmer-button flex items-center gap-2 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
                    >
                      <Send size={13} />
                      {p.submitBtn}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Dot progress indicator */}
          <div className="flex items-center justify-center gap-2">
            {set.questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => { setDirection(idx > currentIdx ? 1 : -1); setCurrentIdx(idx); }}
                className={cn(
                  "rounded-full transition-all duration-200",
                  idx === currentIdx
                    ? "w-6 h-2 bg-primary"
                    : submitted[q.id]
                    ? "w-2 h-2 bg-emerald-400"
                    : "w-2 h-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                )}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              disabled={currentIdx === 0}
              className="hr-glass-card flex items-center gap-2 h-9 px-4 text-[13px] font-semibold text-gray-700 dark:text-gray-200 hover:border-[#7C3AED]/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
            >
              <ChevronLeft size={15} />
              {p.prevBtn}
            </button>

            {allAnswered ? (
              <motion.button
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                onClick={handleFinish}
                className="shimmer-button flex items-center gap-2 h-10 px-6 text-[14px] font-semibold text-white hr-cta-btn rounded-xl"
              >
                <Sparkles size={15} />
                {p.finishBtn}
              </motion.button>
            ) : (
              <button
                onClick={() => navigate(1)}
                disabled={isLast}
                className="shimmer-button flex items-center gap-2 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
              >
                {p.nextBtn}
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
    </>
  );
}
