"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { JdInputCard } from "./jd-input-card";
import { FileUploadArea } from "./file-upload-area";
import { ConfigurationSection } from "./configuration-section";
import { GeneratingProgress } from "./generating-progress";
import { NotesInputCard } from "./notes-input-card";
import { ClarifyPanel } from "./clarify-panel";
import { PlanReviewCard } from "./plan-review-card";
import type { GenerateView } from "@/types/generate";
import type { ClarifyMessage, PlanDraft, QuestionType, GeneratedQuestion } from "@/types/generation-session";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { isOverPlanUsageQuota } from "@/data/hr-subscription";
import { useLanguage } from "@/context/language-context";
import { useUser } from "@/context/user-context";
import { cn } from "@/lib/utils";
import { portalCard, portalHeading, portalSubtext, portalMutedBg } from "@/lib/portal-ui";
import {
  startInterviewPlan,
  sendPlanMessage,
  confirmInterviewPlan,
  generateInterviewQuestions,
  uploadHrJdFile,
} from "@/lib/api/rag";
import { saveLocalSession } from "@/lib/local-history";

export function GenerateForm() {
  const { t } = useLanguage();
  const { user } = useUser();
  const { planId, limits, hasFeature } = useHrSubscription();

  const [view, setView] = useState<GenerateView>("form");
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("");
  const [questionCount, setQuestionCount] = useState("15");

  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(["Technical", "Behavioral"]);
  const [focusSkills, setFocusSkills] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");

  // RAG session state
  const [ragSessionId, setRagSessionId] = useState<string | null>(null);
  const [ragOwnerId, setRagOwnerId] = useState<string>("anonymous");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Clarify state
  const [clarifyMessages, setClarifyMessages] = useState<ClarifyMessage[]>([]);
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarifyError, setClarifyError] = useState<string | null>(null);

  // Plan state
  const [plan, setPlan] = useState<PlanDraft | null>(null);

  // Completed state
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

  const quotaBlocked = isOverPlanUsageQuota(planId);
  const aiBlocked = !hasFeature("aiPoweredGeneration");
  const maxRun = limits.maxQuestionsPerRun;
  const generateDisabled = quotaBlocked || aiBlocked;

  useEffect(() => {
    const n = Number(questionCount);
    if (Number.isFinite(n) && n > maxRun) {
      setQuestionCount(String(maxRun));
    }
  }, [maxRun, questionCount]);

  // ── Step 1: Submit form → upload JD file (if any) → start interview plan ──
  async function handleSubmit() {
    setView("submitting");
    setSubmitError(null);
    try {
      const ownerId = user?.email ?? user?.id ?? "anonymous";
      setRagOwnerId(ownerId);

      // Upload JD file to RAG knowledge base
      if (jdFile) {
        await uploadHrJdFile(ownerId, jdFile);
      }

      const result = await startInterviewPlan({
        jd_text: jdText || undefined,
        owner_id: ownerId,
        num_questions: Number(questionCount) || undefined,
        question_types: selectedTypes,
        focus_skills: focusSkills || undefined,
        additional_notes: additionalNote || undefined,
      });

      setRagSessionId(result.ragSessionId);
      setClarifyMessages(result.messages);

      if (result.isPlanReady && result.plan) {
        setPlan(result.plan);
        setView("plan_review");
      } else {
        setView("clarifying");
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const ragMsg = ((data?.error ?? {}) as Record<string, unknown>).message as string | undefined;
      const message = ragMsg ?? (data?.detail as string) ?? (data?.message as string) ?? "Không thể bắt đầu generate. Vui lòng thử lại.";
      setSubmitError(message);
      setView("form");
    }
  }

  // ── Step 2: Send clarify reply → AI may propose a plan ──
  async function handleClarifySend(message: string) {
    if (!ragSessionId) return;

    const hrMsg: ClarifyMessage = {
      id: `hr-${Date.now()}`,
      role: "hr",
      content: message,
      timestamp: new Date().toISOString(),
    };
    setClarifyMessages((prev) => [...prev, hrMsg]);
    setClarifyLoading(true);
    setClarifyError(null);

    try {
      const result = await sendPlanMessage(ragSessionId, message, ragOwnerId);
      setClarifyMessages(result.messages);
      setClarifyLoading(false);

      if (result.isPlanReady && result.plan) {
        setPlan(result.plan);
        setView("plan_review");
      }
    } catch {
      setClarifyLoading(false);
      setClarifyError("Failed to send message. Please try again.");
    }
  }

  // ── Step 3: Skip clarification → confirm with form-based plan directly ──
  async function handleClarifySkip() {
    if (!ragSessionId) return;
    setClarifyLoading(true);
    setClarifyError(null);
    const minimalPlan: PlanDraft = {
      role,
      level,
      questionCount: Number(questionCount) || 5,
      questionTypes: selectedTypes,
      topics: focusSkills ? [focusSkills] : [],
      constraints: additionalNote || undefined,
    };
    try {
      const result = await confirmInterviewPlan(ragSessionId, ragOwnerId, minimalPlan);
      setClarifyLoading(false);
      if (result.plan) {
        setPlan(result.plan);
        setView("plan_review");
      } else {
        await runGeneration(ragSessionId, ragOwnerId, minimalPlan);
      }
    } catch {
      setClarifyLoading(false);
      setClarifyError("Failed to skip. Please try again.");
    }
  }

  // ── Step 4: Confirm plan → generate questions ──
  async function handleConfirmPlan() {
    if (!ragSessionId || !plan) return;
    setView("generating");
    try {
      await confirmInterviewPlan(ragSessionId, ragOwnerId, plan);
      await runGeneration(ragSessionId, ragOwnerId, plan);
    } catch {
      setSubmitError("Failed to generate questions. Please try again.");
      setView("plan_review");
    }
  }

  async function runGeneration(sessionId: string, ownerId: string, effectivePlan: PlanDraft) {
    const questions = await generateInterviewQuestions(ownerId, effectivePlan);
    setGeneratedQuestions(questions);
    setView("completed");

    // Persist to localStorage for history
    saveLocalSession({
      jobTitle: effectivePlan.role
        ? `${effectivePlan.role}${effectivePlan.level ? ` – ${effectivePlan.level}` : ""}`
        : "Interview Questions",
      jdContent: jdText || undefined,
      note: {
        questionCount: effectivePlan.questionCount,
        questionTypes: effectivePlan.questionTypes,
        focusSkills: focusSkills || undefined,
        desiredLevel: effectivePlan.level || undefined,
        additionalNote: additionalNote || undefined,
      },
      planDraft: effectivePlan,
      generatedQuestions: questions,
      status: "COMPLETED",
      hrOwner: ownerId,
    });
  }

  function handleBackFromPlan() {
    setView("clarifying");
  }

  // ── Render: Generating ──
  if (view === "generating") {
    return <GeneratingProgress />;
  }

  // ── Render: Completed (inline results) ──
  if (view === "completed") {
    return (
      <div className="max-w-3xl space-y-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <div>
            <h2 className={cn("text-base font-semibold", portalHeading)}>
              {generatedQuestions.length} câu hỏi đã được tạo
            </h2>
            <p className={cn("text-xs", portalSubtext)}>Review và chỉnh sửa trước khi sử dụng</p>
          </div>
        </div>

        <div className="space-y-3">
          {generatedQuestions.map((q, i) => (
            <GeneratedQuestionCard key={q.id} question={q} index={i} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setView("form");
            setGeneratedQuestions([]);
            setRagSessionId(null);
            setClarifyMessages([]);
            setPlan(null);
            setJdText("");
            setJdFile(null);
          }}
          className="w-full py-2.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Tạo bộ câu hỏi mới
        </button>
      </div>
    );
  }

  // ── Render: Plan review ──
  if (view === "plan_review" && plan) {
    return (
      <div className="max-w-3xl space-y-4">
        <PlanReviewCard
          plan={plan}
          onConfirm={handleConfirmPlan}
          onBack={handleBackFromPlan}
        />
      </div>
    );
  }

  // ── Render: Clarifying / Submitting ──
  if (view === "clarifying" || view === "submitting") {
    return (
      <div className="max-w-3xl space-y-4">
        <ClarifyPanel
          messages={clarifyMessages}
          isLoading={clarifyLoading || view === "submitting"}
          error={clarifyError}
          onSend={handleClarifySend}
          onSkip={handleClarifySkip}
        />
      </div>
    );
  }

  // ── Render: Form ──
  return (
    <div className="max-w-3xl space-y-4">
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

      {submitError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400 animate-fade-up">
          {submitError}
        </div>
      )}

      <div className="space-y-3">
        <div className="animate-fade-up">
          <JdInputCard value={jdText} onChange={setJdText} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
          <FileUploadArea onFileChange={setJdFile} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
          <NotesInputCard
            selectedTypes={selectedTypes}
            focusSkills={focusSkills}
            additionalNote={additionalNote}
            onTypesChange={setSelectedTypes}
            onFocusSkillsChange={setFocusSkills}
            onAdditionalNoteChange={setAdditionalNote}
          />
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
        <ConfigurationSection
          role={role}
          level={level}
          questionCount={questionCount}
          jdText={jdText}
          maxQuestionsPerRun={maxRun}
          generateDisabled={generateDisabled}
          onRoleChange={setRole}
          onLevelChange={setLevel}
          onCountChange={setQuestionCount}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

// ── Inline generated question card ──
function GeneratedQuestionCard({ question, index }: { question: GeneratedQuestion; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const diffColor =
    question.difficulty === "Hard"
      ? "text-red-600 bg-red-50 dark:bg-red-950/30"
      : question.difficulty === "Easy"
      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
      : "text-amber-600 bg-amber-50 dark:bg-amber-950/30";

  return (
    <div className={cn(portalCard, "p-4 space-y-2 shadow-sm")}>
      <div className="flex items-start gap-3">
        <span className={cn("text-xs font-bold mt-0.5 shrink-0", portalSubtext)}>
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
        {(question.rationale || question.sampleAnswer) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn("shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors", portalSubtext)}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>

      {expanded && (
        <div className={cn("ml-8 space-y-2 text-sm border-t pt-2", portalMutedBg, "rounded-lg p-3 bg-transparent")}>
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
