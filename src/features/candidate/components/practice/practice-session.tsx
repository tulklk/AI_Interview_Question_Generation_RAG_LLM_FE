"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import {
  Timer, ChevronLeft, ChevronRight, Send, X,
  Loader2, Sparkles, CheckCircle2, AlertCircle, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { Pill, getCategoryBadgeClass, getDifficultyBadgeClass } from "@/features/candidate/components/ui/pill";
import {
  portalDivider,
  portalHeadingAlt,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { useToast } from "@/shared/providers/toast-context";
import {
  startPracticeSession,
  submitAnswer as submitAnswerApi,
  completePracticeSession,
  findInProgressSession,
} from "@/features/candidate/services/practice-session.service";

const SESSION_DURATION_SECONDS = 45 * 60;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function draftKey(sessionId: string, questionId: string) {
  return `practice-draft-${sessionId}-${questionId}`;
}

interface ProgressDotProps {
  active: boolean;
  submitted: boolean;
  onClick: () => void;
}

function ProgressDot({ active, submitted, onClick }: ProgressDotProps) {
  const controls = useAnimationControls();
  const wasSubmitted = useRef(submitted);

  useEffect(() => {
    if (submitted && !wasSubmitted.current) {
      controls.start({ scale: [1, 1.7, 1], transition: { duration: 0.4, ease: "easeOut" } });
    }
    wasSubmitted.current = submitted;
  }, [submitted, controls]);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={controls}
      className={cn(
        "rounded-full transition-all duration-200",
        active
          ? "w-6 h-2 bg-primary"
          : submitted
          ? "w-2 h-2 bg-emerald-400"
          : "w-2 h-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
      )}
    />
  );
}

interface PracticeSessionProps {
  set: QuestionSet;
}

export function PracticeSession({ set }: PracticeSessionProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { addToast } = useToast();
  const p = t.jobseekerPracticePage;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [evaluating, setEvaluating] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION_SECONDS);
  const [direction, setDirection] = useState(1);
  const [exitOpen, setExitOpen] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [resumed, setResumed] = useState(false);
  const [starting, setStarting] = useState(true);
  const [startError, setStartError] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState(false);
  const [startAttempt, setStartAttempt] = useState(0);

  const restoredDraftIds = useRef(new Set<string>());

  const question = set.questions[currentIdx];
  const totalQuestions = set.questions.length;
  const progress = ((currentIdx + 1) / totalQuestions) * 100;
  const currentAnswer = answers[question.id] ?? "";
  const isSubmitted = submitted[question.id] ?? false;
  const isLast = currentIdx === totalQuestions - 1;

  // Resume an IN_PROGRESS session for this set if one exists, otherwise start a fresh one.
  useEffect(() => {
    let cancelled = false;
    setStarting(true);
    setStartError(false);

    async function init() {
      try {
        const existing = await findInProgressSession(set.id);
        if (cancelled) return;

        if (existing) {
          const submittedMap: Record<string, boolean> = {};
          const answersMap: Record<string, string> = {};
          existing.answers.forEach((a) => {
            submittedMap[a.questionId] = true;
            if (a.answer) answersMap[a.questionId] = a.answer;
          });
          setSessionId(existing.sessionId);
          setStartedAt(existing.startedAt ?? new Date().toISOString());
          setSubmitted(submittedMap);
          setAnswers((prev) => ({ ...prev, ...answersMap }));
          setResumed(true);
          addToast("success", p.resumedToast);
          const firstUnanswered = set.questions.findIndex((q) => !submittedMap[q.id]);
          setCurrentIdx(firstUnanswered === -1 ? set.questions.length - 1 : firstUnanswered);
        } else {
          const res = await startPracticeSession(set.id);
          if (cancelled) return;
          setSessionId(res.sessionId);
          setStartedAt(res.startedAt ?? new Date().toISOString());
        }
      } catch {
        if (!cancelled) setStartError(true);
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id, startAttempt]);

  // Countdown timer — computed from the server's started_at so it survives refresh/resume.
  useEffect(() => {
    if (!startedAt) return;
    const startMs = new Date(startedAt).getTime();
    function tick() {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      setTimeLeft(Math.max(0, SESSION_DURATION_SECONDS - elapsed));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Restore an unsubmitted draft answer for the current question from sessionStorage (once per question).
  useEffect(() => {
    if (!sessionId || !question || typeof window === "undefined") return;
    if (restoredDraftIds.current.has(question.id)) return;
    restoredDraftIds.current.add(question.id);
    if (submitted[question.id]) return;
    const saved = window.sessionStorage.getItem(draftKey(sessionId, question.id));
    if (saved) {
      setAnswers((prev) => (prev[question.id] !== undefined ? prev : { ...prev, [question.id]: saved }));
    }
  }, [sessionId, question, submitted]);

  function navigate(delta: number) {
    setDirection(delta);
    setCurrentIdx((i) => Math.min(Math.max(0, i + delta), totalQuestions - 1));
  }

  function handleAnswerChange(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    if (sessionId && typeof window !== "undefined") {
      window.sessionStorage.setItem(draftKey(sessionId, question.id), value);
    }
  }

  const handleSubmitAnswer = useCallback(() => {
    if (!currentAnswer.trim() || isSubmitted || !sessionId) return;
    setEvaluating(true);
    setSubmitError(false);
    submitAnswerApi(sessionId, { questionId: question.id, answer: currentAnswer })
      .then(() => {
        setSubmitted((prev) => ({ ...prev, [question.id]: true }));
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(draftKey(sessionId, question.id));
        }
        if (!isLast) {
          setTimeout(() => navigate(1), 600);
        }
      })
      .catch(() => {
        setSubmitError(true);
        addToast("error", p.submitFailed);
      })
      .finally(() => setEvaluating(false));
  }, [currentAnswer, isSubmitted, question.id, isLast, sessionId, addToast, p.submitFailed]);

  function handleFinish() {
    if (!sessionId) return;
    setFinishing(true);
    setFinishError(false);
    completePracticeSession(sessionId)
      .then(() => {
        router.push(`/jobseeker/practice/${sessionId}/result`);
      })
      .catch(() => {
        setFinishError(true);
        setFinishing(false);
        addToast("error", p.finishFailed);
      });
  }

  const allAnswered = set.questions.every((q) => submitted[q.id]);

  const variants = {
    enter:  (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit:   (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  if (starting) {
    return (
      <div className="min-h-screen hr-main-bg flex items-center justify-center">
        <AiLoadingSpinner text={p.startingSession} />
      </div>
    );
  }

  if (startError || !sessionId) {
    return (
      <div className="min-h-screen hr-main-bg flex flex-col items-center justify-center gap-3 px-4 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <p className={cn("text-[14px]", portalSubtextAlt)}>{p.startFailed}</p>
        <button
          type="button"
          onClick={() => setStartAttempt((n) => n + 1)}
          className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline"
        >
          <RefreshCw size={13} />
          {p.retryBtn}
        </button>
      </div>
    );
  }

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
      <header className={cn("hr-topbar px-4 md:px-8 h-14 flex items-center justify-between shrink-0 border-b gap-2", portalDivider)}>
        {/* Left: set info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-7 h-7 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", set.companyColor)}>
            {set.companyInitials}
          </div>
          <div className="min-w-0 hidden sm:block">
            <p className={cn("text-[13px] font-[600] leading-none truncate", portalHeadingAlt)}>{set.title}</p>
            <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{set.company}</p>
          </div>
          {resumed && (
            <span className="hidden md:inline-flex items-center text-[10px] font-[600] px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
              {p.resumedBadge}
            </span>
          )}
        </div>

        {/* Center: progress */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 mx-2 sm:mx-6 md:mx-10">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className={cn("text-[11px] sm:text-[12px] font-[600] shrink-0 tabular-nums", portalSubtextAlt)}>
            {p.question} {currentIdx + 1} {p.of} {totalQuestions}
          </span>
        </div>

        {/* Right: timer + exit */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <motion.div
            animate={timeLeft < 300 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={timeLeft < 300 ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : undefined}
            className={cn(
              "flex items-center gap-1.5 text-[12px] sm:text-[13px] font-[600] tabular-nums",
              timeLeft < 300 ? "text-red-500" : portalSubtextAlt
            )}
          >
            <Timer size={13} />
            {formatTime(timeLeft)}
          </motion.div>
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
      <main className="flex-1 flex items-start justify-center px-3 sm:px-6 py-6 sm:py-10">
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
              className="hr-glass-card p-5 sm:p-8"
            >
              {/* Category + difficulty badges */}
              <div className="flex items-center gap-2 mb-5">
                <Pill className={getCategoryBadgeClass(question.category)}>{question.category}</Pill>
                <Pill className={getDifficultyBadgeClass(question.difficulty)}>{question.difficulty}</Pill>
              </div>

              {/* Question text */}
              <p className={cn("text-[17px] sm:text-[20px] font-[700] leading-[26px] sm:leading-[30px]", portalHeadingAlt)}>
                {question.text}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Answer area */}
          <div className="hr-glass-card p-4 sm:p-6">
            {isSubmitted ? (
              /* Submitted state */
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span className="text-[13px] font-[600]">{p.answerSubmitted}</span>
                </div>
                {currentAnswer && (
                  <p className={cn("text-[14px] leading-[22px] whitespace-pre-wrap", portalSubtextAlt)}>
                    {currentAnswer}
                  </p>
                )}
              </motion.div>
            ) : (
              /* Input state */
              <>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder={p.answerPlaceholder}
                  disabled={evaluating}
                  className={cn(
                    "w-full min-h-[140px] sm:min-h-[180px] text-[14px] font-[400] bg-transparent outline-none resize-none leading-[24px]",
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
                {submitError && (
                  <div className="flex items-center gap-3 mt-2">
                    <p className="flex items-center gap-1.5 text-[12px] font-[500] text-red-500">
                      <AlertCircle size={12} />
                      {p.submitFailed}
                    </p>
                    <button
                      type="button"
                      onClick={handleSubmitAnswer}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
                    >
                      <RefreshCw size={11} />
                      {p.retryBtn}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Dot progress indicator */}
          <div className="flex items-center justify-center gap-2">
            {set.questions.map((q, idx) => (
              <ProgressDot
                key={q.id}
                active={idx === currentIdx}
                submitted={submitted[q.id] ?? false}
                onClick={() => { setDirection(idx > currentIdx ? 1 : -1); setCurrentIdx(idx); }}
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
              <div className="flex flex-col items-end gap-1.5">
                <motion.div
                  className="relative rounded-xl"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                >
                  <span
                    className={cn(
                      "absolute inset-0 rounded-xl bg-primary pointer-events-none",
                      !finishing && !finishError ? "cta-ring-active" : "opacity-0"
                    )}
                  />
                  <button
                    onClick={handleFinish}
                    disabled={finishing}
                    className="relative shimmer-button flex items-center gap-2 h-10 px-6 text-[14px] font-semibold text-white hr-cta-btn rounded-xl disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {finishing ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        {p.finishing}
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        {p.finishBtn}
                      </>
                    )}
                  </button>
                </motion.div>
                {finishError && (
                  <p className="flex items-center gap-1.5 text-[12px] font-[500] text-red-500">
                    <AlertCircle size={12} />
                    {p.finishFailed}
                  </p>
                )}
              </div>
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
