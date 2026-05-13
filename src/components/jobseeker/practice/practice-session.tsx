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
import type { QuestionSet, QuestionCategory, Difficulty } from "@/types/jobseeker";

const CATEGORY_BADGE: Record<QuestionCategory, string> = {
  Technical:   "bg-blue-50 text-blue-700",
  Behavioral:  "bg-violet-50 text-violet-700",
  Situational: "bg-amber-50 text-amber-700",
};

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  Easy:   "bg-emerald-50 text-emerald-700",
  Medium: "bg-amber-50 text-amber-700",
  Hard:   "bg-red-50 text-red-600",
};

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
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-8 h-[56px] flex items-center justify-between shrink-0"
        style={{ boxShadow: "rgba(0,0,0,0.05) 0px 1px 3px 0px" }}
      >
        {/* Left: set info */}
        <div className="flex items-center gap-3">
          <div className={cn("w-7 h-7 rounded-lg text-white text-[11px] font-bold flex items-center justify-center", set.companyColor)}>
            {set.companyInitials}
          </div>
          <div>
            <p className="text-[13px] font-[600] text-[#111827] leading-none">{set.title}</p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">{set.company}</p>
          </div>
        </div>

        {/* Center: progress */}
        <div className="flex items-center gap-3 flex-1 mx-10">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-[12px] font-[600] text-[#6B7280] shrink-0 tabular-nums">
            {p.question} {currentIdx + 1} {p.of} {totalQuestions}
          </span>
        </div>

        {/* Right: timer + exit */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-1.5 text-[13px] font-[600] tabular-nums",
            timeLeft < 300 ? "text-red-500" : "text-[#6B7280]"
          )}>
            <Timer size={14} />
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={() => {
              if (window.confirm(p.exitConfirm)) router.push(`/jobseeker/sets/${set.id}`);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
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
              className="bg-white rounded-xl p-8"
              style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
            >
              {/* Category + difficulty badges */}
              <div className="flex items-center gap-2 mb-5">
                <span className={cn("text-[11px] font-[600] px-2.5 py-1 rounded-[6px]", CATEGORY_BADGE[question.category])}>
                  {question.category}
                </span>
                <span className={cn("text-[11px] font-[600] px-2.5 py-1 rounded-[6px]", DIFFICULTY_BADGE[question.difficulty])}>
                  {question.difficulty}
                </span>
              </div>

              {/* Question text */}
              <p className="text-[20px] font-[700] text-[#111827] leading-[30px]">
                {question.text}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Answer area */}
          <div className="bg-white rounded-xl p-6"
            style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
          >
            {isSubmitted ? (
              /* Submitted state */
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 size={16} />
                  <span className="text-[13px] font-[600]">Answer submitted</span>
                </div>
                <p className="text-[14px] text-[#6B7280] leading-[22px] whitespace-pre-wrap">
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
                  className="w-full min-h-[180px] text-[14px] font-[400] text-[#111827] placeholder:text-[#9CA3AF] bg-transparent outline-none resize-none leading-[24px]"
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className={cn(
                    "text-[12px] font-[500]",
                    currentAnswer.length < 150 ? "text-[#9CA3AF]" : "text-emerald-600"
                  )}>
                    {currentAnswer.length} {p.characters}
                    {currentAnswer.length < 150 && (
                      <span className="text-[#9CA3AF]"> · {p.minRecommended}</span>
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
                      className="flex items-center gap-2 h-[36px] px-4 text-[13px] font-[600] text-white bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
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
                    : "w-2 h-2 bg-gray-200 hover:bg-gray-300"
                )}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              disabled={currentIdx === 0}
              className="flex items-center gap-2 h-[36px] px-4 text-[13px] font-[600] text-[#111827] bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-[#E5E7EB] transition-colors"
            >
              <ChevronLeft size={15} />
              {p.prevBtn}
            </button>

            {allAnswered ? (
              <motion.button
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                onClick={handleFinish}
                className="flex items-center gap-2 h-[40px] px-6 text-[14px] font-[600] text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors"
                style={{ boxShadow: "rgba(108,71,255,0.3) 0px 4px 14px 0px" }}
              >
                <Sparkles size={15} />
                {p.finishBtn}
              </motion.button>
            ) : (
              <button
                onClick={() => navigate(1)}
                disabled={isLast}
                className="flex items-center gap-2 h-[36px] px-4 text-[13px] font-[600] text-white bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {p.nextBtn}
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
