"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  BookMarked,
} from "lucide-react";
import { JdInputCard } from "./jd-input-card";
import { FileUploadArea } from "./file-upload-area";
import { PlanEditCard } from "./plan-edit-card";
import { ReviewQuestionsSection } from "@/components/results/review-questions-section";
import type { PlanDraft, QuestionType, GeneratedQuestion } from "@/types/generation-session";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { isOverPlanUsageQuota } from "@/data/hr-subscription";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import {
  portalCard,
  portalHeading,
  portalSubtext,
  portalInput,
  portalMutedBg,
} from "@/lib/portal-ui";
import {
  createGenerationJob,
  getGenerationJob,
  updateJobPlan,
  approvePlan,
  retryPlan,
  retryQuestions,
  updateJobInput,
  getJobQuestions,
} from "@/lib/api/generation";

// ── Step indicator ───────────────────────────────────────────────────────────

const FLOW_STEPS = [
  "Nhập JD",
  "Tạo Plan",
  "Review Plan",
  "Generate",
  "Review Kết quả",
];

type FlowView = "form" | "polling" | "plan_review" | "question_review" | "failed" | "draft_view";

function viewToStep(view: FlowView, pollingPhase: "plan" | "questions"): number {
  switch (view) {
    case "form":            return 1;
    case "polling":         return pollingPhase === "plan" ? 2 : 4;
    case "plan_review":     return 3;
    case "question_review": return 5;
    case "failed":          return 2;
    case "draft_view":      return 5;
    default:                return 1;
  }
}

function FlowStepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0.5 mb-6 overflow-x-auto pb-1 select-none">
      {FLOW_STEPS.map((label, i) => {
        const stepNum = i + 1;
        const done   = stepNum < currentStep;
        const active = stepNum === currentStep;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1 min-w-13">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-primary text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                )}
              >
                {done ? <CheckCircle2 size={14} /> : stepNum}
              </div>
              <span
                className={cn(
                  "text-[9px] font-medium text-center leading-tight",
                  active
                    ? "text-primary"
                    : done
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400 dark:text-gray-500"
                )}
              >
                {label}
              </span>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div
                className={cn(
                  "w-6 h-0.5 mx-0.5 mb-4 shrink-0 transition-colors",
                  stepNum < currentStep
                    ? "bg-emerald-400"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function GenerateForm() {
  const { t }  = useLanguage();
  const { planId, limits, hasFeature } = useHrSubscription();

  // ── Form inputs ──
  const [view,    setView]    = useState<FlowView>("form");
  const [jdText,  setJdText]  = useState("");
  const [jdFile,  setJdFile]  = useState<File | null>(null);
  const [note,    setNote]    = useState("");

  // ── Job state ──
  const [jobId,     setJobId]     = useState<string | null>(null);
  const [plan,      setPlan]      = useState<PlanDraft | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);

  // ── Polling state ──
  const [pollingPhase,   setPollingPhase]   = useState<"plan" | "questions">("plan");
  const [statusLabel,    setStatusLabel]    = useState<string>("Đang xử lý...");
  const [isApproving,    setIsApproving]    = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingActiveRef = useRef(false);
  // Track which phase we're polling so REVIEW_PLAN is ignored while waiting for questions
  const pollingPhaseRef = useRef<"plan" | "questions">("plan");

  // ── Error / recovery state ──
  const [formError,      setFormError]      = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [canRetryPlan,   setCanRetryPlan]   = useState(false);
  const [canRetryQs,     setCanRetryQs]     = useState(false);
  const [canEditInput,   setCanEditInput]   = useState(false);

  const quotaBlocked     = isOverPlanUsageQuota(planId);
  const aiBlocked        = !hasFeature("aiPoweredGeneration");
  const generateDisabled = quotaBlocked || aiBlocked;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingActiveRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  // ── Polling loop ──────────────────────────────────────────────────────────

  const pollJob = useCallback(async (jId: string) => {
    if (!pollingActiveRef.current) return;

    try {
      const session = await getGenerationJob(jId);
      if (!session || !pollingActiveRef.current) return;

      if (session.isPolling) {
        setStatusLabel(session.statusLabel ?? "Đang xử lý...");
        pollingRef.current = setTimeout(() => pollJob(jId), 3000);
        return;
      }

      const action = session.suggestedAction ?? "";
      const inQuestionsPhase = pollingPhaseRef.current === "questions";

      // REVIEW_PLAN: only honour when waiting for plan, not when waiting for questions
      if (action === "REVIEW_PLAN" && !inQuestionsPhase) {
        setPlan(session.planDraft ?? buildDefaultPlan());
        setView("plan_review");
        return;
      }

      if (action === "REVIEW_QUESTIONS") {
        const qs = await getJobQuestions(jId);
        setQuestions(qs.length ? qs : session.generatedQuestions ?? []);
        setView("question_review");
        return;
      }

      if (action === "EDIT_INPUT") {
        setFailureMessage(session.failureMessage ?? "Có lỗi xảy ra với input.");
        setCanEditInput(true);
        setCanRetryPlan(false);
        setCanRetryQs(false);
        setView("failed");
        return;
      }

      if (action === "RETRY_PLAN" && !inQuestionsPhase) {
        setFailureMessage(session.failureMessage ?? "Tạo plan thất bại.");
        setCanRetryPlan(true);
        setCanEditInput(false);
        setCanRetryQs(false);
        setView("failed");
        return;
      }

      if (action === "RETRY_QUESTIONS") {
        setFailureMessage(session.failureMessage ?? "Tạo câu hỏi thất bại.");
        setCanRetryQs(true);
        setCanRetryPlan(false);
        setCanEditInput(false);
        setView("failed");
        return;
      }

      if (action === "VIEW_DRAFT") {
        setView("draft_view");
        return;
      }

      // Fallback: inspect status when BE does not send expected suggestedAction
      const s = session.status;
      if (s === "COMPLETED") {
        const qs = await getJobQuestions(jId);
        setQuestions(qs.length ? qs : session.generatedQuestions ?? []);
        setView("question_review");
      } else if (s === "FAILED") {
        setFailureMessage(session.failureMessage ?? "Đã xảy ra lỗi.");
        setCanRetryPlan(session.canRetryPlan ?? false);
        setCanRetryQs(session.canRetryQuestions ?? false);
        setCanEditInput(session.canEditInput ?? false);
        setView("failed");
      } else if (s === "PLAN_PROPOSED" && !inQuestionsPhase) {
        setPlan(session.planDraft ?? buildDefaultPlan());
        setView("plan_review");
      } else {
        // Still processing — keep polling
        pollingRef.current = setTimeout(() => pollJob(jId), 3000);
      }
    } catch {
      if (pollingActiveRef.current) {
        pollingRef.current = setTimeout(() => pollJob(jId), 5000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPolling(jId: string, phase: "plan" | "questions") {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    pollingActiveRef.current = true;
    pollingPhaseRef.current = phase;
    setPollingPhase(phase);
    setView("polling");
    pollJob(jId);
  }

  // ── Step 1: Submit form ───────────────────────────────────────────────────

  function buildDefaultPlan(): PlanDraft {
    return {
      role:          "",
      level:         "",
      questionCount: Math.min(10, limits.maxQuestionsPerRun),
      questionTypes: ["Technical", "Behavioral"] as QuestionType[],
      topics:        [],
      constraints:   note || undefined,
    };
  }

  async function handleSubmitForm() {
    if (!jdText.trim() && !jdFile) {
      setFormError("Vui lòng nhập mô tả công việc hoặc tải lên file JD.");
      return;
    }
    const wordCount = jdText.trim().split(/\s+/).filter(Boolean).length;
    if (jdText.trim() && wordCount < 100 && !jdFile) {
      setFormError(`Mô tả công việc cần ít nhất 100 từ (hiện tại: ${wordCount} từ).`);
      return;
    }

    setFormError(null);
    setStatusLabel("Đang tạo job...");

    const jId = await createGenerationJob({
      jobDescription:    jdText        || undefined,
      hrNote:            note          || undefined,
      numberOfQuestions: Math.min(10, limits.maxQuestionsPerRun),
      difficulty:        "medium",
      questionTypes:     ["technical", "behavioral"],
    });

    if (!jId) {
      setFormError("Không thể tạo job. Vui lòng kiểm tra lại nội dung JD và thử lại.");
      return;
    }

    setJobId(jId);
    startPolling(jId, "plan");
  }

  // ── Step 3: Approve plan ──────────────────────────────────────────────────

  async function handleApprovePlan() {
    if (!jobId || !plan) return;
    setIsApproving(true);
    setFormError(null);

    try {
      // Push edited plan fields to BE first (notes must be a string, not null)
      await updateJobPlan(jobId, {
        roleTitle:      plan.role,
        totalQuestions: plan.questionCount,
        questionTypes:  plan.questionTypes,
        skills:         plan.topics,
        notes:          plan.constraints ?? "",
      });
      await approvePlan(jobId);
      startPolling(jobId, "questions");
    } catch {
      setFormError("Không thể approve plan. Vui lòng thử lại.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleRetryPlanFromReview() {
    if (!jobId) return;
    const ok = await retryPlan(jobId);
    if (ok) {
      startPolling(jobId, "plan");
    } else {
      setFormError("Không thể retry plan. Vui lòng thử lại.");
    }
  }

  // ── Recovery from failed state ────────────────────────────────────────────

  async function handleRetryPlanFromFailed() {
    if (!jobId) return;
    setFormError(null);
    const ok = await retryPlan(jobId);
    if (ok) startPolling(jobId, "plan");
    else setFormError("Retry thất bại.");
  }

  async function handleRetryQuestionsFromFailed() {
    if (!jobId) return;
    setFormError(null);
    const ok = await retryQuestions(jobId);
    if (ok) startPolling(jobId, "questions");
    else setFormError("Retry thất bại.");
  }

  async function handleEditInputResubmit() {
    if (!jobId) return;
    if (!jdText.trim() && !jdFile) {
      setFormError("Vui lòng nhập JD.");
      return;
    }
    setFormError(null);
    const ok = await updateJobInput(jobId, {
      jobDescription: jdText || undefined,
      hrNote:         note   || undefined,
    });
    if (ok) startPolling(jobId, "plan");
    else setFormError("Cập nhật input thất bại.");
  }

  function handleReset() {
    pollingActiveRef.current = false;
    if (pollingRef.current) clearTimeout(pollingRef.current);
    setView("form");
    setJdText("");
    setJdFile(null);
    setNote("");
    setJobId(null);
    setPlan(null);
    setQuestions([]);
    setFormError(null);
    setFailureMessage(null);
    setIsApproving(false);
    setCanRetryPlan(false);
    setCanRetryQs(false);
    setCanEditInput(false);
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const currentStep = viewToStep(view, pollingPhase);

  // ── Render: Polling ───────────────────────────────────────────────────────

  if (view === "polling") {
    return (
      <div className="max-w-3xl space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={currentStep} />
        <div className={cn(portalCard, "shadow-sm p-12 flex flex-col items-center gap-5")}>
          <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
            <Sparkles size={26} className="text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className={cn("text-base font-semibold", portalHeading)}>
              {pollingPhase === "plan"
                ? "AI đang phân tích mô tả công việc…"
                : "AI đang tạo câu hỏi phỏng vấn…"}
            </p>
            <p className={cn("text-sm", portalSubtext)}>{statusLabel}</p>
          </div>
          <Loader2 size={22} className="text-primary animate-spin" />
        </div>
      </div>
    );
  }

  // ── Render: Plan Review ───────────────────────────────────────────────────

  if (view === "plan_review" && plan) {
    return (
      <div className="max-w-3xl space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={currentStep} />

        {formError && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {formError}
          </div>
        )}

        <PlanEditCard
          plan={plan}
          isApproving={isApproving}
          onPlanChange={setPlan}
          onApprove={handleApprovePlan}
          onRetryPlan={handleRetryPlanFromReview}
          onBack={() => setView("form")}
        />
      </div>
    );
  }

  // ── Render: Question Review ───────────────────────────────────────────────

  if (view === "question_review" && jobId) {
    return (
      <div className="max-w-3xl space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={currentStep} />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <div>
            <h2 className={cn("text-base font-semibold", portalHeading)}>
              {questions.length} câu hỏi đã được tạo
            </h2>
            <p className={cn("text-xs", portalSubtext)}>
              Review và chỉnh sửa trước khi lưu bản nháp
            </p>
          </div>
        </div>

        <ReviewQuestionsSection
          sessionId={jobId}
          initialQuestions={questions}
          status="COMPLETED"
        />

        <button
          type="button"
          onClick={handleReset}
          className={cn(
            "w-full py-2.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
            portalHeading
          )}
        >
          Tạo bộ câu hỏi mới
        </button>
      </div>
    );
  }

  // ── Render: Failed ────────────────────────────────────────────────────────

  if (view === "failed") {
    return (
      <div className="max-w-3xl space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={currentStep} />

        <div className={cn(portalCard, "shadow-sm p-8 space-y-4")}>
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className={cn("text-base font-semibold", portalHeading)}>
                Đã xảy ra lỗi
              </p>
              {failureMessage && (
                <p className={cn("text-sm mt-1", portalSubtext)}>{failureMessage}</p>
              )}
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {formError}
            </div>
          )}

          {canEditInput && (
            <div className="space-y-3 border-t pt-4">
              <p className={cn("text-sm font-medium", portalHeading)}>
                Chỉnh sửa JD và thử lại:
              </p>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={6}
                className={cn(
                  "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
                  portalInput
                )}
              />
              <button
                type="button"
                onClick={handleEditInputResubmit}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-[#5535dd] transition-colors"
              >
                <RotateCcw size={14} />
                Gửi lại
              </button>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {canRetryPlan && (
              <button
                type="button"
                onClick={handleRetryPlanFromFailed}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
              >
                <RotateCcw size={14} />
                Retry Tạo Plan
              </button>
            )}
            {canRetryQs && (
              <button
                type="button"
                onClick={handleRetryQuestionsFromFailed}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-[#5535dd] transition-colors"
              >
                <RotateCcw size={14} />
                Retry Tạo Câu Hỏi
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                portalHeading
              )}
            >
              Bắt đầu lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Draft View ────────────────────────────────────────────────────

  if (view === "draft_view") {
    return (
      <div className="max-w-3xl space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={5} />
        <div className={cn(portalCard, "shadow-sm p-8 flex flex-col items-center gap-4 text-center")}>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
            <BookMarked size={22} className="text-emerald-500" />
          </div>
          <p className={cn("text-base font-semibold", portalHeading)}>
            Bản nháp đã được lưu
          </p>
          <p className={cn("text-sm", portalSubtext)}>
            Câu hỏi đã lưu vào lịch sử. Bạn có thể xem lại ở trang History.
          </p>
          <div className="flex gap-3">
            <Link
              href="/hr/history"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-[#5535dd] transition-colors"
            >
              Xem History
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                portalHeading
              )}
            >
              Tạo mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Form (Step 1) ─────────────────────────────────────────────────

  return (
    <div className="max-w-3xl space-y-4">
      <FlowStepIndicator currentStep={1} />

      {aiBlocked && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/90 dark:bg-indigo-950/40 px-4 py-3 text-sm text-indigo-950 dark:text-indigo-200 animate-fade-up">
          <p className="font-semibold mb-1">{t.generatePage.noAiPlan.title}</p>
          <p className="mb-2">{t.generatePage.noAiPlan.body}</p>
          <Link href="/hr/settings#billing" className="inline-flex font-semibold text-primary hover:underline">
            {t.generatePage.noAiPlan.goToPlans}
          </Link>
        </div>
      )}

      {quotaBlocked && !aiBlocked && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-200 animate-fade-up">
          <p className="font-semibold mb-1">{t.generatePage.quota.exceededTitle}</p>
          <p className="mb-2">{t.generatePage.quota.exceededBody}</p>
          <Link href="/hr/settings#billing" className="inline-flex font-semibold text-primary hover:underline">
            {t.generatePage.quota.goToBilling}
          </Link>
        </div>
      )}

      {formError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400 animate-fade-up">
          {formError}
        </div>
      )}

      <div className="animate-fade-up">
        <JdInputCard value={jdText} onChange={setJdText} />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <FileUploadArea onFileChange={setJdFile} />
      </div>

      <div
        className={cn(portalCard, "shadow-sm p-6 space-y-2 animate-fade-up")}
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-base font-semibold", portalHeading)}>Ghi chú cho AI</span>
          <span className={cn("text-xs", portalSubtext)}>(tùy chọn)</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="VD: Tập trung vào System Design, phỏng vấn bằng tiếng Anh, ưu tiên câu hỏi thực tế..."
          rows={3}
          className={cn(
            "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
            portalInput
          )}
        />
      </div>

      <button
        type="button"
        onClick={handleSubmitForm}
        disabled={generateDisabled || (!jdText.trim() && !jdFile)}
        className={cn(
          "w-full flex items-center justify-center gap-2 font-semibold text-sm px-6 py-3.5 rounded-lg transition-colors animate-fade-up",
          "bg-primary hover:bg-[#5535dd] text-white",
          "disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
        )}
        style={{ animationDelay: "180ms" }}
      >
        <Sparkles size={15} />
        Tạo Plan
      </button>
    </div>
  );
}

// ── Inline question card ──────────────────────────────────────────────────────

export function GeneratedQuestionCard({
  question,
  index,
}: {
  question: GeneratedQuestion;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const diffColor =
    question.difficulty === "Hard"
      ? "text-red-600 bg-red-50 dark:bg-red-950/30"
      : question.difficulty === "Easy"
      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
      : "text-amber-600 bg-amber-50 dark:bg-amber-950/30";

  const hasDetails = question.rationale || question.sampleAnswer;

  return (
    <div className={cn(portalCard, "p-4 space-y-2 shadow-sm")}>
      <div className="flex items-start gap-3">
        <span className={cn("text-xs font-bold mt-0.5 shrink-0 w-6 text-right", portalSubtext)}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
              {question.questionType}
            </span>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", diffColor)}>
              {question.difficulty}
            </span>
          </div>
          <p className={cn("text-sm font-medium leading-relaxed", portalHeading)}>
            {question.question}
          </p>
        </div>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              portalSubtext
            )}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>

      {expanded && hasDetails && (
        <div className={cn("ml-9 space-y-2 border-t pt-2 rounded-lg p-3", portalMutedBg, "bg-transparent")}>
          {question.rationale && (
            <div>
              <p className={cn("text-xs font-semibold mb-0.5", portalSubtext)}>Lý do</p>
              <p className={cn("text-sm leading-relaxed", portalHeading)}>{question.rationale}</p>
            </div>
          )}
          {question.sampleAnswer && (
            <div>
              <p className={cn("text-xs font-semibold mb-0.5", portalSubtext)}>Câu trả lời mẫu</p>
              <p className={cn("text-sm leading-relaxed", portalHeading)}>{question.sampleAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
