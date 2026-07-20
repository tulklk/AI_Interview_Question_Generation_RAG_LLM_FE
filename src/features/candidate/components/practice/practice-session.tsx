"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import {
  Timer, ChevronLeft, ChevronRight, Send, X,
  Loader2, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Lock,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { CategoryPill, DifficultyPill, formatCategoryLabel } from "@/features/candidate/components/ui/pill";
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
  abandonPracticeSession,
  getPracticeSession,
  ForbiddenError,
} from "@/features/candidate/services/practice-session.service";

const MIN_ANSWER_CHARS = 20;
const MIN_ANSWER_WORDS = 3;

function validateAnswerText(text: string): "tooShort" | "tooFewWords" | null {
  const trimmed = text.trim();
  if (trimmed.length < MIN_ANSWER_CHARS) return "tooShort";
  if (trimmed.split(/\s+/).filter(Boolean).length < MIN_ANSWER_WORDS) return "tooFewWords";
  return null;
}

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

interface QuestionNavProps {
  questions: QuestionSet["questions"];
  currentIdx: number;
  submitted: Record<string, boolean>;
  onSelect: (idx: number) => void;
  onFinish: () => void;
  finishing: boolean;
  hasTimeLimit: boolean;
  timeLeft: number;
  labels: {
    title: string; answered: string; current: string; unanswered: string;
    answeredLabel: string; timeLabel: string; submitBtn: string; noTimeLimit: string;
  };
}

function QuestionNav({ questions, currentIdx, submitted, onSelect, onFinish, finishing, hasTimeLimit, timeLeft, labels }: QuestionNavProps) {
  const answeredCount = questions.filter((q) => submitted[q.id]).length;
  const total = questions.length;

  return (
    <aside className={cn(
      "hidden lg:flex flex-col w-72 fixed top-17 right-4 z-40 scrollbar-hide",
      "max-h-[calc(100vh-80px)] rounded-2xl shadow-xl border",
      "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md",
      portalDivider
    )}>
      {/* Stats header */}
      <div className={cn("grid grid-cols-2 border-b shrink-0", portalDivider)}>
        <div className={cn("px-4 py-3 border-r", portalDivider)}>
          <p className={cn("text-[11px] font-medium mb-0.5", portalSubtextAlt)}>{labels.answeredLabel}</p>
          <p className={cn("text-[22px] font-bold tabular-nums leading-none", portalHeadingAlt)}>
            {answeredCount}
            <span className={cn("text-[14px] font-normal", portalSubtextAlt)}>/{total}</span>
          </p>
        </div>
        <div className="px-4 py-3">
          <p className={cn("text-[11px] font-medium mb-0.5", portalSubtextAlt)}>{labels.timeLabel}</p>
          {hasTimeLimit ? (
            <p className={cn(
              "text-[22px] font-bold tabular-nums leading-none",
              timeLeft < 300 ? "text-red-500" : "text-primary"
            )}>
              {formatTime(timeLeft)}
            </p>
          ) : (
            <p className={cn("text-[14px] font-medium leading-none mt-1", portalSubtextAlt)}>{labels.noTimeLimit}</p>
          )}
        </div>
      </div>

      {/* Question number grid */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        <div className="grid grid-cols-6 gap-2">
          {questions.map((q, idx) => {
            const isActive = idx === currentIdx;
            const isDone = submitted[q.id] ?? false;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onSelect(idx)}
                title={isActive ? labels.current : isDone ? labels.answered : labels.unanswered}
                className={cn(
                  "w-9 h-9 rounded-full text-[13px] font-bold transition-all duration-150 flex items-center justify-center",
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/30 scale-110"
                    : isDone
                    ? "bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500"
                    : "border-2 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary/50 hover:text-primary"
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit button + legend */}
      <div className={cn("px-4 pt-3 pb-4 border-t shrink-0 flex flex-col gap-3", portalDivider)}>
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing}
          className="w-full h-10 rounded-xl text-[14px] font-bold text-white hr-cta-btn shimmer-button disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {finishing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {labels.submitBtn}
        </button>

        {/* Legend */}
        <div className="flex flex-col gap-1.5">
          {[
            { color: "bg-primary", label: labels.current },
            { color: "bg-emerald-500", label: labels.answered },
            { color: "border-2 border-gray-300 dark:border-gray-600", label: labels.unanswered },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={cn("w-4 h-4 rounded-full shrink-0", color)} />
              <span className={cn("text-[12px]", portalSubtextAlt)}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [direction, setDirection] = useState(1);
  const [exitOpen, setExitOpen] = useState(false);
  const [abandoning, setAbandoning] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  // Absolute deadline BE enforces server-side (startedAt + the set's configured
  // time limit); null = untimed. Unlike a client-tracked "elapsed since start"
  // countdown, this can't be paused by leaving the page — BE auto-completes at
  // this exact moment regardless of whether the candidate is looking at it, so
  // the display must match that rather than pretend time stops on exit.
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const hasTimeLimit = expiresAt !== null;
  const [resumed, setResumed] = useState(false);
  const [starting, setStarting] = useState(true);
  const [startError, setStartError] = useState(false);
  const [startForbidden, setStartForbidden] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState(false);
  const [startAttempt, setStartAttempt] = useState(0);

  const restoredDraftIds = useRef(new Set<string>());
  const timeUpRef = useRef(false);
  const evaluatingRef = useRef(false);

  useEffect(() => {
    evaluatingRef.current = evaluating;
  }, [evaluating]);

  const question = set.questions[currentIdx];
  const totalQuestions = set.questions.length;
  const progress = ((currentIdx + 1) / totalQuestions) * 100;
  const currentAnswer = answers[question.id] ?? "";
  const isSubmitted = submitted[question.id] ?? false;
  const isLast = currentIdx === totalQuestions - 1;

  // Start (or auto-resume, server-side) the practice session for this set. The
  // response's questions[] already carry any previously-submitted answerText.
  useEffect(() => {
    let cancelled = false;
    setStarting(true);
    setStartError(false);
    setStartForbidden(false);

    startPracticeSession(set.id)
      .then((session) => {
        if (cancelled) return;
        const submittedMap: Record<string, boolean> = {};
        const answersMap: Record<string, string> = {};
        session.questions.forEach((q) => {
          if (q.answerText) {
            submittedMap[q.id] = true;
            answersMap[q.id] = q.answerText;
          }
        });
        const wasResumed = Object.keys(submittedMap).length > 0;
        setSessionId(session.id);
        setStartedAt(session.startedAt ?? new Date().toISOString());
        setExpiresAt(session.expiresAt);
        setSubmitted(submittedMap);
        setAnswers((prev) => ({ ...prev, ...answersMap }));
        setResumed(wasResumed);
        if (wasResumed) addToast("success", p.resumedToast);
        const firstUnanswered = set.questions.findIndex((q) => !submittedMap[q.id]);
        setCurrentIdx(firstUnanswered === -1 ? set.questions.length - 1 : firstUnanswered);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ForbiddenError) setStartForbidden(true);
        else setStartError(true);
      })
      .finally(() => {
        if (!cancelled) setStarting(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id, startAttempt]);

  // Countdown timer — computed from the session's absolute expiresAt (BE-enforced,
  // untouched by leaving the page). Browsers throttle setInterval in background
  // tabs, so the display can lag while unfocused; resync immediately on
  // visibilitychange so it catches up right away instead of waiting for the next
  // (possibly delayed) tick.
  useEffect(() => {
    if (!expiresAt || !sessionId) return;
    const deadlineMs = new Date(expiresAt).getTime();

    function tick() {
      const remaining = Math.floor((deadlineMs - Date.now()) / 1000);
      setTimeLeft(Math.max(0, remaining));

      // Auto-submit once time is up. If an answer submission is mid-flight, wait
      // for it to settle (evaluatingRef) — the next tick (≤1s later) retries.
      if (remaining <= 0 && !timeUpRef.current && !evaluatingRef.current) {
        timeUpRef.current = true;
        addToast("error", p.timeUpToast);
        handleFinish();
      }
    }
    tick();
    const intervalId = setInterval(tick, 1000);
    function onVisibilityChange() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [expiresAt, sessionId]);

  // Clear validation error when the active question changes.
  useEffect(() => {
    setValidationError(null);
    setSubmitError(false);
  }, [question.id]);

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
    if (validationError) setValidationError(null);
    if (sessionId && typeof window !== "undefined") {
      window.sessionStorage.setItem(draftKey(sessionId, question.id), value);
    }
  }

  const handleSubmitAnswer = useCallback(() => {
    if (!currentAnswer.trim() || isSubmitted || !sessionId) return;
    const vErr = validateAnswerText(currentAnswer);
    if (vErr) {
      setValidationError(vErr === "tooShort" ? p.validationTooShort : p.validationTooFewWords);
      return;
    }
    setValidationError(null);
    setEvaluating(true);
    setSubmitError(false);
    submitAnswerApi(sessionId, { questionId: question.id, answerText: currentAnswer })
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
  }, [currentAnswer, isSubmitted, question.id, isLast, sessionId, addToast, p.submitFailed, p.validationTooShort, p.validationTooFewWords]);

  function handleFinish() {
    if (!sessionId) return;
    setFinishing(true);
    setFinishError(false);
    completePracticeSession(sessionId)
      .then(() => {
        router.push(`/jobseeker/practice/${sessionId}/result`);
      })
      .catch(async () => {
        // BE now enforces the question set's own time limit server-side and can
        // auto-complete a session before our client-side auto-submit reaches it —
        // complete() then 400s even though the session is actually done. Check
        // the real status before surfacing an error the candidate can't recover from.
        const existing = await getPracticeSession(sessionId).catch(() => null);
        if (existing && existing.status !== "IN_PROGRESS") {
          router.push(`/jobseeker/practice/${sessionId}/result`);
          return;
        }
        setFinishError(true);
        setFinishing(false);
        addToast("error", p.finishFailed);
      });
  }

  function handleAbandon() {
    if (!sessionId || abandoning) return;
    setAbandoning(true);
    abandonPracticeSession(sessionId)
      .then(() => {
        if (typeof window !== "undefined") {
          set.questions.forEach((q) => window.sessionStorage.removeItem(draftKey(sessionId, q.id)));
        }
        router.push(`/jobseeker/sets/${set.id}`);
      })
      .catch(async () => {
        // Same server-side timeout race as handleFinish — if the session already
        // isn't IN_PROGRESS anymore, there's nothing left to abandon; leaving is
        // still the right outcome, just without a scary error.
        const existing = await getPracticeSession(sessionId).catch(() => null);
        if (existing && existing.status !== "IN_PROGRESS") {
          if (typeof window !== "undefined") {
            set.questions.forEach((q) => window.sessionStorage.removeItem(draftKey(sessionId, q.id)));
          }
          router.push(`/jobseeker/sets/${set.id}`);
          return;
        }
        setAbandoning(false);
        addToast("error", p.abandonFailed);
      });
  }

  const allAnswered = set.questions.every((q) => submitted[q.id]);
  const unansweredCount = set.questions.filter((q) => !submitted[q.id]).length;

  function goToFirstUnanswered() {
    const idx = set.questions.findIndex((q) => !submitted[q.id]);
    if (idx === -1) return;
    setDirection(idx > currentIdx ? 1 : -1);
    setCurrentIdx(idx);
  }

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

  if (startForbidden) {
    return (
      <div className="min-h-screen hr-main-bg flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Lock size={28} className="text-gray-400 dark:text-gray-500" />
        <p className={cn("text-[14px]", portalSubtextAlt)}>{p.startForbidden}</p>
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
      extraAction={{ label: p.abandonBtn, onClick: handleAbandon, loading: abandoning }}
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
            <p className={cn("text-[13px] font-semibold leading-none truncate", portalHeadingAlt)}>{set.title}</p>
            <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{set.company}</p>
          </div>
          {resumed && (
            <span className="hidden md:inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
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
          <span className={cn("text-[11px] sm:text-[12px] font-semibold shrink-0 tabular-nums", portalSubtextAlt)}>
            {p.question} {currentIdx + 1} {p.of} {totalQuestions}
          </span>
        </div>

        {/* Right: timer + exit */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {hasTimeLimit && (
            <motion.div
              animate={timeLeft < 300 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={timeLeft < 300 ? { duration: 1, repeat: Infinity, ease: "easeInOut" } : undefined}
              className={cn(
                "flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold tabular-nums",
                timeLeft < 300 ? "text-red-500" : portalSubtextAlt
              )}
            >
              <Timer size={13} />
              {formatTime(timeLeft)}
            </motion.div>
          )}
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
      <main className="flex-1 flex items-start justify-center px-3 sm:px-6 lg:pr-80 pt-3 pb-8 overflow-y-auto scrollbar-hide">
        <div className="w-full flex flex-col gap-5">

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
                <CategoryPill category={question.category} label={formatCategoryLabel(question.category)} />
                <DifficultyPill difficulty={question.difficulty} label={question.difficulty} />
              </div>

              {/* Question text */}
              <p className={cn("text-[17px] sm:text-[20px] font-bold leading-6.5 sm:leading-7.5", portalHeadingAlt)}>
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
                  <span className="text-[13px] font-semibold">{p.answerSubmitted}</span>
                </div>
                {currentAnswer && (
                  <p className={cn("text-[14px] leading-5.5 whitespace-pre-wrap", portalSubtextAlt)}>
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
                    "w-full min-h-35 sm:min-h-45 text-[14px] font-normal bg-transparent outline-none resize-none leading-6",
                    portalHeadingAlt,
                    "placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  )}
                />
                <div className={cn("flex items-center justify-between mt-3 pt-3 border-t", portalDivider)}>
                  <span className={cn(
                    "text-[12px] font-medium",
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
                {validationError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 mt-2"
                  >
                    <AlertCircle size={13} className="text-amber-500 shrink-0" />
                    <p className="text-[12px] font-medium text-amber-600 dark:text-amber-400">{validationError}</p>
                  </motion.div>
                )}
                {submitError && (
                  <div className="flex items-center gap-3 mt-2">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-red-500">
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

            {allAnswered || finishing || finishError ? (
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
                  <p className="flex items-center gap-1.5 text-[12px] font-medium text-red-500">
                    <AlertCircle size={12} />
                    {p.finishFailed}
                  </p>
                )}
              </div>
            ) : isLast ? (
              <div className="flex flex-col items-end gap-1.5">
                <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-600 dark:text-amber-400">
                  <AlertCircle size={12} />
                  {p.answerAllToFinish.replace("{{count}}", String(unansweredCount))}
                </p>
                <button
                  onClick={goToFirstUnanswered}
                  className="flex items-center gap-2 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn shimmer-button rounded-lg"
                >
                  {p.goToUnansweredBtn}
                  <ChevronLeft size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate(1)}
                className="shimmer-button flex items-center gap-2 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
              >
                {p.nextBtn}
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </main>

      <QuestionNav
        questions={set.questions}
        currentIdx={currentIdx}
        submitted={submitted}
        onSelect={(idx) => { setDirection(idx > currentIdx ? 1 : -1); setCurrentIdx(idx); }}
        onFinish={handleFinish}
        finishing={finishing}
        hasTimeLimit={hasTimeLimit}
        timeLeft={timeLeft}
        labels={{
          title: p.questionListTitle,
          answered: p.questionAnswered,
          current: p.questionCurrent,
          unanswered: p.questionUnanswered,
          answeredLabel: p.sidebarAnsweredLabel,
          timeLabel: p.sidebarTimeLabel,
          submitBtn: p.sidebarSubmitBtn,
          noTimeLimit: p.sidebarNoTimeLimit,
        }}
      />
    </div>
    </>
  );
}
