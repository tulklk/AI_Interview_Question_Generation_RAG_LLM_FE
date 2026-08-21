"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileQuestion,
  Layers,
  Loader2,
  Pencil,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { AvatarCircle } from "@/shared/components/common/avatar-circle";
import { getCachedUserProfile } from "@/core/storage/user-profile-cache";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { QuestionReviewWorkspace } from "@/features/studio/components/question-review-workspace";
import { formatDifficultyMixLabel } from "@/features/studio/utils/difficulty-mix";
import type {
  ChatMessage,
  GenerationRun,
  PlanDetail,
  PlanFocusAreaItem,
  PlanSectionItem,
  StudioQuestion,
} from "@/features/studio/types/studio.types";

// ── helpers ──────────────────────────────────────────────────────────────────

function asArray<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

function difficultyBadge(d: string) {
  const l = d.toLowerCase();
  if (l === "easy") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (l === "medium") return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
  return "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300";
}

function typeBadge(t: string) {
  const l = t.toLowerCase();
  if (l.includes("technical")) return "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300";
  if (l.includes("system") || l.includes("design")) return "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300";
  if (l.includes("problem") || l.includes("solving")) return "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300";
  if (l.includes("behavioral")) return "bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300";
  if (l.includes("situational")) return "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

// ── Plan section card ─────────────────────────────────────────────────────────

function PlanSectionCard({ section, index }: { section: PlanSectionItem; index: number }) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;
  const s = t.studioPage;
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-gray-900 dark:text-gray-100">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">{section.name}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {section.numberOfQuestions} {s.settings.unitQuestions} · {section.estimatedMinutes} {s.settings.unitMin}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", difficultyBadge(section.difficulty))}>
            {section.difficulty}
          </span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-gray-400 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", open && "rotate-180")}
          />
        </div>
      </button>
      <div className={cn(
        "grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}>
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950/40">
            {section.description ? (
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{section.description}</p>
            ) : (
              <p className="text-xs text-gray-400">{c.sectionDescEmpty}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {section.estimatedMinutes} {s.settings.unitMin}
              </span>
              <span className="flex items-center gap-1">
                <FileQuestion className="h-3 w-3" /> {section.numberOfQuestions} {s.settings.unitQuestions}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Focus area row ────────────────────────────────────────────────────────────

function FocusAreaRow({ area, index }: { area: PlanFocusAreaItem; index: number }) {
  const pct = Math.min(100, Math.max(2, Math.round(Number(area.weight ?? 0) * 100)));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-900 dark:text-gray-50 leading-none">{area.name}</p>
        {pct > 0 && (
          <span className="shrink-0 text-[10px] font-bold text-primary tabular-nums">{pct}%</span>
        )}
      </div>
      {pct > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: `${pct}%`,
              transformOrigin: "left center",
              animation: `barGrow 0.55s cubic-bezier(0.4,0,0.2,1) ${index * 0.09}s both`,
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Generation progress banner ────────────────────────────────────────────────

function GenerationBanner({
  run,
  isGenerating,
  canGenerate,
  onRefresh,
  onRetry,
}: {
  run: GenerationRun | null | undefined;
  isGenerating: boolean;
  canGenerate: boolean;
  onRefresh?: () => void;
  onRetry?: () => void;
}) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;
  const isFailed = run?.status === "Failed";
  const isPending = isGenerating || run?.status === "Generating" || run?.status === "Pending";
  const done = run?.generatedQuestionCount ?? 0;
  const total = run?.requestedQuestionCount ?? 0;

  if (!isPending && !isFailed) return null;

  return (
    <div className={cn(
      "rounded-xl border p-4",
      isFailed
        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
        : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isFailed ? "bg-red-100 dark:bg-red-950/50" : "bg-amber-100 dark:bg-amber-950/50"
        )}>
          {isFailed ? (
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-amber-700 dark:text-amber-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {isFailed ? c.failedTitle : c.generatingTitle}
          </p>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
            {isFailed
              ? (run?.errorMessage || c.unknownError)
              : c.generatingDesc}
          </p>
          {isFailed && run?.errorCode && (
            <p className="mt-1 font-mono text-[10px] text-red-500 dark:text-red-400">[{run.errorCode}]</p>
          )}
        </div>
        {null}
        {onRefresh && (
          <button type="button" onClick={onRefresh}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            {c.refresh}
          </button>
        )}
      </div>
      {isPending && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">{c.generationProgress}</span>
            {total > 0 && done > 0 ? (
              <span className="text-[10px] font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {c.questionsGeneratedCount.replace("{{done}}", String(done)).replace("{{total}}", String(total))}
              </span>
            ) : null}
          </div>
          <div className="studio-progress-indeterminate h-1.5 w-full rounded-full bg-amber-100 dark:bg-amber-950/50">
            <span className="bg-linear-to-r from-amber-500 to-amber-400" />
          </div>
        </div>
      )}
      {isFailed && onRetry && (
        <button type="button" onClick={onRetry} disabled={!canGenerate}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <RefreshCw className="h-4 w-4" />
          {c.retry}
        </button>
      )}
    </div>
  );
}

// ── Question generation loading overlay ──────────────────────────────────────
// Full-screen step-by-step loading UI shown while RAG generation is in progress.
// Mirrors the plan-creation streaming UI in PlanEmptyState so both feel consistent.

const QGEN_LOAD_STEP_COUNT = 4;

function QuestionGenerationLoading({
  run,
  tickSteps,
}: {
  run?: GenerationRun | null;
  /** Time-based steps lifted to ChatPanel so tab switches do not reset progress */
  tickSteps: number;
}) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;

  const QGEN_STEPS = [
    { label: c.qGenStep1, sub: c.qGenStepSub1 },
    { label: c.qGenStep2, sub: c.qGenStepSub2 },
    { label: c.qGenStep3, sub: c.qGenStepSub3 },
    { label: c.qGenStep4, sub: c.qGenStepSub4 },
  ];

  const done = run?.generatedQuestionCount ?? 0;
  const total = run?.requestedQuestionCount ?? 0;

  // Prefer real BE counts for step index; otherwise time-based ticks
  const completedSteps =
    total > 0 && done > 0
      ? Math.min(3, Math.floor((done / total) * 4))
      : tickSteps;

  const activeIdx = Math.min(completedSteps, QGEN_STEPS.length - 1);

  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-12 text-center"
      style={{ animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      {/* Spinner */}
      <div style={{ animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
        <AiLoadingSpinner />
      </div>

      {/* Title + animated subtitle */}
      <div>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-50">{c.qGenLoadingTitle}</p>
        <div key={activeIdx} style={{ animation: "slideUpFade 0.4s ease-out both" }}>
          <p className="mt-1 text-sm ai-status-text">{QGEN_STEPS[activeIdx].sub}</p>
        </div>
      </div>

      {/* Indeterminate progress (no fake %) */}
      <div className="w-full max-w-xs" style={{ animation: "slideUpFade 0.35s ease-out 0.2s both" }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {c.generationProgress}
          </span>
          {total > 0 && done > 0 ? (
            <span className="text-[11px] font-semibold tabular-nums text-primary">
              {c.questionsGeneratedCount.replace("{{done}}", String(done)).replace("{{total}}", String(total))}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-gray-400">
              {c.stepOf.replace("{{current}}", String(activeIdx + 1)).replace("{{total}}", String(QGEN_STEPS.length))}
            </span>
          )}
        </div>
        <div className="studio-progress-indeterminate h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
          <span className="bg-linear-to-r from-primary to-primary/70" />
        </div>
      </div>

      {/* Step list */}
      <div className="w-full max-w-xs space-y-2">
        {QGEN_STEPS.map((step, i) => {
          const stepDone = i < completedSteps;
          const active = i === completedSteps && completedSteps < QGEN_STEPS.length;
          return (
            <div
              key={step.label}
              style={{ animation: `slideUpFade 0.3s ease-out ${0.15 + i * 0.09}s both` }}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all duration-500",
                stepDone ? "bg-emerald-50 dark:bg-emerald-950/25"
                : active ? "bg-primary/8 dark:bg-primary/10"
                :          "bg-gray-50 dark:bg-gray-800/60"
              )}
            >
              {stepDone ? (
                <Check className="h-3 w-3 shrink-0 text-emerald-500" strokeWidth={3} />
              ) : active ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
              ) : (
                <Loader2 className="h-3 w-3 shrink-0 text-gray-300 opacity-30 dark:text-gray-600" />
              )}
              <span
                className={cn(
                  "transition-all duration-300",
                  stepDone ? "text-emerald-700 line-through dark:text-emerald-400"
                  : active ? "font-semibold text-gray-900 dark:text-gray-100"
                  :          "text-gray-400 opacity-40 dark:text-gray-600"
                )}
              >
                {step.label}
              </span>
              {stepDone && (
                <span className="ml-auto text-[10px] font-semibold text-emerald-500">{c.stepDone}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Empty / Ready state ───────────────────────────────────────────────────────

const PLAN_LOAD_STEP_COUNT = 4;

function PlanEmptyState({
  hasJd,
  skillCount,
  canCreatePlan,
  isStreaming,
  onCreatePlan,
  completedSteps,
  showLoading,
}: {
  hasJd: boolean;
  skillCount: number;
  canCreatePlan: boolean;
  isStreaming: boolean;
  onCreatePlan: () => void;
  completedSteps: number;
  showLoading: boolean;
}) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;
  const PLAN_STEPS = [
    { label: c.planStep1, sub: c.stepExtracting },
    { label: c.planStep2, sub: c.stepFocusing },
    { label: c.planStep3, sub: c.stepStructuring },
    { label: c.planStep4, sub: c.stepFinalizing },
  ];

  if (showLoading) {
    const allDone  = completedSteps >= PLAN_STEPS.length;
    const activeIdx = allDone ? PLAN_STEPS.length - 1 : Math.min(completedSteps, PLAN_STEPS.length - 1);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <div style={{ animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <AiLoadingSpinner />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-50">{c.streamingTitle}</p>
          <div key={completedSteps} style={{ animation: "slideUpFade 0.4s ease-out both" }}>
            <p className="mt-1 text-sm ai-status-text">
              {PLAN_STEPS[activeIdx].sub}
            </p>
          </div>
        </div>
        {/* Indeterminate progress — plan creation (no fake %) */}
        <div className="w-full max-w-xs" style={{ animation: "slideUpFade 0.35s ease-out 0.2s both" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {c.planProgress}
            </span>
            <span className="text-[11px] font-medium text-gray-400">
              {c.stepOf.replace("{{current}}", String(activeIdx + 1)).replace("{{total}}", String(PLAN_STEPS.length))}
            </span>
          </div>
          <div className="studio-progress-indeterminate h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
            <span className="bg-linear-to-r from-primary to-primary/70" />
          </div>
        </div>
        <div className="w-full max-w-xs space-y-2">
          {PLAN_STEPS.map((step, i) => {
            const done   = i < completedSteps;
            const active = !allDone && i === completedSteps;
            return (
              <div
                key={step.label}
                style={{ animation: `slideUpFade 0.3s ease-out ${0.2 + i * 0.09}s both` }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all duration-500",
                  done   ? "bg-emerald-50 dark:bg-emerald-950/25"
                  : active ? "bg-primary/8 dark:bg-primary/10"
                  :          "bg-gray-50 dark:bg-gray-800/60"
                )}
              >
                {done ? (
                  <Check className="h-3 w-3 shrink-0 text-emerald-500" strokeWidth={3} />
                ) : active ? (
                  <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
                ) : (
                  <Loader2 className="h-3 w-3 shrink-0 text-gray-300 opacity-30 dark:text-gray-600" />
                )}
                <span
                  className={cn(
                    "transition-all duration-300",
                    done   ? "text-emerald-700 line-through dark:text-emerald-400"
                    : active ? "font-semibold text-gray-900 dark:text-gray-100"
                    :          "text-gray-400 opacity-40 dark:text-gray-600"
                  )}
                >
                  {step.label}
                </span>
                {done && (
                  <span className="ml-auto text-[10px] font-semibold text-emerald-500">{c.stepDone}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!hasJd) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800" style={{ animation: "popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.08s both" }}>
          <Layers className="h-7 w-7 text-gray-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-50">{c.noJdTitle}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {c.noJdSub}
          </p>
        </div>
        {/* 3-step flow hint */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 select-none">
          {[c.flowStep1, c.flowStep2, c.flowStep3].map((label, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
                {i + 1}
              </span>
              <span className="whitespace-nowrap">{label}</span>
              {i < 2 && <span className="text-gray-300 dark:text-gray-600">→</span>}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const jdAnalyzed = canCreatePlan;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="relative h-14 w-14 shrink-0" style={{ animation: "popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.08s both" }}>
        <Image src="/images/logo.png" alt="HireGen AI" fill sizes="56px" className="object-contain" />
      </div>
      <div>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-50">
          {jdAnalyzed ? c.jdReadyTitle : c.jdNotAnalyzedTitle}
        </p>
        {jdAnalyzed && skillCount > 0 && (
          <p className="mt-1 text-sm text-primary">{c.skillsDetected.replace("{{count}}", String(skillCount))}</p>
        )}
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {jdAnalyzed ? c.jdAnalyzedSub : c.jdNotAnalyzedSub}
        </p>
      </div>
      <button
        type="button"
        disabled={!canCreatePlan || isStreaming}
        onClick={onCreatePlan}
        className={cn(
          "flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/25",
          "bg-linear-to-r from-primary to-[#5535dd] hover:from-[#5a3aef] hover:to-[#4a28c9]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        )}
      >
        <Sparkles className="h-4 w-4" />
        {c.createPlanBtn}
      </button>
    </div>
  );
}

// ── Plan workspace ────────────────────────────────────────────────────────────

function PlanWorkspace({
  plan,
  isStreaming,
  hasJd,
  skillCount,
  canCreatePlan,
  isGeneratingQuestions,
  canGenerateQuestions,
  generationRun,
  questions,
  onCreatePlan,
  onApprovePlan,
  onGenerateQuestions,
  onRefreshGenerationStatus,
  onRenameTitle,
  planLoadCompletedSteps,
  planLoadShowLoading,
  qGenTickSteps,
}: {
  plan: PlanDetail | null;
  isStreaming: boolean;
  hasJd: boolean;
  skillCount: number;
  canCreatePlan: boolean;
  isGeneratingQuestions: boolean;
  canGenerateQuestions: boolean;
  generationRun: GenerationRun | null | undefined;
  questions: StudioQuestion[];
  onCreatePlan: () => void;
  onApprovePlan: () => void;
  onGenerateQuestions: () => void;
  onRefreshGenerationStatus: () => void;
  onRenameTitle?: (title: string) => Promise<boolean>;
  planLoadCompletedSteps: number;
  planLoadShowLoading: boolean;
  qGenTickSteps: number;
}) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;
  const st = t.studioPage;
  const planApproved = plan?.status === "Approved";
  const hasQuestions = questions.length > 0;
  const planSections = useMemo(() => asArray<PlanSectionItem>(plan?.sections ?? plan?.estimatedSections), [plan]);
  const focusAreas = useMemo(() => asArray<PlanFocusAreaItem>(plan?.focusAreas), [plan]);
  const sources = useMemo(() => asArray<string>(plan?.sourcesUsed), [plan]);
  const mixLabel = useMemo(
    () => formatDifficultyMixLabel(plan?.difficultyMix, plan?.totalQuestions ?? 0, "·"),
    [plan]
  );

  const displayTitle = useMemo(() => {
    if (!plan) return "";
    return (plan.title || c.defaultPlanTitle)
      .replace(/\s*[\(\[][^)\]]*\.{2,}$/, "")
      .replace(/\s*—.*$/, "")
      .trim();
  }, [plan, c.defaultPlanTitle]);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  // ── Plan-creation completion gate ────────────────────────────────────────────
  // studio calls setCurrentPlan() THEN setIsStreaming(false) in separate awaits,
  // so plan can arrive while isStreaming is still true. The delay must start from
  // isStreaming→false (not from plan arriving) to guarantee the rush animation
  // in PlanEmptyState always has time to play.
  // Only blocks for NEW plan creation; chat-refinement passes through immediately.
  const wsPlanRef = useRef(plan);
  useEffect(() => { wsPlanRef.current = plan; }, [plan]);
  const wsWasNewCreation = useRef(false);
  const wsPrevStreaming = useRef(isStreaming);
  const [blockPlanView, setBlockPlanView] = useState(false);
  useEffect(() => {
    const was = wsPrevStreaming.current;
    wsPrevStreaming.current = isStreaming;
    if (!was && isStreaming) {
      wsWasNewCreation.current = !wsPlanRef.current; // no plan → new creation
    }
    if (was && !isStreaming && wsWasNewCreation.current) {
      setBlockPlanView(true);
      const t = setTimeout(() => setBlockPlanView(false), 1200);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  // ── Question-generation completion gate ──────────────────────────────────────
  // When generation finishes (isGeneratingQuestions + status flips to Completed),
  // hold the QuestionGenerationLoading overlay for 1200ms so the user sees 100%.
  const qGenPrevGenerating = useRef(
    isGeneratingQuestions || generationRun?.status === "Generating" || generationRun?.status === "Pending"
  );
  const [blockQGenSwitch, setBlockQGenSwitch] = useState(false);
  useEffect(() => {
    const wasGenerating = qGenPrevGenerating.current;
    const nowGenerating = isGeneratingQuestions || generationRun?.status === "Generating" || generationRun?.status === "Pending";
    qGenPrevGenerating.current = nowGenerating;
    if (wasGenerating && !nowGenerating && generationRun?.status === "Completed") {
      setBlockQGenSwitch(true);
      const t = setTimeout(() => setBlockQGenSwitch(false), 1200);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGeneratingQuestions, generationRun?.status]);
  // ──────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!editingTitle) setTitleDraft(displayTitle);
  }, [displayTitle, editingTitle]);

  async function saveTitle() {
    if (!onRenameTitle) return;
    const next = titleDraft.trim();
    if (!next || next === displayTitle) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      const ok = await onRenameTitle(next);
      if (ok) setEditingTitle(false);
    } finally {
      setSavingTitle(false);
    }
  }

  if (!plan || blockPlanView) {
    return (
      <PlanEmptyState
        hasJd={hasJd}
        skillCount={skillCount}
        canCreatePlan={canCreatePlan}
        isStreaming={isStreaming}
        onCreatePlan={onCreatePlan}
        completedSteps={planLoadCompletedSteps}
        showLoading={planLoadShowLoading}
      />
    );
  }

  return (
    <div className="space-y-3 p-3">
      {/* Plan header */}
      <div
        style={{ animation: "scaleInFade 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
        className={cn(
          "rounded-xl border p-3",
          planApproved
            ? "border-emerald-200/80 bg-linear-to-br from-emerald-50 to-white dark:border-emerald-900 dark:from-emerald-950/30 dark:to-gray-900"
            : "border-primary/20 bg-linear-to-br from-primary/5 to-white dark:border-primary/30 dark:from-primary/10 dark:to-gray-900"
        )}>
        {/* Row 1: badge + stats */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
            planApproved
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
              : "bg-primary/15 text-primary dark:bg-primary/25"
          )}>
            {planApproved ? c.badgeApproved : c.badgePending}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {[
              `${plan.totalQuestions} ${st.settings.unitQuestions}`,
              `${plan.interviewLengthMinutes} ${st.settings.unitMin}`,
              mixLabel,
            ].map((stat) => (
              <span key={stat} className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-600 shadow-sm dark:bg-gray-800 dark:text-gray-300">
                {stat}
              </span>
            ))}
          </div>
        </div>
        {/* Row 2: title — SCRUM-393 inline edit tên công việc */}
        {editingTitle ? (
          <div className="mt-1.5 flex items-center gap-1">
            <input
              autoFocus
              value={titleDraft}
              disabled={savingTitle}
              maxLength={500}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveTitle();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-semibold outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
            />
            <button
              type="button"
              disabled={savingTitle || !titleDraft.trim()}
              onClick={() => void saveTitle()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary/10 disabled:opacity-40"
              title={c.renameTitleSave}
            >
              {savingTitle ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              type="button"
              disabled={savingTitle}
              onClick={() => setEditingTitle(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              title={c.renameTitleCancel}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="group mt-1.5 flex items-start gap-1.5">
            <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-50">
              {displayTitle}
            </p>
            {onRenameTitle && (
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(displayTitle);
                  setEditingTitle(true);
                }}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-gray-800"
                title={c.renameTitle}
              >
                <Pencil size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Generation: full-screen step overlay while generating or in 1200ms completion grace period */}
      {(isGeneratingQuestions || generationRun?.status === "Generating" || generationRun?.status === "Pending" || blockQGenSwitch) ? (
        <QuestionGenerationLoading run={generationRun} tickSteps={qGenTickSteps} />
      ) : (
        /* Failed / completed banner */
        <GenerationBanner
          run={generationRun}
          isGenerating={false}
          canGenerate={canGenerateQuestions}
          onRefresh={onRefreshGenerationStatus}
          onRetry={onGenerateQuestions}
        />
      )}

      {/* Plan sections */}
      {planSections.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {c.interviewStructure}
            </p>
            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800">
              {planSections.length} {c.sectionUnit}
            </span>
          </div>
          <div className="space-y-1.5">
            {planSections.map((section, idx) => (
              <div key={`${section.id}-${idx}`} style={{ animation: `slideUpFade 0.32s ease-out ${idx * 0.06}s both` }}>
                <PlanSectionCard section={section} index={idx} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Focus areas */}
      {focusAreas.length > 0 && (
        <div className="space-y-2.5 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{c.focusAreas}</p>
          <div className="space-y-2.5">
            {focusAreas.slice(0, 6).map((area, idx) => (
              <FocusAreaRow key={`${area.name}-${idx}`} area={area} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{c.sourcesUsed}</p>
          <div className="flex flex-wrap gap-1.5">
            {sources.map((src, idx) => (
              <span key={`${src}-${idx}`}
                className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                {src}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AI assistant tab ──────────────────────────────────────────────────────────

function AiAssistantTab({
  messages,
  isStreaming,
  plan,
  canCreatePlan,
  onCreatePlan,
  onSendMessage,
  onRefinePlan,
  numberOfQuestions,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  plan: PlanDetail | null;
  canCreatePlan: boolean;
  onCreatePlan: () => void;
  onSendMessage: (msg: string) => Promise<void> | void;
  onRefinePlan: (instruction: string) => Promise<void> | void;
  numberOfQuestions: number;
}) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;
  const { limits } = useHrSubscription();
  const QUICK_REFINEMENTS = [c.quickRefine1, c.quickRefine2, c.quickRefine3, c.quickRefine4, c.quickRefine5];
  const [draft, setDraft] = useState("");
  const [userProfile, setUserProfile] = useState<{ fullName: string; avatarUrl?: string | null } | null>(null);
  const planApproved = plan?.status === "Approved";
  const composerLocked = !plan || planApproved;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setUserProfile(getCachedUserProfile()); }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await onSendMessage(text);
  };

  return (
    <div className="flex flex-col">
      {/* Hint */}
      <div className="shrink-0 border-b border-gray-100 bg-gray-50/60 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-400">
        {!plan
          ? c.aiHintNoPlan
          : planApproved
            ? c.aiHintApproved
            : c.aiHintActive}
      </div>

      {/* Messages — fixed height so panel never grows; scrollbar appears when content overflows */}
      <div ref={scrollContainerRef} className="overflow-y-auto" style={{ height: "calc(100vh - 340px)" }}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-gray-400">
              {!plan ? c.noPlanForChat : c.noMessages}
            </p>
          </div>
        ) : (
        <div className="space-y-3 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{ animation: "slideUpFade 0.22s ease-out both" }}
              className={cn("flex items-end gap-2", msg.role === "User" ? "justify-end" : "justify-start")}
            >
              {/* AI avatar — left */}
              {msg.role !== "User" && (
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                  <Image src="/images/logo.png" alt="AI" fill sizes="28px" className="object-contain p-0.5" />
                </div>
              )}

              <div className={cn(
                "max-w-[78%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "User"
                  ? "bg-primary text-white"
                  : msg.status === "Failed"
                    ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
              )}>
                {msg.content || (isStreaming && msg.role !== "User" ? "…" : "")}
              </div>

              {/* HR avatar — right */}
              {msg.role === "User" && (
                <AvatarCircle
                  avatarUrl={userProfile?.avatarUrl}
                  fullName={userProfile?.fullName || "HR"}
                  size="sm"
                  className="shrink-0 !w-7 !h-7 !text-[10px]"
                />
              )}
            </div>
          ))}
          {isStreaming && messages[messages.length - 1]?.role === "User" && (
            <div className="flex items-end gap-2 justify-start">
              <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <Image src="/images/logo.png" alt="AI" fill sizes="28px" className="object-contain p-0.5" />
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3.5 py-2.5 dark:bg-gray-800">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500"
                    style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Quick refinements */}
      {!composerLocked && (
        <div className="shrink-0 flex flex-wrap gap-1.5 px-4 pb-2">
          {QUICK_REFINEMENTS.map((item, idx) => {
            const addsQuestions = idx === 0 || idx === 2;
            const atMax = addsQuestions && numberOfQuestions >= 50;
            return (
            <button key={item} type="button"
              disabled={composerLocked || isStreaming || atMax}
              title={atMax ? "Số câu đã đạt tối đa 50" : undefined}
              onClick={() => void onRefinePlan(item)}
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {item}
            </button>
            );
          })}
        </div>
      )}

      {!composerLocked && (
        <p className="shrink-0 px-4 pb-2 text-[11px] text-gray-500 dark:text-gray-400">
          Refine plan: tối đa {limits?.planRegeneratePerDraft ?? 5} lần / draft
        </p>
      )}

      {/* Composer — hidden when no plan yet */}
      {plan && (
        <div className="shrink-0 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              disabled={composerLocked || isStreaming}
              placeholder={composerLocked ? c.lockedComposerPlaceholder : c.composerPlaceholder}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <button type="button" disabled={composerLocked || !draft.trim() || isStreaming}
              onClick={() => void send()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary-hover transition-colors">
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ChatPanel export ─────────────────────────────────────────────────────

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  plan: PlanDetail | null;
  canCreatePlan: boolean;
  questions?: StudioQuestion[];
  numberOfQuestions?: number;
  generationRun?: GenerationRun | null;
  isGeneratingQuestions?: boolean;
  canGenerateQuestions?: boolean;
  hasJd?: boolean;
  skillCount?: number;
  onRefreshGenerationStatus?: () => void | Promise<void>;
  onCreatePlan: () => Promise<void> | void;
  onSendMessage: (message: string) => Promise<void> | void;
  onApprovePlan: () => Promise<void> | void;
  onRenamePlanTitle?: (title: string) => Promise<boolean>;
  onRefinePlan: (instruction: string) => Promise<void> | void;
  onGenerateQuestions?: () => Promise<void> | void;
  onUpdateQuestion?: (question: StudioQuestion) => Promise<void> | void;
  onDeleteQuestion?: (questionId: string) => Promise<void> | void;
  onRegenerateQuestion?: (questionId: string) => Promise<void> | void;
  onUploadQuestionImage?: (questionId: string, file: File) => Promise<void> | void;
  onDeleteQuestionImage?: (questionId: string) => Promise<void> | void;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  onPublishBlocked?: () => void;
  isSavingDraft?: boolean;
  isDraftSaved?: boolean;
  isPublished?: boolean;
}

type TabId = "plan" | "ai" | "questions";

export function ChatPanel({
  messages,
  isStreaming,
  plan,
  canCreatePlan,
  questions = [],
  numberOfQuestions = 15,
  generationRun,
  isGeneratingQuestions = false,
  canGenerateQuestions = false,
  hasJd = false,
  skillCount = 0,
  onRefreshGenerationStatus,
  onCreatePlan,
  onSendMessage,
  onApprovePlan,
  onRenamePlanTitle,
  onRefinePlan,
  onGenerateQuestions,
  onUpdateQuestion,
  onDeleteQuestion,
  onRegenerateQuestion,
  onUploadQuestionImage,
  onDeleteQuestionImage,
  onSaveDraft,
  onPublish,
  onPublishBlocked,
  isSavingDraft = false,
  isDraftSaved = false,
  isPublished = false,
}: Props) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;
  const s = t.studioPage;
  const [activeTab, setActiveTab] = useState<TabId>(questions.length > 0 ? "questions" : "plan");
  const hasQuestions = questions.length > 0;

  // Plan-creation progress lives here so switching tabs does not reset steps
  const [planLoadCompletedSteps, setPlanLoadCompletedSteps] = useState(0);
  const [planLoadShowLoading, setPlanLoadShowLoading] = useState(isStreaming);
  const planLoadPrevStreamingRef = useRef(false);

  useEffect(() => {
    const wasStreaming = planLoadPrevStreamingRef.current;
    planLoadPrevStreamingRef.current = isStreaming;

    if (isStreaming && !wasStreaming) {
      setPlanLoadShowLoading(true);
      setPlanLoadCompletedSteps(0);
    } else if (!isStreaming && wasStreaming) {
      setPlanLoadCompletedSteps(PLAN_LOAD_STEP_COUNT);
      const timer = setTimeout(() => {
        setPlanLoadShowLoading(false);
        setPlanLoadCompletedSteps(0);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!planLoadShowLoading || !isStreaming) return;
    if (planLoadCompletedSteps >= PLAN_LOAD_STEP_COUNT) return;
    const timer = setTimeout(() => setPlanLoadCompletedSteps((p) => p + 1), 5_000);
    return () => clearTimeout(timer);
  }, [planLoadShowLoading, isStreaming, planLoadCompletedSteps]);

  // Question-generation tick progress — lifted so tab switches do not reset steps
  const isQGenBusy =
    isGeneratingQuestions
    || generationRun?.status === "Generating"
    || generationRun?.status === "Pending";
  const qGenDone = generationRun?.generatedQuestionCount ?? 0;
  const qGenTotal = generationRun?.requestedQuestionCount ?? 0;
  const [qGenTickSteps, setQGenTickSteps] = useState(0);
  const qGenPrevBusyRef = useRef(false);

  useEffect(() => {
    const wasBusy = qGenPrevBusyRef.current;
    qGenPrevBusyRef.current = isQGenBusy;
    if (isQGenBusy && !wasBusy) {
      setQGenTickSteps(0);
    }
  }, [isQGenBusy]);

  useEffect(() => {
    if (!isQGenBusy) return;
    if (qGenDone > 0 && qGenTotal > 0) return;
    if (qGenTickSteps >= QGEN_LOAD_STEP_COUNT - 1) return;
    const timer = setTimeout(() => setQGenTickSteps((p) => p + 1), 12_000);
    return () => clearTimeout(timer);
  }, [isQGenBusy, qGenDone, qGenTotal, qGenTickSteps]);

  // Auto-switch to questions tab when generation completes (0 → >0 questions)
  const prevQuestionsLengthRef = useRef(questions.length);
  useEffect(() => {
    if (questions.length > 0 && prevQuestionsLengthRef.current === 0) {
      setActiveTab("questions");
    }
    prevQuestionsLengthRef.current = questions.length;
  }, [questions.length]);

  const tabs: { id: TabId; label: string; count?: number; hidden?: boolean }[] = [
    { id: "plan", label: c.tabPlan },
    { id: "ai", label: c.tabAi, count: messages.filter(m => m.role !== "System").length || undefined },
    { id: "questions", label: c.tabQuestions, count: hasQuestions ? questions.length : undefined, hidden: !hasQuestions },
  ];

  return (
    <div className={cn(portalCard, "flex flex-1 flex-col overflow-hidden p-0 transition-all duration-300")}>
      {/* Tab bar */}
      <div className="flex shrink-0 items-center border-b border-gray-100 px-2 dark:border-gray-800">
        {tabs.filter((t) => !t.hidden).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative inline-flex items-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "text-primary"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              )}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}

      </div>

      {/* Tab content — flex-1 when plan empty state so it fills the stretched card and centers content */}
      <div style={{ animation: "fadeSlideIn 0.2s ease-out both" }} className={cn(
        "flex min-h-0 flex-col overflow-y-auto",
        activeTab === "plan" && !plan && "flex-1",
        activeTab === "questions" && "flex-1 overflow-hidden"
      )}>
        {activeTab === "plan" && (
          <PlanWorkspace
            plan={plan}
            isStreaming={isStreaming}
            hasJd={hasJd}
            skillCount={skillCount}
            canCreatePlan={canCreatePlan}
            isGeneratingQuestions={isGeneratingQuestions}
            canGenerateQuestions={canGenerateQuestions}
            generationRun={generationRun}
            questions={questions}
            onCreatePlan={() => void onCreatePlan()}
            onApprovePlan={() => void onApprovePlan()}
            onGenerateQuestions={() => void onGenerateQuestions?.()}
            onRefreshGenerationStatus={() => void onRefreshGenerationStatus?.()}
            onRenameTitle={onRenamePlanTitle}
            planLoadCompletedSteps={planLoadCompletedSteps}
            planLoadShowLoading={planLoadShowLoading}
            qGenTickSteps={qGenTickSteps}
          />
        )}

        {activeTab === "ai" && (
          <AiAssistantTab
            messages={messages}
            isStreaming={isStreaming}
            plan={plan}
            canCreatePlan={canCreatePlan}
            onCreatePlan={() => void onCreatePlan()}
            onSendMessage={onSendMessage}
            onRefinePlan={onRefinePlan}
            numberOfQuestions={numberOfQuestions}
          />
        )}

        {activeTab === "questions" && hasQuestions && (
          <QuestionReviewWorkspace
            questions={questions}
            onUpdateQuestion={onUpdateQuestion}
            onDeleteQuestion={onDeleteQuestion}
            onRegenerateQuestion={onRegenerateQuestion}
            onUploadQuestionImage={onUploadQuestionImage}
            onDeleteQuestionImage={onDeleteQuestionImage}
            onSaveDraft={onSaveDraft}
            onPublish={onPublish}
            onPublishBlocked={onPublishBlocked}
            isSavingDraft={isSavingDraft}
            isDraftSaved={isDraftSaved}
            isPublished={isPublished}
          />
        )}
      </div>
    </div>
  );
}
