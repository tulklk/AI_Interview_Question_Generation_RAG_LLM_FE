"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Pencil, RefreshCw, Trash2 } from "lucide-react";
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

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  plan: PlanDetail | null;
  canCreatePlan: boolean;
  questions?: StudioQuestion[];
  generationRun?: GenerationRun | null;
  isGeneratingQuestions?: boolean;
  canGenerateQuestions?: boolean;
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

const quickActions = [
  "Focus on .NET performance and EF Core N+1",
  "More system design, less behavioral",
  "Emphasize debugging and production incident scenarios",
  "Add deeper coverage for ASP.NET Core middleware",
];

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeDifficultyMix(mix: PlanDetail["difficultyMix"] | null | undefined) {
  const raw = (mix ?? {}) as Record<string, unknown>;
  const num = (a: unknown, b: unknown) => {
    const v = a ?? b;
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  };
  return {
    easy: num(raw.easy, raw.Easy),
    medium: num(raw.medium, raw.Medium),
    hard: num(raw.hard, raw.Hard),
  };
}

function runBannerClass(status?: string) {
  if (status === "Completed") return "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30";
  if (status === "Failed" || status === "Cancelled") return "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30";
  return "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30";
}

function questionTypeBadgeClass(type: string) {
  const t = type.toLowerCase();
  if (t.includes("technical")) return "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300";
  if (t.includes("system") || t.includes("design")) return "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300";
  if (t.includes("problem") || t.includes("solving")) return "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300";
  if (t.includes("behavioral")) return "bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300";
  if (t.includes("situational")) return "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function difficultyBadgeClass(difficulty: string) {
  const d = difficulty.toLowerCase();
  if (d === "easy") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (d === "medium") return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
  if (d === "hard") return "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function QuestionCard({
  question,
  onUpdate,
  onDelete,
  onRegenerate,
}: {
  question: StudioQuestion;
  onUpdate?: (question: StudioQuestion) => Promise<void> | void;
  onDelete?: (questionId: string) => Promise<void> | void;
  onRegenerate?: (questionId: string) => Promise<void> | void;
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
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-[#6c47ff]/10 px-1.5 text-[11px] font-semibold text-[#6c47ff]">
            #{question.orderIndex + 1}
          </span>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
              questionTypeBadgeClass(question.type)
            )}
          >
            {question.type}
          </span>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
              difficultyBadgeClass(question.difficulty)
            )}
          >
            {question.difficulty}
          </span>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50/80",
            "dark:border-gray-700 dark:bg-gray-950/50"
          )}
        >
          {onUpdate && (
            <button
              type="button"
              onClick={startEdit}
              disabled={busy}
              className="inline-flex h-7 w-7 items-center justify-center text-gray-600 transition-colors hover:bg-white hover:text-[#6c47ff] disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800"
              title="Sửa"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
          {onRegenerate && (
            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                try {
                  await onRegenerate(question.id);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="inline-flex h-7 w-7 items-center justify-center border-l border-gray-200 text-gray-600 transition-colors hover:bg-white hover:text-amber-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              title="Regenerate"
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
                try {
                  await onDelete(question.id);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="inline-flex h-7 w-7 items-center justify-center border-l border-gray-200 text-gray-600 transition-colors hover:bg-white hover:text-red-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
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
            className="w-full rounded-md border border-gray-200 p-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            placeholder="Nội dung câu hỏi"
          />
          <textarea
            value={draftAnswer}
            onChange={(e) => setDraftAnswer(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-emerald-200 p-2 text-xs dark:border-emerald-900 dark:bg-gray-950"
            placeholder="Sample answer (tuỳ chọn)"
          />
          <textarea
            value={draftRubric}
            onChange={(e) => setDraftRubric(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-amber-200 p-2 text-xs dark:border-amber-900 dark:bg-gray-950"
            placeholder="Scoring rubric (tuỳ chọn)"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border px-2 py-1 text-xs"
              disabled={busy}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={busy || !draftContent.trim()}
              className="rounded bg-[#6c47ff] px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              Lưu
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-800 dark:text-gray-100">{question.content}</p>

          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium",
              "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
              "dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
              detailsOpen && "text-[#6c47ff]"
            )}
            aria-expanded={detailsOpen}
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform duration-200", detailsOpen && "rotate-180")}
              strokeWidth={2}
            />
            {detailsOpen ? "Thu gọn sample & rubric" : "Sample answer & scoring rubric"}
          </button>

          {detailsOpen && (
            <div className="mt-1.5 space-y-1.5">
              {question.expectedAnswer?.trim() ? (
                <div className="rounded-md border border-emerald-200/70 bg-emerald-50/80 px-2 py-1.5 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                    Sample answer
                  </p>
                  <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-200">{question.expectedAnswer}</p>
                </div>
              ) : (
                <p className={cn("text-[11px]", portalSubtext)}>Chưa có sample answer.</p>
              )}
              {question.scoringRubric?.trim() ? (
                <div className="rounded-md border border-amber-200/70 bg-amber-50/80 px-2 py-1.5 dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                    Scoring rubric
                  </p>
                  <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-200">{question.scoringRubric}</p>
                </div>
              ) : (
                <p className={cn("text-[11px]", portalSubtext)}>Chưa có scoring rubric.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ChatPanel({
  messages,
  isStreaming,
  plan,
  canCreatePlan,
  questions = [],
  generationRun,
  isGeneratingQuestions,
  canGenerateQuestions,
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
  const [draft, setDraft] = useState("");
  const [planExpanded, setPlanExpanded] = useState(false);
  const planApproved = plan?.status === "Approved";
  const composerLocked = !plan || planApproved;
  const hasQuestions = questions.length > 0;

  const planSections = useMemo(() => asArray<PlanSectionItem>(plan?.sections ?? plan?.estimatedSections), [plan]);
  const focusAreas = useMemo(() => asArray<PlanFocusAreaItem>(plan?.focusAreas), [plan]);
  const sources = useMemo(() => asArray<string>(plan?.sourcesUsed), [plan]);
  const difficultyMix = useMemo(() => normalizeDifficultyMix(plan?.difficultyMix), [plan]);

  return (
    <div
      className={cn(
        portalCard,
        "flex flex-col p-4",
        // Có câu hỏi: cao theo nội dung, scroll trang; chưa có: khung chat cố định
        hasQuestions ? "min-h-0" : "h-[800px] min-h-0"
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className={cn("text-sm font-semibold", portalHeading)}>AI PLAN CHAT</h3>
        <button
          type="button"
          disabled={!canCreatePlan || isStreaming || isGeneratingQuestions || hasQuestions}
          onClick={() => void onCreatePlan()}
          title={
            hasQuestions
              ? "Đã có câu hỏi — bấm Tạo bộ mới nếu muốn lập plan lại"
              : canCreatePlan
                ? plan
                  ? "Tạo lại plan từ Job Description (RAG)"
                  : "Lập plan từ Job Description (RAG)"
                : "Cần Job Description trước khi Lập plan"
          }
          className="rounded-md bg-[#6c47ff] px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {plan ? "Tạo lại plan" : "Lập plan"}
        </button>
      </div>

      {!plan ? (
        <p className={cn("mt-2 shrink-0 text-xs", portalSubtext)}>
          {canCreatePlan
            ? "Bấm Lập plan trước. Knowledge documents (tuỳ chọn) giúp câu hỏi sát tài liệu nội bộ hơn."
            : "Cần Job Description rồi mới Lập plan. Knowledge documents là tuỳ chọn."}
        </p>
      ) : planApproved && !hasQuestions ? (
        <p className={cn("mt-2 shrink-0 text-xs", portalSubtext)}>
          Plan đã approve — ô chat bị khóa. Bấm Generate Interview Questions; câu hỏi hiện tại cột này.
        </p>
      ) : hasQuestions ? (
        <p className={cn("mt-2 shrink-0 text-xs", portalSubtext)}>
          Đã tạo {questions.length} câu hỏi. Sources & Studio đã khóa — Tạo bộ mới để chỉnh lại.
        </p>
      ) : (
        <p className={cn("mt-2 shrink-0 text-xs", portalSubtext)}>
          Đổi số câu / độ khó / loại câu ở cột Studio (Áp dụng vào plan). Chat cho focus skill, section mix.
        </p>
      )}

      {plan && (
        <div
          className={cn(
            "mt-3 shrink-0 overflow-hidden rounded-2xl border",
            planApproved
              ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900 dark:from-emerald-950/40 dark:to-gray-900"
              : "border-[#e8e4f8] bg-gradient-to-br from-[#f8f6ff] to-white dark:border-gray-700 dark:from-[#6c47ff]/10 dark:to-gray-900"
          )}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    planApproved
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                      : "bg-[#6c47ff]/15 text-[#6c47ff] dark:bg-[#6c47ff]/25 dark:text-[#c4b5fd]"
                  )}
                >
                  {planApproved ? "Đã duyệt" : "Chờ duyệt"}
                </span>
                <span className={cn("text-[11px]", portalSubtext)}>Rev {plan.revision}</span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-50" title={plan.title}>
                {plan.title || "Interview plan"}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                  {plan.totalQuestions} câu
                </span>
                <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                  {plan.interviewLengthMinutes} phút
                </span>
                <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                  {difficultyMix.easy}E · {difficultyMix.medium}M · {difficultyMix.hard}H
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPlanExpanded((v) => !v)}
                disabled={planApproved || hasQuestions}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                  "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  "dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                )}
              >
                {planExpanded && !planApproved && !hasQuestions ? "Thu gọn" : "Chi tiết"}
              </button>
              <button
                type="button"
                onClick={() => onApprovePlan()}
                disabled={isStreaming || planApproved || hasQuestions}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold text-white",
                  "bg-[#6c47ff] hover:bg-[#5535dd] disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {planApproved ? "Approved" : "Approve"}
              </button>
            </div>
          </div>

          {/* Section chips */}
          <div className="flex gap-1.5 overflow-x-auto px-3.5 pb-3">
            {planSections.length > 0 ? (
              planSections.slice(0, 8).map((section, idx) => (
                <span
                  key={`sec-chip-${section.orderIndex}-${section.name}-${idx}`}
                  className="whitespace-nowrap rounded-full border border-[#6c47ff]/20 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-900/70 dark:text-gray-200"
                >
                  {section.name}
                  <span className="ml-1 text-[#6c47ff]">{section.numberOfQuestions}q</span>
                </span>
              ))
            ) : (
              <span className={cn("text-[11px]", portalSubtext)}>Chưa có section chi tiết.</span>
            )}
          </div>

          {/* Expanded detail — không giới hạn chiều cao, layout rõ khối */}
          {planExpanded && !planApproved && !hasQuestions && (
            <div className="space-y-3 border-t border-[#e8e4f8] bg-white/60 px-3.5 py-3 dark:border-gray-700 dark:bg-gray-950/30">
              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Câu hỏi", value: String(plan.totalQuestions) },
                  { label: "Thời lượng", value: `${plan.interviewLengthMinutes}m` },
                  {
                    label: "Độ khó",
                    value: `${difficultyMix.easy}/${difficultyMix.medium}/${difficultyMix.hard}`,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{stat.value}</p>
                    <p className={cn("text-[10px] uppercase tracking-wide", portalSubtext)}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Focus areas */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-800 dark:text-gray-100">Focus từ RAG</p>
                <div className="space-y-1.5">
                  {focusAreas.length === 0 && (
                    <p className={cn("text-xs", portalSubtext)}>Chưa có focus area.</p>
                  )}
                  {focusAreas.slice(0, 8).map((f, idx) => {
                    const files = Array.isArray(f.sourceFiles) ? f.sourceFiles : [];
                    const weightPct = Math.round(Number(f.weight ?? 0) * 100);
                    return (
                      <div
                        key={`focus-${f.orderIndex}-${f.name}-${idx}`}
                        className="rounded-xl border border-gray-100 bg-white p-2.5 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-50">{f.name}</p>
                          {weightPct > 0 && (
                            <span className="shrink-0 rounded-md bg-[#6c47ff]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#6c47ff]">
                              {weightPct}%
                            </span>
                          )}
                        </div>
                        {weightPct > 0 && (
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                              className="h-full rounded-full bg-[#6c47ff]"
                              style={{ width: `${Math.min(100, Math.max(4, weightPct))}%` }}
                            />
                          </div>
                        )}
                        <p className={cn("mt-1.5 truncate text-[10px]", portalSubtext)} title={files.join(", ")}>
                          {files.length > 0
                            ? `Nguồn: ${files.slice(0, 2).join(", ")}${files.length > 2 ? "…" : ""}`
                            : "Nguồn: JD / không có citation"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sections */}
              {planSections.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-800 dark:text-gray-100">Cấu trúc section</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {planSections.slice(0, 8).map((section, idx) => (
                      <div
                        key={`sec-card-${section.orderIndex}-${section.name}-${idx}`}
                        className="rounded-xl border border-gray-100 bg-white px-2.5 py-2 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-50">{section.name}</p>
                        <p className={cn("mt-0.5 text-[10px]", portalSubtext)}>
                          {section.numberOfQuestions} câu · {section.difficulty}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {sources.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-gray-800 dark:text-gray-100">Sources dùng</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sources.map((src, idx) => (
                      <span
                        key={`src-${src}-${idx}`}
                        className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Danh sách câu hỏi — chỉ hiện khi đã có kết quả */}
      {hasQuestions && (
        <div
          className={cn(
            "mt-3 flex flex-col rounded-xl border",
            runBannerClass(generationRun?.status)
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Câu hỏi ({questions.length})</p>
              {generationRun && (
                <p className={cn("truncate text-[11px]", portalSubtext)}>
                  Run {generationRun.id.slice(0, 8)}… • {generationRun.status}
                  {generationRun.generatedQuestionCount > 0
                    ? ` • ${generationRun.generatedQuestionCount}q`
                    : ""}
                </p>
              )}
            </div>
            {onRefreshGenerationStatus && (
              <button
                type="button"
                onClick={() => void onRefreshGenerationStatus()}
                className="rounded-md border border-gray-300 bg-white/80 px-2 py-1 text-[11px] dark:bg-gray-900/50"
              >
                Làm mới
              </button>
            )}
          </div>
          {generationRun?.status === "Failed" && (
            <p className="px-3 pb-2 text-xs font-medium text-red-700 dark:text-red-300">
              [{generationRun.errorCode ?? "FAILED"}] {generationRun.errorMessage || "Lỗi sinh câu hỏi."}
            </p>
          )}
          <div className="space-y-2 px-3 pb-3">
            {questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                onUpdate={onUpdateQuestion}
                onDelete={onDeleteQuestion}
                onRegenerate={onRegenerateQuestion}
              />
            ))}
          </div>
        </div>
      )}

      {!hasQuestions && (
        <>
          <div className="mt-3 min-h-[120px] flex-1 space-y-3 overflow-y-auto">
            {messages.length === 0 && !plan && (
              <p className={cn("text-xs", portalSubtext)}>Chưa có tin nhắn. Lập plan để bắt đầu.</p>
            )}
            {/* Chỉ gợi ý chat khi plan còn chỉnh được — sau Approve/đã sinh câu hỏi thì không hiện */}
            {messages.length === 0 && plan && !planApproved && (
              <p className={cn("text-xs", portalSubtext)}>Chat bên dưới để tinh chỉnh plan.</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.role === "User" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    msg.role === "User"
                      ? "bg-[#6c47ff] text-white"
                      : msg.status === "Failed"
                        ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                  )}
                >
                  {msg.content || (isStreaming && msg.role !== "User" ? "..." : "")}
                </div>
              </div>
            ))}
          </div>

          {!planApproved && (
            <div className="mt-3 flex shrink-0 flex-wrap gap-2">
              {quickActions.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={composerLocked || isStreaming}
                  onClick={() => void onRefinePlan(item)}
                  className="rounded-full border border-gray-300 px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* Sau Approve: banner trạng thái thay nút khi đang/lỗi sinh; không thì nút Sinh câu hỏi */}
          {planApproved ? (
            <div className="mt-3 shrink-0">
              {(isGeneratingQuestions ||
                generationRun?.status === "Generating" ||
                generationRun?.status === "Pending" ||
                generationRun?.status === "Failed") ? (
                <div
                  className={cn(
                    "flex flex-col rounded-xl border",
                    runBannerClass(generationRun?.status)
                  )}
                >
                  <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {(isGeneratingQuestions ||
                        generationRun?.status === "Generating" ||
                        generationRun?.status === "Pending") && (
                        <div
                          className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-2 shadow-sm dark:bg-gray-900/60"
                          aria-label="Đang sinh câu hỏi"
                        >
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-[#6c47ff]"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-[#6c47ff]"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-[#6c47ff]"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {generationRun?.status === "Failed"
                            ? "Sinh câu hỏi thất bại"
                            : "Đang sinh câu hỏi…"}
                        </p>
                        <p className={cn("truncate text-[11px]", portalSubtext)}>
                          {generationRun?.status === "Failed"
                            ? `Run ${generationRun.id.slice(0, 8)}… • Failed`
                            : generationRun?.requestedQuestionCount
                              ? `RAG đang tạo — ${generationRun.generatedQuestionCount ?? 0}/${generationRun.requestedQuestionCount} câu`
                              : "RAG đang tạo — có thể mất 1–2 phút"}
                        </p>
                      </div>
                    </div>
                    {onRefreshGenerationStatus && (
                      <button
                        type="button"
                        onClick={() => void onRefreshGenerationStatus()}
                        className="rounded-md border border-gray-300 bg-white/80 px-2 py-1 text-[11px] dark:bg-gray-900/50"
                      >
                        Làm mới
                      </button>
                    )}
                  </div>
                  {(isGeneratingQuestions ||
                    generationRun?.status === "Generating" ||
                    generationRun?.status === "Pending") && (
                    <div className="px-3 pb-3">
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-white/70 dark:bg-gray-900/40"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={
                          generationRun?.requestedQuestionCount
                            ? Math.min(
                                95,
                                Math.round(
                                  ((generationRun.generatedQuestionCount ?? 0) /
                                    generationRun.requestedQuestionCount) *
                                    100
                                ) || 10
                              )
                            : 40
                        }
                      >
                        <div
                          className="h-full animate-pulse rounded-full bg-gradient-to-r from-[#6c47ff] to-[#8b6cff] transition-all duration-500"
                          style={{
                            width: `${
                              generationRun?.requestedQuestionCount
                                ? Math.min(
                                    95,
                                    Math.max(
                                      10,
                                      Math.round(
                                        ((generationRun.generatedQuestionCount ?? 0) /
                                          generationRun.requestedQuestionCount) *
                                          100
                                      )
                                    )
                                  )
                                : 40
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {generationRun?.status === "Failed" && (
                    <div className="space-y-2 px-3 pb-3">
                      <p className="text-xs font-medium text-red-700 dark:text-red-300">
                        [{generationRun.errorCode ?? "FAILED"}]{" "}
                        {generationRun.errorMessage || "Lỗi sinh câu hỏi."}
                      </p>
                      <button
                        type="button"
                        disabled={!canGenerateQuestions || !onGenerateQuestions}
                        onClick={() => void onGenerateQuestions?.()}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white",
                          "bg-gradient-to-r from-[#6c47ff] to-[#5535dd] hover:from-[#5a3aef] hover:to-[#4a28c9]",
                          "disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                      >
                        Thử sinh lại
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isGeneratingQuestions || !canGenerateQuestions || !onGenerateQuestions}
                    onClick={() => void onGenerateQuestions?.()}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#6c47ff]/25",
                      "bg-gradient-to-r from-[#6c47ff] to-[#5535dd] hover:from-[#5a3aef] hover:to-[#4a28c9]",
                      "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    )}
                  >
                    Sinh câu hỏi
                  </button>
                  {!canGenerateQuestions && (
                    <p className={cn("mt-1.5 text-center text-[11px]", portalSubtext)}>
                      Chưa sẵn sàng sinh câu hỏi — kiểm tra plan đã apply vào Studio.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="mt-3 flex shrink-0 gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={composerLocked || isStreaming}
                placeholder={
                  !plan
                    ? "Lập plan trước rồi mới chat để tinh chỉnh…"
                    : "Chỉnh plan: độ khó, số câu, section, focus…"
                }
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                type="button"
                disabled={composerLocked || !draft.trim() || isStreaming}
                onClick={async () => {
                  const text = draft;
                  setDraft("");
                  await onSendMessage(text);
                }}
                className="rounded-lg bg-[#6c47ff] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
