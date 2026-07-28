"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bot,
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
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type {
  ChatMessage,
  GenerationRun,
  PlanDetail,
  PlanFocusAreaItem,
  PlanSectionItem,
  StudioQuestion,
  StudioQuestionDifficulty,
  StudioQuestionType,
} from "@/features/studio/types/studio.types";

// ── helpers ──────────────────────────────────────────────────────────────────

function asArray<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

function normalizeDifficultyMix(mix: PlanDetail["difficultyMix"] | null | undefined) {
  const raw = (mix ?? {}) as Record<string, unknown>;
  const num = (a: unknown, b: unknown) => {
    const v = a ?? b;
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  };
  return { easy: num(raw.easy, raw.Easy), medium: num(raw.medium, raw.Medium), hard: num(raw.hard, raw.Hard) };
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

const QUESTIONS_PER_PAGE = 5;

const QUICK_REFINEMENTS = [
  "Tăng câu hỏi system design",
  "Giảm độ khó xuống Medium",
  "Thêm câu hỏi behavioral",
  "Cân bằng lại thời lượng",
  "Tập trung vào kỹ năng từ Knowledge Base",
];

// ── Plan section card ─────────────────────────────────────────────────────────

function PlanSectionCard({ section, index }: { section: PlanSectionItem; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">{section.name}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {section.numberOfQuestions} câu · {section.estimatedMinutes} phút
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", difficultyBadge(section.difficulty))}>
            {section.difficulty}
          </span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 text-gray-400 transition-transform duration-150", open && "rotate-180")}
          />
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-950/40">
          {section.description ? (
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{section.description}</p>
          ) : (
            <p className="text-xs text-gray-400">Chưa có mô tả chi tiết.</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {section.estimatedMinutes} phút
            </span>
            <span className="flex items-center gap-1">
              <FileQuestion className="h-3 w-3" /> {section.numberOfQuestions} câu
            </span>
          </div>
        </div>
      )}
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

// ── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  onUpdate,
  onDelete,
  onRegenerate,
}: {
  question: StudioQuestion;
  onUpdate?: (q: StudioQuestion) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onRegenerate?: (id: string) => Promise<void> | void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftContent, setDraftContent] = useState(question.content);
  const [draftAnswer, setDraftAnswer] = useState(question.expectedAnswer ?? "");
  const [draftRubric, setDraftRubric] = useState(question.scoringRubric ?? "");

  const startEdit = () => {
    setDraftContent(question.content);
    setDraftAnswer(question.expectedAnswer ?? "");
    setDraftRubric(question.scoringRubric ?? "");
    setEditing(true);
    setDetailsOpen(true);
  };

  const saveEdit = async () => {
    if (!onUpdate || !draftContent.trim()) return;
    setBusy(true);
    try {
      await onUpdate({
        ...question,
        content: draftContent.trim(),
        expectedAnswer: draftAnswer.trim() || null,
        scoringRubric: draftRubric.trim() || null,
        difficulty: question.difficulty as StudioQuestionDifficulty,
        type: question.type as StudioQuestionType,
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
            #{question.orderIndex + 1}
          </span>
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", typeBadge(question.type))}>
            {question.type}
          </span>
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", difficultyBadge(question.difficulty))}>
            {question.difficulty}
          </span>
        </div>

        <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-950/50">
          {onUpdate && (
            <button
              type="button"
              onClick={startEdit}
              disabled={busy}
              className="inline-flex h-7 w-7 items-center justify-center text-gray-500 transition-colors hover:bg-white hover:text-primary disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
              title="Sửa"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
          {onRegenerate && (
            <button
              type="button"
              onClick={async () => { setBusy(true); try { await onRegenerate(question.id); } finally { setBusy(false); } }}
              disabled={busy}
              className="inline-flex h-7 w-7 items-center justify-center border-l border-gray-200 text-gray-500 transition-colors hover:bg-white hover:text-amber-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              title="Tạo lại"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} strokeWidth={2} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm("Xóa câu hỏi này?")) return;
                setBusy(true);
                try { await onDelete(question.id); } finally { setBusy(false); }
              }}
              disabled={busy}
              className="inline-flex h-7 w-7 items-center justify-center border-l border-gray-200 text-gray-500 transition-colors hover:bg-white hover:text-red-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              title="Xóa"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="Nội dung câu hỏi"
          />
          <textarea
            value={draftAnswer}
            onChange={(e) => setDraftAnswer(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-emerald-200 p-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none dark:border-emerald-900 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="Sample answer (tùy chọn)"
          />
          <textarea
            value={draftRubric}
            onChange={(e) => setDraftRubric(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-amber-200 p-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none dark:border-amber-900 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="Scoring rubric (tùy chọn)"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={busy}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              Hủy
            </button>
            <button type="button" onClick={() => void saveEdit()} disabled={busy || !draftContent.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {busy ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">{question.content}</p>
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium",
              "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
              detailsOpen && "text-primary"
            )}
            aria-expanded={detailsOpen}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", detailsOpen && "rotate-180")} />
            {detailsOpen ? "Thu gọn" : "Sample answer & scoring rubric"}
          </button>
          {detailsOpen && (
            <div className="mt-1.5 space-y-1.5">
              {question.expectedAnswer?.trim() ? (
                <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Sample answer</p>
                  <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-200">{question.expectedAnswer}</p>
                </div>
              ) : <p className="text-[11px] text-gray-400">Chưa có sample answer.</p>}
              {question.scoringRubric?.trim() ? (
                <div className="rounded-lg border border-amber-200/70 bg-amber-50/80 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">Scoring rubric</p>
                  <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-200">{question.scoringRubric}</p>
                </div>
              ) : <p className="text-[11px] text-gray-400">Chưa có scoring rubric.</p>}
            </div>
          )}
        </>
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
  const isFailed = run?.status === "Failed";
  const isPending = isGenerating || run?.status === "Generating" || run?.status === "Pending";
  const genPct = run?.requestedQuestionCount
    ? Math.min(92, Math.max(10, Math.round(((run.generatedQuestionCount ?? 0) / run.requestedQuestionCount) * 100)))
    : 35;

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
            {isFailed ? "Sinh câu hỏi thất bại" : "Đang sinh bộ câu hỏi…"}
          </p>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
            {isFailed
              ? (run?.errorMessage || "Lỗi không xác định. Vui lòng thử lại.")
              : run?.requestedQuestionCount
                ? `RAG đang tạo — ${run.generatedQuestionCount ?? 0}/${run.requestedQuestionCount} câu`
                : "RAG đang tạo — có thể mất 1–2 phút"}
          </p>
          {isFailed && run?.errorCode && (
            <p className="mt-1 font-mono text-[10px] text-red-500 dark:text-red-400">[{run.errorCode}]</p>
          )}
        </div>
        {onRefresh && (
          <button type="button" onClick={onRefresh}
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Làm mới
          </button>
        )}
      </div>
      {isPending && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950/50">
            <div
              className="h-full animate-pulse rounded-full bg-linear-to-r from-amber-500 to-amber-400 transition-all duration-500"
              style={{ width: `${genPct}%` }}
            />
          </div>
        </div>
      )}
      {isFailed && onRetry && (
        <button type="button" onClick={onRetry} disabled={!canGenerate}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <RefreshCw className="h-4 w-4" />
          Thử sinh lại
        </button>
      )}
    </div>
  );
}

// ── Empty / Ready state ───────────────────────────────────────────────────────

function PlanEmptyState({
  hasJd,
  skillCount,
  canCreatePlan,
  isStreaming,
  onCreatePlan,
}: {
  hasJd: boolean;
  skillCount: number;
  canCreatePlan: boolean;
  isStreaming: boolean;
  onCreatePlan: () => void;
}) {
  if (isStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10" style={{ animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
          <Sparkles className="h-8 w-8 animate-pulse text-primary" />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-50">Đang tạo kế hoạch phỏng vấn…</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            AI đang phân tích JD và xây dựng cấu trúc phỏng vấn phù hợp.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-2">
          {["Phân tích mô tả công việc", "Xác định kỹ năng cần đánh giá", "Xây dựng cấu trúc phỏng vấn", "Phân bổ thời lượng"].map((step, i) => (
            <div key={step} style={{ animation: `slideUpFade 0.3s ease-out ${0.2 + i * 0.09}s both` }} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800/60">
              <Loader2 className={cn("h-3 w-3 shrink-0 text-primary", i === 0 && "animate-spin", i > 0 && "opacity-30")} />
              <span className={cn("text-gray-600 dark:text-gray-300", i > 0 && "opacity-40")}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasJd) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800" style={{ animation: "popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.08s both" }}>
          <Layers className="h-7 w-7 text-gray-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-50">Chưa có Mô tả công việc</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Paste hoặc upload JD ở cột bên trái để bắt đầu tạo kế hoạch phỏng vấn.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-12 text-center">
      <div className="relative h-14 w-14 shrink-0" style={{ animation: "popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.08s both" }}>
        <Image src="/images/logo.png" alt="HireGen AI" fill sizes="56px" className="object-contain" />
      </div>
      <div>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-50">JD đã sẵn sàng</p>
        {skillCount > 0 && (
          <p className="mt-1 text-sm text-primary">{skillCount} kỹ năng được nhận diện</p>
        )}
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          AI sẽ phân tích JD và xây dựng kế hoạch phỏng vấn phù hợp với vai trò và cấp độ ứng viên.
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
        Tạo kế hoạch phỏng vấn
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
}) {
  const planApproved = plan?.status === "Approved";
  const hasQuestions = questions.length > 0;
  const planSections = useMemo(() => asArray<PlanSectionItem>(plan?.sections ?? plan?.estimatedSections), [plan]);
  const focusAreas = useMemo(() => asArray<PlanFocusAreaItem>(plan?.focusAreas), [plan]);
  const sources = useMemo(() => asArray<string>(plan?.sourcesUsed), [plan]);
  const mix = useMemo(() => normalizeDifficultyMix(plan?.difficultyMix), [plan]);

  if (!plan) {
    return (
      <PlanEmptyState
        hasJd={hasJd}
        skillCount={skillCount}
        canCreatePlan={canCreatePlan}
        isStreaming={isStreaming}
        onCreatePlan={onCreatePlan}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
            planApproved
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
              : "bg-primary/15 text-primary dark:bg-primary/25"
          )}>
            {planApproved ? "Đã duyệt" : "Chờ duyệt"} · Rev {plan.revision}
          </span>
          {!hasQuestions && (
            <button
              type="button"
              onClick={onApprovePlan}
              disabled={planApproved || isStreaming}
              className={cn(
                "rounded-lg px-3 py-1 text-[11px] font-semibold transition-colors",
                planApproved
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
              )}
            >
              {planApproved ? "Đã duyệt" : "Duyệt kế hoạch"}
            </button>
          )}
        </div>
        <h4 className="mt-1.5 text-sm font-bold leading-snug text-gray-900 dark:text-gray-50" title={plan.title}>
          {plan.title || "Kế hoạch phỏng vấn"}
        </h4>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            `${plan.totalQuestions} câu hỏi`,
            `${plan.interviewLengthMinutes} phút`,
            `${mix.easy}E · ${mix.medium}M · ${mix.hard}H`,
          ].map((stat) => (
            <span key={stat} className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
              {stat}
            </span>
          ))}
        </div>
      </div>

      {/* Generation banner */}
      <GenerationBanner
        run={generationRun}
        isGenerating={isGeneratingQuestions}
        canGenerate={canGenerateQuestions}
        onRefresh={onRefreshGenerationStatus}
        onRetry={onGenerateQuestions}
      />

      {/* Plan sections */}
      {planSections.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Cấu trúc phỏng vấn
            </p>
            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-800">
              {planSections.length} phần
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Trọng tâm đánh giá (RAG)</p>
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Nguồn đã sử dụng</p>
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
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  plan: PlanDetail | null;
  canCreatePlan: boolean;
  onCreatePlan: () => void;
  onSendMessage: (msg: string) => Promise<void> | void;
  onRefinePlan: (instruction: string) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState("");
  const planApproved = plan?.status === "Approved";
  const composerLocked = !plan || planApproved;

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await onSendMessage(text);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Hint */}
      <div className="shrink-0 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-400">
        {!plan
          ? "Tạo kế hoạch trước, sau đó chat để tinh chỉnh cấu trúc, focus skill, phân bổ thời lượng…"
          : planApproved
            ? "Kế hoạch đã duyệt — chat bị khóa. Tạo lại plan nếu muốn chỉnh sửa."
            : "Chat để tinh chỉnh: số câu, độ khó, focus skill, cân bằng section…"}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-gray-400">
              {!plan ? "Tạo kế hoạch trước để bắt đầu chat với AI." : "Chưa có tin nhắn. Hãy đặt yêu cầu tinh chỉnh cho AI."}
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{ animation: "slideUpFade 0.22s ease-out both" }} className={cn("flex", msg.role === "User" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
              msg.role === "User"
                ? "bg-primary text-white"
                : msg.status === "Failed"
                  ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
            )}>
              {msg.content || (isStreaming && msg.role !== "User" ? "…" : "")}
            </div>
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role === "User" && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3.5 py-2.5 dark:bg-gray-800">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500"
                  style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick refinements */}
      {!composerLocked && (
        <div className="shrink-0 flex flex-wrap gap-1.5 px-4 pb-2">
          {QUICK_REFINEMENTS.map((item) => (
            <button key={item} type="button"
              disabled={composerLocked || isStreaming}
              onClick={() => void onRefinePlan(item)}
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        {!plan ? (
          <button type="button" onClick={onCreatePlan} disabled={!canCreatePlan || isStreaming}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            <Sparkles className="h-4 w-4" />
            Tạo kế hoạch phỏng vấn
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
              disabled={composerLocked || isStreaming}
              placeholder={composerLocked ? "Chat bị khóa sau khi duyệt kế hoạch" : "Yêu cầu tinh chỉnh kế hoạch…"}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <button type="button" disabled={composerLocked || !draft.trim() || isStreaming}
              onClick={() => void send()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary-hover transition-colors">
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
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
  generationRun?: GenerationRun | null;
  isGeneratingQuestions?: boolean;
  canGenerateQuestions?: boolean;
  hasJd?: boolean;
  skillCount?: number;
  onRefreshGenerationStatus?: () => void | Promise<void>;
  onCreatePlan: () => Promise<void> | void;
  onSendMessage: (message: string) => Promise<void> | void;
  onApprovePlan: () => Promise<void> | void;
  onRefinePlan: (instruction: string) => Promise<void> | void;
  onGenerateQuestions?: () => Promise<void> | void;
  onUpdateQuestion?: (question: StudioQuestion) => Promise<void> | void;
  onDeleteQuestion?: (questionId: string) => Promise<void> | void;
  onRegenerateQuestion?: (questionId: string) => Promise<void> | void;
}

type TabId = "plan" | "ai" | "questions";

export function ChatPanel({
  messages,
  isStreaming,
  plan,
  canCreatePlan,
  questions = [],
  generationRun,
  isGeneratingQuestions = false,
  canGenerateQuestions = false,
  hasJd = false,
  skillCount = 0,
  onRefreshGenerationStatus,
  onCreatePlan,
  onSendMessage,
  onApprovePlan,
  onRefinePlan,
  onGenerateQuestions,
  onUpdateQuestion,
  onDeleteQuestion,
  onRegenerateQuestion,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(questions.length > 0 ? "questions" : "plan");
  const [questionsPage, setQuestionsPage] = useState(1);
  const hasQuestions = questions.length > 0;

  const totalPages = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_PAGE));
  const pagedQuestions = questions.slice((questionsPage - 1) * QUESTIONS_PER_PAGE, questionsPage * QUESTIONS_PER_PAGE);

  useEffect(() => { setQuestionsPage(1); }, [questions.length]);

  // Switch to questions tab automatically when questions arrive
  const prevHasQuestions = useMemo(() => hasQuestions, [hasQuestions]);
  if (hasQuestions && !prevHasQuestions) {
    // already handled by initial state; user can switch manually
  }

  const tabs: { id: TabId; label: string; count?: number; hidden?: boolean }[] = [
    { id: "plan", label: "Kế hoạch" },
    { id: "ai", label: "Trợ lý AI", count: messages.filter(m => m.role !== "System").length || undefined },
    { id: "questions", label: "Câu hỏi", count: hasQuestions ? questions.length : undefined, hidden: !hasQuestions },
  ];

  return (
    <div className={cn(portalCard, "flex h-full flex-1 flex-col overflow-hidden p-0")}>
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

      {/* Tab content */}
      <div key={activeTab} style={{ animation: "fadeSlideIn 0.2s ease-out both" }} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
          />
        )}

        {activeTab === "questions" && hasQuestions && (
          <div className="flex flex-col gap-3 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className={cn("text-sm font-semibold", portalHeading)}>
                {questions.length} câu hỏi
              </p>
              {generationRun && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">Run {generationRun.id.slice(0, 8)}…</span>
                  {onRefreshGenerationStatus && (
                    <button type="button" onClick={() => void onRefreshGenerationStatus()}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                      Làm mới
                    </button>
                  )}
                </div>
              )}
            </div>

            {generationRun?.status === "Failed" && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                [{generationRun.errorCode ?? "FAILED"}] {generationRun.errorMessage || "Lỗi sinh câu hỏi."}
              </p>
            )}

            {/* Paged question list */}
            <div key={questionsPage} className="space-y-3">
              {pagedQuestions.map((q, idx) => (
                <div key={q.id} style={{ animation: `scaleInFade 0.28s cubic-bezier(0.34,1.56,0.64,1) ${idx * 0.06}s both` }}>
                  <QuestionCard
                    question={q}
                    onUpdate={onUpdateQuestion}
                    onDelete={onDeleteQuestion}
                    onRegenerate={onRegenerateQuestion}
                  />
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                <p className="text-[11px] text-gray-400">
                  Trang{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{questionsPage}</span>
                  {" "}/ {totalPages}
                  <span className="text-gray-300 dark:text-gray-600"> · {questions.length} câu</span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={questionsPage <= 1}
                    onClick={() => setQuestionsPage((p) => p - 1)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setQuestionsPage(page)}
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-all duration-150",
                        questionsPage === page
                          ? "bg-primary text-white shadow-sm shadow-primary/30"
                          : "border border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-primary/40 dark:hover:text-primary"
                      )}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={questionsPage >= totalPages}
                    onClick={() => setQuestionsPage((p) => p + 1)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
