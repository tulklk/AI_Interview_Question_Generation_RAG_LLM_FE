"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X,
  Loader2, Sparkles, AlertCircle, RefreshCw, Lock, Save, Crown,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { CategoryPill, DifficultyPill, formatCategoryLabel } from "@/features/candidate/components/ui/pill";
import { QuestionContent } from "@/shared/components/ui/question-content";
import { CodeSnippetBlock } from "@/shared/components/ui/code-snippet-block";
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
import { UpgradeModal } from "@/features/candidate/components/billing/upgrade-modal";
import { useCandidateSubscription } from "@/features/candidate/context/candidate-subscription-context";

const MIN_ANSWER_CHARS = 20;
const MIN_ANSWER_WORDS = 3;

/** Template code rõ ràng — SYSTEM_DESIGN không có snippet vẫn dùng textarea thường. */
const CODE_ANSWER_TEMPLATE_TYPES = [
  "CODE_COMPLETION",
  "BUG_DETECTION",
  "REFACTORING",
  "TEST_CASE_DESIGN",
  "PERFORMANCE_ANALYSIS",
] as const;

/** Câu cần ô trả lời dạng code — ưu tiên answerMethod (SCRUM-400); fallback heuristic bộ cũ. */
function needsCodeAnswer(question: {
  answerMethod?: string | null;
  codeSnippet?: string | null;
  codeTemplateType?: string | null;
}): boolean {
  const method = (question.answerMethod || "").trim().toLowerCase();
  if (method === "code") return true;
  if (method === "text") return false;
  // Fallback bộ cũ chưa có answerMethod
  if (question.codeSnippet?.trim()) return true;
  const type = (question.codeTemplateType || "").trim().toUpperCase();
  return (CODE_ANSWER_TEMPLATE_TYPES as readonly string[]).includes(type);
}

function validateAnswerText(
  text: string,
  opts?: { relaxWordCount?: boolean }
): "tooShort" | "tooFewWords" | null {
  const trimmed = text.trim();
  if (trimmed.length < MIN_ANSWER_CHARS) return "tooShort";
  // Code thường ít "từ" theo khoảng trắng — chỉ kiểm tra độ dài ký tự
  if (!opts?.relaxWordCount) {
    if (trimmed.split(/\s+/).filter(Boolean).length < MIN_ANSWER_WORDS) return "tooFewWords";
  }
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

function hasAnswerText(text: string | undefined | null): boolean {
  return (text ?? "").trim().length > 0;
}

interface ProgressDotProps {
  active: boolean;
  answered: boolean;
  onClick: () => void;
}

function ProgressDot({ active, answered, onClick }: ProgressDotProps) {
  const controls = useAnimationControls();
  const wasAnswered = useRef(answered);

  useEffect(() => {
    if (answered && !wasAnswered.current) {
      controls.start({ scale: [1, 1.7, 1], transition: { duration: 0.4, ease: "easeOut" } });
    }
    wasAnswered.current = answered;
  }, [answered, controls]);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={controls}
      className={cn(
        "rounded-full transition-all duration-200",
        active
          ? "w-6 h-2 bg-primary"
          : answered
          ? "w-2 h-2 bg-emerald-400"
          : "w-2 h-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
      )}
    />
  );
}

interface QuestionNavProps {
  questions: QuestionSet["questions"];
  currentIdx: number;
  answered: Record<string, boolean>;
  onSelect: (idx: number) => void;
  onRequestFinish: () => void;
  finishing: boolean;
  /** Whether the displayed timer is a countdown (strict deadline OR estimated time). */
  isCountdown: boolean;
  /** Seconds to display — already computed (countdown remaining or elapsed). */
  timerSeconds: number;
  /** True when < 5 minutes remaining on a countdown. */
  isTimerWarning: boolean;
  labels: {
    title: string; answered: string; current: string; unanswered: string;
    answeredLabel: string; timeLabel: string; submitBtn: string; timeUsedLabel: string;
    answerAllHint: string;
  };
}

function QuestionNav({ questions, currentIdx, answered, onSelect, onRequestFinish, finishing, isCountdown, timerSeconds, isTimerWarning, labels }: QuestionNavProps) {
  const answerable = questions.filter((q) => !q.isLocked);
  const answeredCount = answerable.filter((q) => answered[q.id]).length;
  const total = answerable.length;
  const allAnswered = total === 0 || answeredCount === total;

  return (
    <aside className={cn(
      "hidden lg:flex flex-col w-72 shrink-0 scrollbar-hide",
      "max-h-[calc(100vh-128px)] rounded-2xl shadow-xl border",
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
          <p className={cn("text-[11px] font-medium mb-0.5", portalSubtextAlt)}>
            {isCountdown ? labels.timeLabel : labels.timeUsedLabel}
          </p>
          <p className={cn(
            "text-[22px] font-bold tabular-nums leading-none",
            isTimerWarning ? "text-red-500" : isCountdown ? "text-primary" : portalHeadingAlt
          )}>
            {formatTime(timerSeconds)}
          </p>
        </div>
      </div>

      {/* Question number grid */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        <div className="grid grid-cols-6 gap-2">
          {questions.map((q, idx) => {
            const isActive = idx === currentIdx;
            const isDone = answered[q.id] ?? false;
            const isLocked = q.isLocked === true;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => onSelect(idx)}
                title={
                  isLocked
                    ? "Premium"
                    : isActive
                      ? labels.current
                      : isDone
                        ? labels.answered
                        : labels.unanswered
                }
                className={cn(
                  "w-9 h-9 rounded-full text-[13px] font-bold transition-all duration-150 flex items-center justify-center",
                  isLocked
                    ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700"
                    : isActive
                    ? "bg-primary text-white shadow-md shadow-primary/30 scale-110"
                    : isDone
                    ? "bg-emerald-500 dark:bg-emerald-600 text-white hover:bg-emerald-600 dark:hover:bg-emerald-500"
                    : "border-2 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary/50 hover:text-primary"
                )}
              >
                {isLocked ? <Lock size={12} /> : idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit button + legend */}
      <div className={cn("px-4 pt-3 pb-4 border-t shrink-0 flex flex-col gap-3", portalDivider)}>
        <button
          type="button"
          onClick={onRequestFinish}
          disabled={finishing || !allAnswered}
          title={!allAnswered ? labels.answerAllHint : undefined}
          className="w-full h-10 rounded-xl text-[14px] font-bold text-white hr-cta-btn shimmer-button disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {finishing && <Loader2 size={14} className="animate-spin" />}
          {labels.submitBtn}
        </button>
        {!allAnswered && (
          <p className={cn("text-[11px] text-center -mt-1", portalSubtextAlt)}>{labels.answerAllHint}</p>
        )}

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
  /** Re-fetches this question set's data in place (e.g. after upgrading mid-session) without a full page reload. */
  onQuestionsUnlocked?: () => Promise<void> | void;
}

export function PracticeSession({ set, onQuestionsUnlocked }: PracticeSessionProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { addToast } = useToast();
  const { refreshSubscription } = useCandidateSubscription();
  const p = t.jobseekerPracticePage;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [direction, setDirection] = useState(1);
  const [exitOpen, setExitOpen] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  // Absolute deadline BE enforces server-side (startedAt + the set's configured
  // time limit); null = untimed. Unlike a client-tracked "elapsed since start"
  // countdown, this can't be paused by leaving the page — BE auto-completes at
  // this exact moment regardless of whether the candidate is looking at it, so
  // the display must match that rather than pretend time stops on exit.
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const hasTimeLimit = expiresAt !== null;
  /** Estimated duration in seconds (display guide only — not BE-enforced). */
  const estimatedTotalSeconds = (set.estimatedTimeMinutes ?? 0) * 60;
  /** True when no strict BE deadline but the set has an estimated time to count down from. */
  const hasEstimatedCountdown = !hasTimeLimit && estimatedTotalSeconds > 0;
  const [resumed, setResumed] = useState(false);
  const [starting, setStarting] = useState(true);
  const [startError, setStartError] = useState(false);
  const [startForbidden, setStartForbidden] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState(false);
  const [startAttempt, setStartAttempt] = useState(0);

  const [draftSaveStatus, setDraftSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restoredDraftIds = useRef(new Set<string>());
  const timeUpRef = useRef(false);
  const finishingRef = useRef(false);
  /** Đồng bộ với exitOpen state nhưng được set TRƯỚC khi gọi setState → không có race với setInterval. */
  const exitOpenRef = useRef(false);
  /** Timestamp (ms) khi dialog vừa mở — dùng để tính khoảng thời gian bị pause. */
  const pauseStartMsRef = useRef<number | null>(null);
  /** Tổng số ms đã bị pause — bù vào display deadline/startMs để tránh nhảy khi đóng dialog. */
  const pausedOffsetMsRef = useRef(0);
  const answersRef = useRef(answers);
  const currentIdxRef = useRef(currentIdx);
  const sessionIdRef = useRef(sessionId);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    currentIdxRef.current = currentIdx;
  }, [currentIdx]);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  useEffect(() => {
    finishingRef.current = finishing;
  }, [finishing]);

  // Wrappers đặt exitOpenRef & pauseStartMsRef ĐỒNG BỘ trước setState.
  // setInterval là macro-task → không thể chen vào giữa lệnh gán ref và cuối call-stack,
  // nên tick tiếp theo luôn thấy giá trị mới của ref.
  function openExitDialog() {
    pauseStartMsRef.current = Date.now();
    exitOpenRef.current = true;    // phải trước setExitOpen
    setExitOpen(true);
  }
  function closeExitDialog() {
    if (pauseStartMsRef.current !== null) {
      pausedOffsetMsRef.current += Date.now() - pauseStartMsRef.current;
      pauseStartMsRef.current = null;
    }
    exitOpenRef.current = false;   // phải trước setExitOpen
    setExitOpen(false);
  }

  const question = set.questions[currentIdx];
  const totalQuestions = set.questions.length;
  const progress = ((currentIdx + 1) / totalQuestions) * 100;
  const currentAnswer = answers[question.id] ?? "";
  // SCRUM-399: tách UX trả lời code vs lý thuyết
  const isCodeAnswer = needsCodeAnswer(question);
  const isQuestionLocked = question.isLocked === true;

  const answeredFlags: Record<string, boolean> = {};
  for (const q of set.questions) {
    answeredFlags[q.id] = hasAnswerText(answers[q.id]);
  }

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
        const answersMap: Record<string, string> = {};
        session.questions.forEach((q) => {
          if (q.answerText) {
            answersMap[q.id] = q.answerText;
          }
        });
        // Gộp draft sessionStorage (nếu có) cho câu chưa có text từ BE
        if (typeof window !== "undefined") {
          set.questions.forEach((q) => {
            if (hasAnswerText(answersMap[q.id])) return;
            const draft = window.sessionStorage.getItem(draftKey(session.id, q.id));
            if (draft) answersMap[q.id] = draft;
          });
        }
        const wasResumed = Object.keys(answersMap).some((id) => hasAnswerText(answersMap[id]));
        setSessionId(session.id);
        setStartedAt(session.startedAt ?? new Date().toISOString());
        setExpiresAt(session.expiresAt);
        setAnswers((prev) => ({ ...prev, ...answersMap }));
        setResumed(wasResumed);

        // Khôi phục offset "đóng băng" từ lần "Lưu & Thoát" trước, chỉ cho phiên
        // không có deadline cứng (estimated countdown / untimed) — phiên có expiresAt
        // phải hiển thị thời gian thực còn lại của server.
        if (!session.expiresAt && typeof window !== "undefined") {
          const savedOffset = window.sessionStorage.getItem(`practice-exit-offset-${session.id}`);
          const savedExitTs  = window.sessionStorage.getItem(`practice-exit-ts-${session.id}`);
          if (savedOffset && savedExitTs) {
            // Bù thêm thời gian điều hướng (từ lúc thoát đến lúc component này mount lại)
            const navigationMs = Date.now() - parseInt(savedExitTs, 10);
            pausedOffsetMsRef.current = parseInt(savedOffset, 10) + navigationMs;
            window.sessionStorage.removeItem(`practice-exit-offset-${session.id}`);
            window.sessionStorage.removeItem(`practice-exit-ts-${session.id}`);
          }
        }

        if (wasResumed) addToast("success", p.resumedToast);
        const firstUnanswered = set.questions.findIndex(
          (q) => !q.isLocked && !hasAnswerText(answersMap[q.id])
        );
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

  // ── Countdown timer (BE-enforced expiresAt) ─────────────────────────────────
  // Một effect duy nhất để time-up check và display update luôn đồng bộ.
  // exitOpen KHÔNG ở trong deps — interval chạy liên tục, exitOpenRef guard display.
  // Browsers throttle setInterval khi tab ở background; resync qua visibilitychange.
  useEffect(() => {
    if (!expiresAt || !sessionId) return;
    const realDeadlineMs = new Date(expiresAt).getTime();

    function tick() {
      if (finishingRef.current) return;

      // ① Time-up: dùng thời gian THỰC (không bù offset) — luôn chạy dù dialog mở.
      const realRemaining = Math.floor((realDeadlineMs - Date.now()) / 1000);
      if (realRemaining <= 0 && !timeUpRef.current) {
        timeUpRef.current = true;
        addToast("error", p.timeUpToast);
        void handleFinish();
        return; // navigating away, no display update needed
      }

      // ② Display: skip khi dialog mở (exitOpenRef set đồng bộ trước setExitOpen).
      if (exitOpenRef.current) return;

      // ③ Display dùng deadline đã bù pause offset → tiếp tục từ chỗ dừng, không nhảy.
      const displayRemaining = Math.floor((realDeadlineMs + pausedOffsetMsRef.current - Date.now()) / 1000);
      setTimeLeft(Math.max(0, displayRemaining));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, sessionId]);

  // ── Elapsed timer (phiên không giới hạn thời gian + estimated countdown) ──────
  // Tương tự: interval liên tục, exitOpenRef guard display, pausedOffset bù nhảy.
  // Với hasEstimatedCountdown: tự động nộp bài khi elapsed >= estimatedTotalSeconds.
  useEffect(() => {
    if (hasTimeLimit || !startedAt || !sessionId) return;
    const startMs = new Date(startedAt).getTime();
    function tick() {
      if (finishingRef.current) return;
      const displayElapsedMs = Date.now() - startMs - pausedOffsetMsRef.current;
      const elapsed = Math.max(0, Math.floor(displayElapsedMs / 1000));

      // Auto-submit khi hết giờ ước tính — luôn chạy dù dialog mở (giống BE-enforced timer).
      if (hasEstimatedCountdown && elapsed >= estimatedTotalSeconds && !timeUpRef.current) {
        timeUpRef.current = true;
        addToast("error", p.timeUpToast);
        void handleFinish();
        return; // đang chuyển trang, không cần update display
      }

      if (exitOpenRef.current) return; // đóng băng display khi dialog mở
      setElapsedSeconds(elapsed);
    }
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTimeLimit, startedAt, sessionId]);

  // Cảnh báo khi đóng tab nếu còn nội dung đã gõ (chưa nộp bài cuối)
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      const hasDraft = Object.values(answersRef.current).some((t) => hasAnswerText(t));
      if (hasDraft && !finishingRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Clear draft save status when the active question changes.
  useEffect(() => {
    setDraftSaveStatus("idle");
    if (draftSaveTimer.current) {
      clearTimeout(draftSaveTimer.current);
      draftSaveTimer.current = null;
    }
  }, [question.id]);

  // Restore draft từ sessionStorage cho câu hiện tại (một lần / câu), nếu state chưa có text.
  useEffect(() => {
    if (!sessionId || !question || typeof window === "undefined") return;
    if (restoredDraftIds.current.has(question.id)) return;
    restoredDraftIds.current.add(question.id);
    if (hasAnswerText(answers[question.id])) return;
    const saved = window.sessionStorage.getItem(draftKey(sessionId, question.id));
    if (saved) {
      setAnswers((prev) => (hasAnswerText(prev[question.id]) ? prev : { ...prev, [question.id]: saved }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, question.id]);

  /** Best-effort POST lên BE khi rời câu — không chặn UI, không hiện "AI đang nghĩ". */
  const persistAnswerBestEffort = useCallback(
    (questionId: string, text: string) => {
      const sid = sessionIdRef.current;
      if (!sid || !text.trim()) return;
      const q = set.questions.find((x) => x.id === questionId);
      if (!q || q.isLocked) return;
      const relax = needsCodeAnswer(q);
      if (validateAnswerText(text, { relaxWordCount: relax })) return;
      void submitAnswerApi(sid, { questionId, answerText: text }).catch(() => {
        // Im lặng — draft vẫn còn ở sessionStorage; Finish sẽ flush lại
      });
    },
    [set.questions]
  );

  function goToQuestion(idx: number) {
    const clamped = Math.min(Math.max(0, idx), totalQuestions - 1);
    if (clamped === currentIdx) return;
    // Persist câu đang xem trước khi chuyển (không chờ / không block)
    if (!isQuestionLocked && currentAnswer.trim()) {
      persistAnswerBestEffort(question.id, currentAnswer);
    }
    setDirection(clamped > currentIdx ? 1 : -1);
    setCurrentIdx(clamped);
  }

  function navigate(delta: number) {
    goToQuestion(currentIdx + delta);
  }

  function handleAnswerChange(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    if (sessionId && typeof window !== "undefined") {
      window.sessionStorage.setItem(draftKey(sessionId, question.id), value);
      // Debounced visual save status (600ms after last keystroke → show "saved" for 2s)
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
      setDraftSaveStatus("saving");
      draftSaveTimer.current = setTimeout(() => {
        setDraftSaveStatus("saved");
        draftSaveTimer.current = setTimeout(() => setDraftSaveStatus("idle"), 2000);
      }, 600);
    }
  }

  async function handleFinish() {
    const sid = sessionIdRef.current;
    if (!sid || finishingRef.current) return;
    setFinishing(true);
    finishingRef.current = true;
    setFinishError(false);
    try {
      const answersSnapshot = answersRef.current;
      const idx = currentIdxRef.current;

      // Flush mọi draft / câu hiện tại chưa POST lên BE trước khi complete
      for (const q of set.questions) {
        if (q.isLocked) continue;
        let text = answersSnapshot[q.id] ?? "";
        // Ưu tiên text đang gõ trên câu hiện tại
        if (q.id === set.questions[idx]?.id) {
          text = answersSnapshot[q.id] ?? "";
        }
        if (!text.trim() && typeof window !== "undefined") {
          text = window.sessionStorage.getItem(draftKey(sid, q.id)) ?? "";
        }
        if (!text.trim()) continue;
        const relax = needsCodeAnswer(q);
        const vErr = validateAnswerText(text, { relaxWordCount: relax });
        if (vErr) continue;
        await submitAnswerApi(sid, { questionId: q.id, answerText: text });
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(draftKey(sid, q.id));
        }
      }

      const result = await completePracticeSession(sid);
      // Persist XP reward across navigation so the result page can show it.
      if (result.xpReward && typeof window !== "undefined") {
        window.sessionStorage.setItem(
          `practice-xp-reward-${sid}`,
          JSON.stringify(result.xpReward)
        );
        // Snapshot the updated UserProgress returned by /complete so the
        // GamificationProgressCard shows the correct XP immediately even if
        // GET /api/candidate/gamification/progress hasn't been updated yet.
        const snapProgress = result.xpReward.progress;
        if (snapProgress) {
          window.sessionStorage.setItem(
            "gamification-progress-snapshot",
            JSON.stringify({ progress: snapProgress, ts: Date.now() })
          );
        }
        // Snapshot individual reward breakdown for the XP History section.
        // GET /api/candidate/gamification/xp-history may lag — snapshot gives
        // the user immediate feedback that their XP was recorded.
        const { rewards } = result.xpReward;
        if (rewards && rewards.length > 0) {
          const now = new Date().toISOString();
          window.sessionStorage.setItem(
            "gamification-xp-history-snapshot",
            JSON.stringify({
              entries: rewards.map((r, i) => ({
                id: `snap-${sid}-${i}`,
                type: r.type,
                xp: r.xp,
                label: r.label,
                earnedAt: now,
              })),
              ts: Date.now(),
            })
          );
        }
      }
      router.push(`/jobseeker/practice/${sid}/result`);
    } catch {
      // BE now enforces the question set's own time limit server-side and can
      // auto-complete a session before our client-side auto-submit reaches it —
      // complete() then 400s even though the session is actually done.
      const existing = await getPracticeSession(sid).catch(() => null);
      if (existing && existing.status !== "IN_PROGRESS") {
        router.push(`/jobseeker/practice/${sid}/result`);
        return;
      }
      setFinishError(true);
      setFinishing(false);
      finishingRef.current = false;
      addToast("error", p.finishFailed);
    }
  }

  async function handleSaveAndExit() {
    const sid = sessionIdRef.current;
    if (!sid) {
      router.push(`/jobseeker/sets/${set.id}`);
      return;
    }

    // Lưu tổng thời gian bị "đóng băng" (bao gồm cả khoảng dialog đang mở ngay lúc này).
    // Khi người dùng "Tiếp Tục Luyện Tập", component mount lại → offset sẽ bị mất.
    // Lưu vào sessionStorage để khôi phục, giúp timer tiếp tục từ chỗ đã dừng.
    if (typeof window !== "undefined") {
      const dialogOpenMs = pauseStartMsRef.current !== null
        ? Date.now() - pauseStartMsRef.current
        : 0;
      const totalOffset = pausedOffsetMsRef.current + dialogOpenMs;
      window.sessionStorage.setItem(`practice-exit-offset-${sid}`, String(totalOffset));
      window.sessionStorage.setItem(`practice-exit-ts-${sid}`, String(Date.now()));
    }

    // Flush câu đang trả lời (nếu hợp lệ) trước khi thoát — phiên vẫn IN_PROGRESS trên server
    const currentQ = set.questions[currentIdxRef.current];
    if (currentQ && !currentQ.isLocked) {
      const text = answersRef.current[currentQ.id] ?? "";
      if (text.trim()) {
        const relax = needsCodeAnswer(currentQ);
        if (!validateAnswerText(text, { relaxWordCount: relax })) {
          try {
            await submitAnswerApi(sid, { questionId: currentQ.id, answerText: text });
          } catch {
            // best-effort — phiên vẫn còn trong sessionStorage
          }
        }
      }
    }
    router.push(`/jobseeker/sets/${set.id}`);
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

  const answerableQuestions = set.questions.filter((q) => !q.isLocked);

  // ── Timer display helpers ─────────────────────────────────────────────────
  // isCountdown: true for both BE-enforced (expiresAt) and estimate-based countdowns
  const isCountdown = hasTimeLimit || hasEstimatedCountdown;
  // Unified seconds to show in both top-bar and sidebar
  const timerSeconds = hasTimeLimit
    ? timeLeft
    : hasEstimatedCountdown
      ? Math.max(0, estimatedTotalSeconds - elapsedSeconds)
      : elapsedSeconds;
  // Red warning: < 5 min remaining on any countdown
  const isTimerWarning = isCountdown && timerSeconds < 300;

  // SCRUM-333: đủ điều kiện nộp khi mọi câu unlock đã có nội dung — không cần bấm Save từng câu
  const allAnswered =
    answerableQuestions.length === 0 ||
    answerableQuestions.every((q) => hasAnswerText(answers[q.id]));
  const unansweredCount = answerableQuestions.filter((q) => !hasAnswerText(answers[q.id])).length;

  // A prior finish attempt already failed — retry directly, don't re-open review.
  // Otherwise this is a fresh submit request, so confirm via the review dialog first.
  function requestFinish() {
    if (finishError) {
      void handleFinish();
      return;
    }
    setReviewOpen(true);
  }

  function goToFirstUnanswered() {
    const idx = set.questions.findIndex((q) => !q.isLocked && !hasAnswerText(answers[q.id]));
    if (idx === -1) return;
    goToQuestion(idx);
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
      onConfirm={() => { void handleSaveAndExit(); }}
      onCancel={() => closeExitDialog()}
      extraAction={{ label: p.abandonBtn, onClick: handleAbandon, loading: abandoning }}
    />
    <ConfirmDialog
      open={reviewOpen}
      title={p.reviewConfirmTitle}
      message={p.reviewConfirmMessage
        .replace("{{count}}", String(totalQuestions))
        .replace(/^[^.]+\d+[^.]*câu hỏi\.\s*/i, "")
        .replace(/^You've answered all \d+ questions\.\s*/i, "")}
      confirmLabel={p.reviewConfirmBtn}
      cancelLabel={p.reviewCancelBtn}
      variant="primary"
      loading={finishing}
      onConfirm={() => { setReviewOpen(false); void handleFinish(); }}
      onCancel={() => setReviewOpen(false)}
    />
    <div className="min-h-screen hr-main-bg flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className={cn("hr-topbar px-4 md:px-8 h-14 flex items-center justify-between shrink-0 border-b gap-2", portalDivider)}>
        {/* Left: set info */}
        <div className="flex items-center gap-2 min-w-0">
          {set.companyLogoUrl ? (
            <img
              src={set.companyLogoUrl}
              alt={set.company}
              className="w-7 h-7 rounded-lg object-cover shrink-0 border border-gray-100/20 dark:border-gray-700"
            />
          ) : (
            <div className={cn("w-7 h-7 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", set.companyColor)}>
              {set.companyInitials}
            </div>
          )}
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
              className="h-full practice-bar-fill rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className={cn("text-[11px] sm:text-[12px] font-semibold shrink-0 tabular-nums", portalSubtextAlt)}>
            {p.question} {currentIdx + 1} {p.of} {totalQuestions}
          </span>
        </div>

        {/* Right: exit */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            type="button"
            onClick={() => openExitDialog()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={p.exitConfirmBtn}
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* ── Body (main + sidebar) ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto scrollbar-hide py-6 px-3 sm:px-6">
        <div className="w-full flex gap-5 items-start">
        <div className="flex-1 flex flex-col gap-5">

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
              {isQuestionLocked ? (
                <div className="relative rounded-xl overflow-hidden border border-[#6c47ff]/20 dark:border-[#6c47ff]/25 bg-gradient-to-br from-[#6c47ff]/[0.05] via-transparent to-transparent min-h-[180px]">
                  {/* Blurred placeholder */}
                  <div className="blur-xl select-none pointer-events-none opacity-10 p-6">
                    <p className={cn("text-[17px] sm:text-[20px] font-bold leading-7", portalHeadingAlt)}>
                      {p.lockedQuestion.blurredPlaceholder}
                    </p>
                  </div>
                  {/* Fade-in overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white/95 dark:via-gray-900/50 dark:to-gray-900/95" />
                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 px-6 py-8 text-center">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#6c47ff]/25 bg-[#6c47ff]/10 px-3 py-1">
                      <Crown size={11} className="text-[#6c47ff]" />
                      <span className="text-[10px] font-bold tracking-widest uppercase text-[#6c47ff]">Premium</span>
                    </div>
                    <div>
                      <p className={cn("text-[15px] font-bold", portalHeadingAlt)}>
                        {p.lockedQuestion.title}
                      </p>
                      <p className={cn("mt-1.5 text-[12px] max-w-xs mx-auto leading-relaxed", portalSubtextAlt)}>
                        {p.lockedQuestion.body}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUpgradeOpen(true)}
                      className="shimmer-button inline-flex items-center gap-2 h-9 px-5 text-[13px] font-semibold text-white hr-cta-btn rounded-xl"
                    >
                      <Sparkles size={13} />
                      {p.lockedQuestion.upgradeBtn}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <QuestionContent
                    text={question.text}
                    className={cn("text-[17px] sm:text-[20px] font-bold leading-6.5 sm:leading-7.5", portalHeadingAlt)}
                  />
                  {/* SCRUM-399: starter code từ template HR */}
                  {question.codeSnippet?.trim() ? (
                    <CodeSnippetBlock
                      code={question.codeSnippet}
                      variant="question"
                      className="mt-1"
                    />
                  ) : null}
                  {/* SCRUM-399: ảnh đính kèm HR (SAS) */}
                  {question.attachedImageUrl ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={question.attachedImageUrl}
                        alt={question.codeTemplateType
                          ? `Question attachment (${question.codeTemplateType})`
                          : "Question attachment"}
                        className="max-h-80 w-full object-contain"
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Answer area — luôn editable; chỉ nộp khi Finish (SCRUM-333) */}
          <div className="hr-glass-card p-4 sm:p-6">
            {isQuestionLocked ? (
              <div className="flex items-center justify-center gap-2 py-5 text-center">
                <p className={cn("text-[13px]", portalSubtextAlt)}>
                  {p.lockedQuestion.answerLocked}
                </p>
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(true)}
                  className="shrink-0 text-[13px] font-semibold text-primary hover:underline"
                >
                  {p.lockedQuestion.upgradeBtn} →
                </button>
              </div>
            ) : (
              <>
                {isCodeAnswer ? (
                  <div className="overflow-hidden rounded-lg border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-gray-950">
                    <div className="flex items-center justify-between gap-2 border-b border-violet-200 dark:border-violet-900/60 bg-violet-100 dark:bg-violet-950 px-3 py-1.5">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-violet-600 dark:bg-violet-800/80 text-white dark:text-violet-100">
                        {p.codeAnswerLabel}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 dark:text-gray-400">
                        code
                      </span>
                    </div>
                    <textarea
                      value={currentAnswer}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      onBlur={() => {
                        if (currentAnswer.trim()) persistAnswerBestEffort(question.id, currentAnswer);
                      }}
                      placeholder={p.codeAnswerPlaceholder}
                      spellCheck={false}
                      className={cn(
                        "w-full min-h-40 sm:min-h-52 bg-transparent px-3 py-3 outline-none resize-y",
                        "font-mono text-[12px] leading-relaxed text-gray-900 dark:text-violet-100",
                        "placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      )}
                    />
                  </div>
                ) : (
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    onBlur={() => {
                      if (currentAnswer.trim()) persistAnswerBestEffort(question.id, currentAnswer);
                    }}
                    placeholder={p.answerPlaceholder}
                    className={cn(
                      "w-full min-h-35 sm:min-h-45 text-[14px] font-normal bg-transparent outline-none resize-none leading-6",
                      portalHeadingAlt,
                      "placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    )}
                  />
                )}
                <div className={cn("flex items-center justify-between mt-3 pt-3 border-t", portalDivider)}>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[12px] font-medium",
                      currentAnswer.length < (isCodeAnswer ? MIN_ANSWER_CHARS : 150)
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {currentAnswer.length} {p.characters}
                      {!isCodeAnswer && currentAnswer.length < 150 && (
                        <span className="text-gray-400 dark:text-gray-500"> · {p.minRecommended}</span>
                      )}
                    </span>
                    {draftSaveStatus === "saving" && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                        <Loader2 size={10} className="animate-spin" />
                        {p.autoSaving}
                      </span>
                    )}
                    {draftSaveStatus === "saved" && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-500 dark:text-emerald-400">
                        <Save size={10} />
                        {p.autoSaved}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Dot progress indicator */}
          <div className="flex items-center justify-center gap-2">
            {set.questions.map((q, idx) => (
              <ProgressDot
                key={q.id}
                active={idx === currentIdx}
                answered={answeredFlags[q.id] ?? false}
                onClick={() => goToQuestion(idx)}
              />
            ))}
          </div>

          {/* Navigation buttons — pushed below the stats panel on mobile */}
          <div className="flex items-center justify-between order-last lg:order-0">
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
                    onClick={requestFinish}
                    disabled={finishing}
                    className="relative shimmer-button flex items-center gap-2 h-10 px-6 text-[14px] font-semibold text-white hr-cta-btn rounded-xl disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {finishing ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        {p.finishing}
                      </>
                    ) : (
                      p.finishBtn
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
            ) : currentIdx === totalQuestions - 1 ? (
              <div className="flex flex-col items-end gap-1.5">
                <p className="hidden lg:flex items-center gap-1.5 text-[12px] font-medium text-amber-600 dark:text-amber-400">
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

          {/* ── Mobile stats panel (hidden on lg+) ── */}
          <div className="lg:hidden hr-glass-card p-3 flex flex-col gap-2.5">
            {/* One compact row: stats left · question buttons right */}
            <div className="flex items-center gap-3">
              {/* Answered + timer */}
              <div className="shrink-0 flex items-center gap-3">
                <div>
                  <p className={cn("text-[10px] font-medium leading-none mb-1", portalSubtextAlt)}>
                    {p.sidebarAnsweredLabel}
                  </p>
                  <p className={cn("text-[18px] font-bold tabular-nums leading-none", portalHeadingAlt)}>
                    {answerableQuestions.length - unansweredCount}
                    <span className={cn("text-[12px] font-normal", portalSubtextAlt)}>
                      /{answerableQuestions.length}
                    </span>
                  </p>
                </div>
                <div className="h-7 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div>
                  <p className={cn("text-[10px] font-medium leading-none mb-1", portalSubtextAlt)}>
                    {isCountdown ? p.sidebarTimeLabel : p.timeUsedLabel}
                  </p>
                  <p className={cn(
                    "text-[18px] font-bold tabular-nums leading-none",
                    isTimerWarning ? "text-red-500" : isCountdown ? "text-primary" : portalHeadingAlt
                  )}>
                    {formatTime(timerSeconds)}
                  </p>
                </div>
              </div>

              {/* Question buttons — fill right side, wrap if many */}
              <div className="flex-1 flex flex-wrap gap-1.5 justify-end">
                {set.questions.map((q, idx) => {
                  const isActive = idx === currentIdx;
                  const isDone = answeredFlags[q.id] ?? false;
                  const isLocked = q.isLocked === true;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => goToQuestion(idx)}
                      title={
                        isLocked ? "Premium"
                          : isActive ? p.questionCurrent
                          : isDone ? p.questionAnswered
                          : p.questionUnanswered
                      }
                      className={cn(
                        "w-8 h-8 rounded-full text-[12px] font-bold transition-all flex items-center justify-center shrink-0",
                        isLocked
                          ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700"
                          : isActive
                          ? "bg-primary text-white shadow-md shadow-primary/30 scale-110"
                          : isDone
                          ? "bg-emerald-500 dark:bg-emerald-600 text-white"
                          : "border-2 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {isLocked ? <Lock size={11} /> : idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit button */}
            <button
              type="button"
              onClick={requestFinish}
              disabled={finishing || !allAnswered}
              title={!allAnswered ? p.answerAllToFinish.replace("{{count}}", String(unansweredCount)) : undefined}
              className="w-full h-10 rounded-xl text-[14px] font-bold text-white hr-cta-btn shimmer-button disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {finishing && <Loader2 size={14} className="animate-spin" />}
              {p.sidebarSubmitBtn}
            </button>
            {!allAnswered && (
              <p className={cn("text-[11px] text-center -mt-1", portalSubtextAlt)}>
                {p.answerAllToFinish.replace("{{count}}", String(unansweredCount))}
              </p>
            )}
          </div>

        </div>{/* end cards column */}

      <QuestionNav
        questions={set.questions}
        currentIdx={currentIdx}
        answered={answeredFlags}
        onSelect={goToQuestion}
        onRequestFinish={requestFinish}
        finishing={finishing}
        isCountdown={isCountdown}
        timerSeconds={timerSeconds}
        isTimerWarning={isTimerWarning}
        labels={{
          title: p.questionListTitle,
          answered: p.questionAnswered,
          current: p.questionCurrent,
          unanswered: p.questionUnanswered,
          answeredLabel: p.sidebarAnsweredLabel,
          timeLabel: p.sidebarTimeLabel,
          submitBtn: p.sidebarSubmitBtn,
          timeUsedLabel: p.timeUsedLabel,
          answerAllHint: p.answerAllToFinish.replace("{{count}}", String(unansweredCount)),
        }}
      />
      </div>{/* end content row */}
      </div>{/* end body wrapper */}
    </div>
    {upgradeOpen && (
      <UpgradeModal
        onClose={() => setUpgradeOpen(false)}
        onDone={async () => {
          setUpgradeOpen(false);
          await refreshSubscription();
          await onQuestionsUnlocked?.();
          addToast("success", p.lockedQuestion.upgradedToast);
        }}
      />
    )}
    </>
  );
}
