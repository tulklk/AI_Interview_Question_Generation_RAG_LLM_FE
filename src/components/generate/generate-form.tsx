"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import { JdInputCard } from "./jd-input-card";
import { FileUploadArea } from "./file-upload-area";
import { GeneratingProgress } from "./generating-progress";
import { PlanEditCard } from "./plan-edit-card";
import type { GenerateView } from "@/types/generate";
import type { PlanDraft, QuestionType, GeneratedQuestion } from "@/types/generation-session";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { isOverPlanUsageQuota } from "@/data/hr-subscription";
import { useLanguage } from "@/context/language-context";
import { useUser } from "@/context/user-context";
import { cn } from "@/lib/utils";
import {
  portalCard,
  portalHeading,
  portalSubtext,
  portalInput,
  portalMutedBg,
} from "@/lib/portal-ui";
import {
  startInterviewPlan,
  confirmInterviewPlan,
  generateInterviewQuestions,
  uploadHrJdFile,
} from "@/lib/api/rag";
import { saveLocalSession } from "@/lib/local-history";
import { createGenerationJob, saveGenerationResult } from "@/lib/api/generation";

// ── Step indicator ───────────────────────────────────────────────────────────

const FLOW_STEPS = [
  "Note + JB",
  "Tạo Plan",
  "Chỉnh sửa Plan",
  "Approve Plan",
  "Generate",
  "Kết quả",
];

function viewToStep(view: GenerateView, isApproving: boolean): number {
  switch (view) {
    case "form":          return 1;
    case "creating_plan": return 2;
    case "plan_edit":     return isApproving ? 4 : 3;
    case "generating":    return 5;
    case "completed":     return 6;
    default:              return 1;
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })
    ?.response?.data;
  const ragMsg = ((data?.error ?? {}) as Record<string, unknown>)
    .message as string | undefined;
  return (
    ragMsg ??
    (data?.detail as string) ??
    (data?.message as string) ??
    "Đã xảy ra lỗi. Vui lòng thử lại."
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function GenerateForm() {
  const { t }  = useLanguage();
  const { user } = useUser();
  const { planId, limits, hasFeature } = useHrSubscription();

  // ── Form inputs ──
  const [view,    setView]    = useState<GenerateView>("form");
  const [jdText,  setJdText]  = useState("");
  const [jdFile,  setJdFile]  = useState<File | null>(null);
  const [note,    setNote]    = useState("");

  // ── RAG session ──
  const [ragSessionId, setRagSessionId] = useState<string | null>(null);
  const [ragOwnerId,   setRagOwnerId]   = useState<string>("anonymous");

  // ── Plan ──
  const [plan,       setPlan]       = useState<PlanDraft | null>(null);
  const [aiMessage,  setAiMessage]  = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // ── Results ──
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

  // ── Errors ──
  const [formError,     setFormError]     = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const quotaBlocked  = isOverPlanUsageQuota(planId);
  const aiBlocked     = !hasFeature("aiPoweredGeneration");
  const generateDisabled = quotaBlocked || aiBlocked;

  // ── Step 1 → 2 : upload JD → create plan ─────────────────────────────────

  async function doCreatePlan() {
    setView("creating_plan");
    setFormError(null);

    try {
      const ownerId = user?.email ?? user?.id ?? "anonymous";
      setRagOwnerId(ownerId);

      if (jdFile) {
        await uploadHrJdFile(ownerId, jdFile);
      }

      const result = await startInterviewPlan({
        jd_text:          jdText || undefined,
        owner_id:         ownerId,
        additional_notes: note   || undefined,
      });

      setRagSessionId(result.ragSessionId);

      const finalPlan = result.plan ?? buildDefaultPlan();
      const msg = result.messages.find((m) => m.role === "ai")?.content ?? "";
      setPlan(finalPlan);
      setAiMessage(msg);
      setView("plan_edit");
    } catch (err) {
      setFormError(extractErrorMessage(err));
      setView("form");
    }
  }

  function handleSubmitForm() {
    if (!jdText.trim() && !jdFile) {
      setFormError("Vui lòng nhập mô tả công việc hoặc tải lên file JD.");
      return;
    }
    doCreatePlan();
  }

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

  // ── Step 3-4 : approve plan → confirm → generate ─────────────────────────

  async function handleApprovePlan() {
    if (!plan) return;
    setIsApproving(true);
    setFormError(null);

    try {
      if (ragSessionId) {
        await confirmInterviewPlan(ragSessionId, ragOwnerId, plan);
      }
    } catch (err) {
      setIsApproving(false);
      setFormError(extractErrorMessage(err));
      return;
    }

    setIsApproving(false);
    await runGeneration(plan);
  }

  // ── Step 5 : generate questions ──────────────────────────────────────────

  async function runGeneration(effectivePlan: PlanDraft) {
    setView("generating");
    setGenerateError(null);

    try {
      const questions = await generateInterviewQuestions(ragOwnerId, effectivePlan);
      setGeneratedQuestions(questions);
      setView("completed");

      const jobTitle = effectivePlan.role
        ? `${effectivePlan.role}${effectivePlan.level ? ` – ${effectivePlan.level}` : ""}`
        : "Interview Questions";

      // Save to localStorage (always available, works offline)
      saveLocalSession({
        jobTitle,
        jdContent: jdText || undefined,
        note: {
          questionCount:  effectivePlan.questionCount,
          questionTypes:  effectivePlan.questionTypes,
          additionalNote: note || undefined,
        },
        planDraft:          effectivePlan,
        generatedQuestions: questions,
        status:    "COMPLETED",
        hrOwner:   ragOwnerId,
      });

      // Save to backend (best-effort — failure does not break the UX)
      saveQuestionsToBackend(effectivePlan, questions).catch(() => {});
    } catch {
      setGeneratedQuestions([]);
      setGenerateError("Không thể tạo câu hỏi. Vui lòng thử lại.");
      setView("completed");
    }
  }

  async function saveQuestionsToBackend(plan: PlanDraft, questions: GeneratedQuestion[]) {
    const jobId = await createGenerationJob({
      jobDescription: jdText || undefined,
      hrNote:         note   || undefined,
      numberOfQuestions: plan.questionCount,
      questionTypes:  plan.questionTypes,
      skills:         plan.topics.length ? plan.topics : undefined,
    });
    if (!jobId) return;
    await saveGenerationResult(jobId, questions);
  }

  // ── Step 6 : retry ───────────────────────────────────────────────────────

  function handleRetryPlan() {
    setGenerateError(null);
    setView("plan_edit");
  }

  async function handleRetryQuestions() {
    if (!plan) return;
    await runGeneration(plan);
  }

  function handleReset() {
    setView("form");
    setJdText("");
    setJdFile(null);
    setNote("");
    setRagSessionId(null);
    setPlan(null);
    setAiMessage("");
    setGeneratedQuestions([]);
    setFormError(null);
    setGenerateError(null);
    setIsApproving(false);
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  const currentStep = viewToStep(view, isApproving);

  // ── Render: Creating Plan ─────────────────────────────────────────────────

  if (view === "creating_plan") {
    return (
      <div className="max-w-3xl space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={currentStep} />
        <div className={cn(portalCard, "shadow-sm p-12 flex flex-col items-center gap-5")}>
          <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
            <Sparkles size={26} className="text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className={cn("text-base font-semibold", portalHeading)}>
              AI đang phân tích mô tả công việc…
            </p>
            <p className={cn("text-sm", portalSubtext)}>
              Đang tạo kế hoạch phỏng vấn dựa trên JD của bạn
            </p>
          </div>
          <Loader2 size={22} className="text-primary animate-spin" />
        </div>
      </div>
    );
  }

  // ── Render: Plan Edit (Step 3-4) ──────────────────────────────────────────

  if (view === "plan_edit" && plan) {
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
          aiMessage={aiMessage}
          isApproving={isApproving}
          onPlanChange={setPlan}
          onApprove={handleApprovePlan}
          onRetryPlan={doCreatePlan}
          onBack={() => setView("form")}
        />
      </div>
    );
  }

  // ── Render: Generating (Step 5) ───────────────────────────────────────────

  if (view === "generating") {
    return (
      <div className="max-w-3xl space-y-4">
        <FlowStepIndicator currentStep={currentStep} />
        <GeneratingProgress />
      </div>
    );
  }

  // ── Render: Completed (Step 6) ────────────────────────────────────────────

  if (view === "completed") {
    return (
      <div className="max-w-3xl space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={currentStep} />

        {generateError ? (
          <div className={cn(portalCard, "shadow-sm p-8 text-center space-y-4")}>
            <p className="text-base font-semibold text-red-600 dark:text-red-400">
              Tạo câu hỏi thất bại
            </p>
            <p className={cn("text-sm", portalSubtext)}>{generateError}</p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleRetryPlan}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
              >
                <RotateCcw size={14} />
                Chỉnh lại Plan
              </button>
              <button
                type="button"
                onClick={handleRetryQuestions}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-[#5535dd] transition-colors"
              >
                <RotateCcw size={14} />
                Thử lại Generate
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Success header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-emerald-500" />
              </div>
              <div>
                <h2 className={cn("text-base font-semibold", portalHeading)}>
                  {generatedQuestions.length} câu hỏi đã được tạo
                </h2>
                <p className={cn("text-xs", portalSubtext)}>
                  Review và chỉnh sửa trước khi sử dụng
                </p>
              </div>
            </div>

            {/* Questions list */}
            <div className="space-y-3">
              {generatedQuestions.map((q, i) => (
                <GeneratedQuestionCard key={q.id} question={q} index={i} />
              ))}
            </div>

            {/* Retry / new actions */}
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleRetryPlan}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
              >
                <RotateCcw size={14} />
                Chỉnh lại Plan
              </button>
              <button
                type="button"
                onClick={handleRetryQuestions}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <RotateCcw size={14} />
                Retry Questions
              </button>
              <button
                type="button"
                onClick={handleReset}
                className={cn(
                  "flex-1 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                  portalHeading
                )}
              >
                Tạo bộ câu hỏi mới
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Render: Form (Step 1) ─────────────────────────────────────────────────

  return (
    <div className="max-w-3xl space-y-4">
      <FlowStepIndicator currentStep={1} />

      {/* Subscription / quota warnings */}
      {aiBlocked && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/90 dark:bg-indigo-950/40 px-4 py-3 text-sm text-indigo-950 dark:text-indigo-200 animate-fade-up">
          <p className="font-semibold mb-1">{t.generatePage.noAiPlan.title}</p>
          <p className="mb-2">{t.generatePage.noAiPlan.body}</p>
          <Link
            href="/hr/settings#billing"
            className="inline-flex font-semibold text-primary hover:underline"
          >
            {t.generatePage.noAiPlan.goToPlans}
          </Link>
        </div>
      )}

      {quotaBlocked && !aiBlocked && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-200 animate-fade-up">
          <p className="font-semibold mb-1">{t.generatePage.quota.exceededTitle}</p>
          <p className="mb-2">{t.generatePage.quota.exceededBody}</p>
          <Link
            href="/hr/settings#billing"
            className="inline-flex font-semibold text-primary hover:underline"
          >
            {t.generatePage.quota.goToBilling}
          </Link>
        </div>
      )}

      {/* Form error */}
      {formError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400 animate-fade-up">
          {formError}
        </div>
      )}

      {/* JD input */}
      <div className="animate-fade-up">
        <JdInputCard value={jdText} onChange={setJdText} />
      </div>

      {/* File upload */}
      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <FileUploadArea onFileChange={setJdFile} />
      </div>

      {/* Note to AI */}
      <div
        className={cn(portalCard, "shadow-sm p-6 space-y-2 animate-fade-up")}
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-base font-semibold", portalHeading)}>
            Ghi chú cho AI
          </span>
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

      {/* Submit */}
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

function GeneratedQuestionCard({
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
              <p className={cn("text-sm leading-relaxed", portalHeading)}>
                {question.rationale}
              </p>
            </div>
          )}
          {question.sampleAnswer && (
            <div>
              <p className={cn("text-xs font-semibold mb-0.5", portalSubtext)}>
                Câu trả lời mẫu
              </p>
              <p className={cn("text-sm leading-relaxed", portalHeading)}>
                {question.sampleAnswer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
