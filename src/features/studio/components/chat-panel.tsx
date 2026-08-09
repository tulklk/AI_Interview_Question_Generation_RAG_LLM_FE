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
  Trash2,
  FileText,
  ImagePlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { AvatarCircle } from "@/shared/components/common/avatar-circle";
import { getCachedUserProfile } from "@/core/storage/user-profile-cache";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  citationDisplayName,
  citationsForDisplay,
  formatCitationExcerpt,
  isJdCitation,
} from "@/features/studio/utils/citation-display";
import { STUDIO_QUESTION_TEMPLATES } from "@/features/studio/constants/question-templates";
import { inferStudioTemplate } from "@/features/studio/utils/question-template-infer";
import { QuestionContent } from "@/shared/components/ui/question-content";
import { CodeSnippetBlock } from "@/shared/components/ui/code-snippet-block";
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

const QUESTIONS_PER_PAGE = 6;

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
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
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

// ── Question card ─────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  onUpdate,
  onDelete,
  onRegenerate,
  onUploadImage,
  onDeleteImage,
}: {
  question: StudioQuestion;
  onUpdate?: (q: StudioQuestion) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onRegenerate?: (id: string) => Promise<void> | void;
  onUploadImage?: (questionId: string, file: File) => Promise<void> | void;
  onDeleteImage?: (questionId: string) => Promise<void> | void;
}) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftContent, setDraftContent] = useState(question.content);
  const [draftAnswer, setDraftAnswer] = useState(question.expectedAnswer ?? "");
  const [draftRubric, setDraftRubric] = useState(question.scoringRubric ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SCRUM-396: badge template + snippet + image hint trên card chat Studio
  const templateView = useMemo(() => inferStudioTemplate(question), [question]);
  const templateLabel = templateView.templateId
    ? (STUDIO_QUESTION_TEMPLATES.find((t) => t.id === templateView.templateId)?.label ?? templateView.templateId)
    : null;

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

  const handleImagePick = async (file: File | undefined) => {
    if (!file || !onUploadImage) return;
    setBusy(true);
    try {
      await onUploadImage(question.id, file);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
          {templateLabel && (
            <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
              {templateLabel}
            </span>
          )}
          {/* SCRUM-400: phương thức trả lời Candidate */}
          {question.answerMethod && (
            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              Answer: {question.answerMethod}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-950/50">
          {onUpdate && (
            <button
              type="button"
              onClick={startEdit}
              disabled={busy}
              className="inline-flex h-7 w-7 items-center justify-center text-gray-500 transition-colors hover:bg-white hover:text-primary disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
              title={c.edit}
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
              title={c.regenerate}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} strokeWidth={2} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(c.confirmDelete)) return;
                setBusy(true);
                try { await onDelete(question.id); } finally { setBusy(false); }
              }}
              disabled={busy}
              className="inline-flex h-7 w-7 items-center justify-center border-l border-gray-200 text-gray-500 transition-colors hover:bg-white hover:text-red-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              title={c.delete}
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
            placeholder={c.editQuestionPlaceholder}
          />
          <textarea
            value={draftAnswer}
            onChange={(e) => setDraftAnswer(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-emerald-200 p-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none dark:border-emerald-900 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder={c.editAnswerPlaceholder}
          />
          <textarea
            value={draftRubric}
            onChange={(e) => setDraftRubric(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-amber-200 p-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none dark:border-amber-900 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder={c.editRubricPlaceholder}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={busy}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
              {c.cancel}
            </button>
            <button type="button" onClick={() => void saveEdit()} disabled={busy || !draftContent.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {busy ? c.saving : c.save}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Ảnh đính kèm — trên nội dung câu hỏi */}
          {(templateView.attachedImageUrl || onUploadImage) && (
            <div className="mb-3 space-y-1.5">
              {templateView.attachedImageUrl ? (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={templateView.attachedImageUrl}
                    alt="Ảnh đính kèm"
                    className="max-h-72 w-full object-contain bg-gray-50 dark:bg-gray-950"
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-1.5">
                {onUploadImage && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => void handleImagePick(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-600 hover:border-primary/40 hover:text-primary disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300"
                    >
                      <ImagePlus className="h-3 w-3" strokeWidth={2} />
                      {templateView.attachedImageUrl ? "Đổi ảnh" : "Thêm ảnh"}
                    </button>
                  </>
                )}
                {onDeleteImage && templateView.attachedImageUrl && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try { await onDeleteImage(question.id); } finally { setBusy(false); }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-40 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>
            </div>
          )}

          <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">{question.content}</p>

          {/* Code snippet / diagram theo template (SCRUM-396) */}
          {templateView.snippet ? (
            <CodeSnippetBlock
              code={templateView.snippet}
              language={templateView.snippetLanguage}
              variant="question"
              className="mt-3"
            />
          ) : null}
          {templateView.templateId === "SYSTEM_DESIGN" && templateView.diagramDescription ? (
            <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/40">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                Gợi ý diagram cho HR
              </p>
              <p className="mt-0.5 text-[10px] text-sky-700/80 dark:text-sky-300/70">
                Không AI gen — chỉ gợi ý loại sơ đồ cần tìm/đính kèm.
              </p>
              <p className="mt-1 text-xs text-sky-900 dark:text-sky-200">{templateView.diagramDescription}</p>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {/* SCRUM-390: nút nhỏ — bấm mới xem chi tiết nguồn RAG */}
            <button
              type="button"
              onClick={() => setSourcesOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                sourcesOpen
                  ? "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:border-sky-200 hover:bg-sky-50/80 hover:text-sky-700 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-400 dark:hover:border-sky-900 dark:hover:text-sky-300"
              )}
              aria-expanded={sourcesOpen}
              title="Nguồn RAG"
            >
              <FileText className="h-3 w-3" strokeWidth={2} />
              Nguồn
              {(question.citations?.length ?? 0) > 0 && (
                <span className="rounded bg-sky-100 px-1 text-[9px] font-semibold text-sky-700 dark:bg-sky-900/60 dark:text-sky-200">
                  {question.citations!.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium",
                "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
                detailsOpen && "text-primary"
              )}
              aria-expanded={detailsOpen}
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", detailsOpen && "rotate-180")} />
              {detailsOpen ? c.collapse : "Sample answer & scoring rubric"}
            </button>
          </div>

          {sourcesOpen && (
            <div className="mt-1.5 rounded-lg border border-sky-200/70 bg-sky-50/70 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/40">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                Nguồn tài liệu
              </p>
              {(() => {
                const rows = citationsForDisplay(question.citations);
                return rows.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {rows.map((cit, i) => {
                    const primary = isJdCitation(cit.sourceFile);
                    const excerpt = formatCitationExcerpt(cit.excerpt);
                    const label = citationDisplayName(cit.sourceFile, {
                      jobDescription: c.sourceJobDescription,
                    });
                    return (
                      <li key={`${cit.sourceFile}-${i}`} className="text-xs text-gray-700 dark:text-gray-200">
                        <span
                          className={cn(
                            "mr-1.5 inline-flex rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide",
                            primary
                              ? "bg-sky-200/80 text-sky-900 dark:bg-sky-800 dark:text-sky-100"
                              : "bg-gray-200/80 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                          )}
                        >
                          {primary ? c.sourcePrimary : c.sourceSecondary}
                        </span>
                        <span className="font-medium">{label}</span>
                        {excerpt ? (
                          <span className="text-gray-500 dark:text-gray-400">{` — “${excerpt}”`}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                ) : (
                <p className="mt-0.5 text-[11px] italic text-gray-500 dark:text-gray-400">
                  {c.sourcesEmptyLegacy}
                </p>
                );
              })()}
            </div>
          )}

          {detailsOpen && (
            <div className="mt-1.5 space-y-1.5">
              {question.expectedAnswer?.trim() ? (
                <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                    Đáp án mẫu
                  </p>
                  <QuestionContent
                    text={question.expectedAnswer}
                    stripMatchingSnippet={templateView.snippet}
                    codeVariant="answer"
                    className="mt-1.5 text-xs text-gray-700 dark:text-gray-200"
                  />
                </div>
              ) : <p className="text-[11px] text-gray-400">{c.noAnswer}</p>}
              {question.scoringRubric?.trim() ? (
                <div className="rounded-lg border border-amber-200/70 bg-amber-50/80 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">Scoring rubric</p>
                  <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-200">{question.scoringRubric}</p>
                </div>
              ) : <p className="text-[11px] text-gray-400">{c.noRubric}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Generation progress banner ────────────────────────────────────────────────

// Estimate where simulated progress should be based on elapsed time since run started.
// This lets the bar resume at the correct position after a page reload instead of
// restarting from 10 — mirrors the 800ms tick formula: delta += max(0.3, (88-x)*0.015)
// Resuming simulated % from elapsed time (after page reload).
// Calibrated for ~65s generation: coefficient 0.040 → reaches ~85% at t=65s.
function computeElapsedPct(startedAt: string | undefined): number {
  if (!startedAt) return 10;
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  if (elapsedMs <= 0) return 10;
  const n = elapsedMs / 800;
  return Math.max(10, Math.min(88, 88 - 78 * Math.pow(0.960, n)));
}

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

  // Real percentage from backend (stays 0 until backend updates the count)
  const realPct = run?.requestedQuestionCount
    ? Math.round(((run.generatedQuestionCount ?? 0) / run.requestedQuestionCount) * 100)
    : 0;

  // Simulated animated progress — initialise from elapsed time so the bar picks up
  // where it left off after a page reload instead of restarting from 10.
  const [simPct, setSimPct] = useState(() => computeElapsedPct(run?.startedAt));

  useEffect(() => {
    if (!isPending) {
      setSimPct(10); // reset for next run
      return;
    }
    // Sync to time-based estimate so the bar never jumps backward after a reload
    setSimPct((prev) => Math.max(prev, computeElapsedPct(run?.startedAt)));
    const id = setInterval(() => {
      setSimPct((prev) => {
        if (prev >= 88) return prev;
        return Math.min(88, prev + Math.max(0.3, (88 - prev) * 0.015));
      });
    }, 800);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, run?.startedAt]);

  // Use real value if the backend actually updates the count
  const displayPct = Math.min(92, Math.max(simPct, realPct));

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
          {run?.requestedQuestionCount ? (
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">{c.generationProgress}</span>
              <span className="text-[10px] font-semibold tabular-nums text-amber-700 dark:text-amber-400">{Math.round(displayPct)}%</span>
            </div>
          ) : null}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950/50">
            <div
              className="h-full rounded-full bg-linear-to-r from-amber-500 to-amber-400 transition-all duration-700"
              style={{ width: `${displayPct}%` }}
            />
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

function QuestionGenerationLoading({
  run,
}: {
  run?: GenerationRun | null;
}) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;

  const QGEN_STEPS = [
    { label: c.qGenStep1, sub: c.qGenStepSub1 },
    { label: c.qGenStep2, sub: c.qGenStepSub2 },
    { label: c.qGenStep3, sub: c.qGenStepSub3 },
    { label: c.qGenStep4, sub: c.qGenStepSub4 },
  ];

  // ── Percentage calculation (mirrors GenerationBanner) ──
  // Simulated progress — initialises from elapsed time so bar resumes after reload
  const [simPct, setSimPct] = useState<number>(() => computeElapsedPct(run?.startedAt));

  useEffect(() => {
    // Sync to elapsed-time estimate so the bar never jumps backward on reload
    setSimPct((prev) => Math.max(prev, computeElapsedPct(run?.startedAt)));
    const id = setInterval(() => {
      setSimPct((prev) => {
        if (prev >= 88) return prev;
        // coefficient 0.040 / 800ms → reaches ~85% at t=65s
        return Math.min(88, prev + Math.max(0.4, (88 - prev) * 0.040));
      });
    }, 800);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.startedAt]);

  // Real count from backend overrides simulated progress when available
  const realPct = run?.requestedQuestionCount
    ? Math.round(((run.generatedQuestionCount ?? 0) / run.requestedQuestionCount) * 100)
    : 0;

  // Allow 100% when backend confirms all questions generated; otherwise cap at 95
  const displayPct = realPct >= 100 ? 100 : Math.min(95, Math.max(simPct, realPct));

  // ── Step logic derived from percentage ──
  // 4 steps, each covers 25% of progress range so steps advance in sync with progress
  const completedSteps =
    displayPct >= 75 ? 3
    : displayPct >= 50 ? 2
    : displayPct >= 25 ? 1
    : 0;

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

      {/* Progress bar + percentage */}
      <div className="w-full max-w-xs" style={{ animation: "slideUpFade 0.35s ease-out 0.2s both" }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {c.generationProgress}
          </span>
          <span className="text-sm font-bold tabular-nums text-primary">
            {Math.round(displayPct)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-linear-to-r from-primary to-primary/70 transition-all duration-700"
            style={{ width: `${displayPct}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="w-full max-w-xs space-y-2">
        {QGEN_STEPS.map((step, i) => {
          const done   = i < completedSteps;
          const active = i === completedSteps && completedSteps < QGEN_STEPS.length;
          return (
            <div
              key={step.label}
              style={{ animation: `slideUpFade 0.3s ease-out ${0.15 + i * 0.09}s both` }}
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
  const { t } = useLanguage();
  const c = t.studioPage.chat;
  const PLAN_STEPS = [
    { label: c.planStep1, sub: c.stepExtracting },
    { label: c.planStep2, sub: c.stepFocusing },
    { label: c.planStep3, sub: c.stepStructuring },
    { label: c.planStep4, sub: c.stepFinalizing },
  ];
  const [completedSteps, setCompletedSteps] = useState(0);
  const [simPct, setSimPct] = useState(5);
  // showLoading stays true briefly after isStreaming→false so we can animate completion
  const [showLoading, setShowLoading] = useState(isStreaming);
  const prevStreamingRef = useRef(false);

  // Detect streaming start / end transitions
  useEffect(() => {
    const wasStreaming = prevStreamingRef.current;
    prevStreamingRef.current = isStreaming;

    if (isStreaming && !wasStreaming) {
      // Streaming just started — reset and show overlay
      setShowLoading(true);
      setSimPct(5);
      setCompletedSteps(0);
    } else if (!isStreaming && wasStreaming) {
      // Plan just finished — rush all steps to ✓ and fill bar, then dismiss after 1500ms.
      // PlanWorkspace will unmount us after 1000ms (when plan arrives), so the 1500ms timer
      // only fires in the error case (no plan) to fall back to the empty-state buttons.
      setSimPct(100);
      setCompletedSteps(PLAN_STEPS.length);
      const timer = setTimeout(() => {
        setShowLoading(false);
        setSimPct(5);
        setCompletedSteps(0);
      }, 1500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  // Smooth percentage tick — calibrated for ~18-20s plan creation.
  // coefficient 0.065 per 600ms tick → reaches ~73% at 19s, capped at 88%.
  useEffect(() => {
    if (!showLoading || !isStreaming) return;
    const id = setInterval(() => {
      setSimPct((prev) => {
        if (prev >= 88) return prev;
        return Math.min(88, prev + Math.max(0.5, (88 - prev) * 0.065));
      });
    }, 600);
    return () => clearInterval(id);
  }, [showLoading, isStreaming]);

  // Time-based step advancement — ~18-20s total / 4 steps → advance every 5s
  useEffect(() => {
    if (!showLoading || !isStreaming) return;
    if (completedSteps >= PLAN_STEPS.length) return;
    const timer = setTimeout(() => setCompletedSteps((p) => p + 1), 5_000);
    return () => clearTimeout(timer);
  }, [showLoading, isStreaming, completedSteps]);

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
        {/* Progress bar + percentage */}
        <div className="w-full max-w-xs" style={{ animation: "slideUpFade 0.35s ease-out 0.2s both" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {c.generationProgress}
            </span>
            <span className="text-sm font-bold tabular-nums text-primary">
              {Math.round(simPct)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-linear-to-r from-primary to-primary/70 transition-all duration-700"
              style={{ width: `${simPct}%` }}
            />
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800" style={{ animation: "popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.08s both" }}>
          <Layers className="h-7 w-7 text-gray-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-gray-50">{c.noJdTitle}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {c.noJdSub}
          </p>
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
}) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;
  const st = t.studioPage;
  const planApproved = plan?.status === "Approved";
  const hasQuestions = questions.length > 0;
  const planSections = useMemo(() => asArray<PlanSectionItem>(plan?.sections ?? plan?.estimatedSections), [plan]);
  const focusAreas = useMemo(() => asArray<PlanFocusAreaItem>(plan?.focusAreas), [plan]);
  const sources = useMemo(() => asArray<string>(plan?.sourcesUsed), [plan]);
  const mix = useMemo(() => normalizeDifficultyMix(plan?.difficultyMix), [plan]);

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
              `${mix.easy}E·${mix.medium}M·${mix.hard}H`,
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
        <QuestionGenerationLoading run={generationRun} />
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
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  plan: PlanDetail | null;
  canCreatePlan: boolean;
  onCreatePlan: () => void;
  onSendMessage: (msg: string) => Promise<void> | void;
  onRefinePlan: (instruction: string) => Promise<void> | void;
}) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;
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
  onRenamePlanTitle,
  onRefinePlan,
  onGenerateQuestions,
  onUpdateQuestion,
  onDeleteQuestion,
  onRegenerateQuestion,
  onUploadQuestionImage,
  onDeleteQuestionImage,
}: Props) {
  const { t } = useLanguage();
  const c = t.studioPage.chat;
  const s = t.studioPage;
  const [activeTab, setActiveTab] = useState<TabId>(questions.length > 0 ? "questions" : "plan");
  const [questionsPage, setQuestionsPage] = useState(1);
  const hasQuestions = questions.length > 0;

  const totalPages = Math.max(1, Math.ceil(questions.length / QUESTIONS_PER_PAGE));
  const pagedQuestions = questions.slice((questionsPage - 1) * QUESTIONS_PER_PAGE, questionsPage * QUESTIONS_PER_PAGE);

  useEffect(() => { setQuestionsPage(1); }, [questions.length]);

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
      <div key={activeTab} style={{ animation: "fadeSlideIn 0.2s ease-out both" }} className={cn(
        "flex flex-col overflow-y-auto",
        activeTab === "plan" && !plan && "flex-1"
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
                {questions.length} {s.settings.unitQuestions}
              </p>
              {generationRun && (
                <div className="flex items-center gap-2">
                  {onRefreshGenerationStatus && (
                    <button type="button" onClick={() => void onRefreshGenerationStatus()}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                      {c.refresh}
                    </button>
                  )}
                </div>
              )}
            </div>

            {generationRun?.status === "Failed" && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                [{generationRun.errorCode ?? "FAILED"}] {generationRun.errorMessage || c.unknownError}
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
                    onUploadImage={onUploadQuestionImage}
                    onDeleteImage={onDeleteQuestionImage}
                  />
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                <p className="text-[11px] text-gray-400">
                  {c.pageLabel}{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{questionsPage}</span>
                  {" "}{c.ofLabel} {totalPages}
                  <span className="text-gray-300 dark:text-gray-600"> · {questions.length} {s.settings.unitQuestions}</span>
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
