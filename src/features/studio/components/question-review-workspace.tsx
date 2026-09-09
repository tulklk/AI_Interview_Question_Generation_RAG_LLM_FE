"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  ImagePlus,
  Lightbulb,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useOverlayTransition } from "@/shared/hooks/use-overlay-transition";
import {
  groupQuestionSources,
} from "@/features/studio/utils/citation-display";
import {
  QuestionSourcesGroupedPanel,
  QuestionSourcesSummaryChips,
  type QuestionSourcesLabels,
} from "@/features/studio/components/question-sources-panel";
import { STUDIO_QUESTION_TEMPLATES } from "@/features/studio/constants/question-templates";
import { inferStudioTemplate } from "@/features/studio/utils/question-template-infer";
import { isConceptualTheoryQuestion } from "@/features/studio/utils/question-content-match";
import { formatStudioQuestionTypeLabel } from "@/features/studio/utils/format-question-type-label";
import { QuestionContent } from "@/shared/components/ui/question-content";
import { CodeSnippetBlock } from "@/shared/components/ui/code-snippet-block";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import type {
  StudioQuestion,
  StudioQuestionDifficulty,
  StudioQuestionType,
} from "@/features/studio/types/studio.types";
import {
  isPublishReady,
  normalizeFromJson,
  normalizeFromUnknown,
  prepareRubricForSave,
  RubricEditor,
  type RubricV1,
} from "@/shared/rubric";

// ── helpers ──────────────────────────────────────────────────────────────────

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

function resolveQuestionRubric(q: StudioQuestion): RubricV1 {
  if (q.rubricJson?.trim()) return normalizeFromJson(q.rubricJson);
  if (q.scoringRubric?.trim()) return normalizeFromUnknown(q.scoringRubric);
  return normalizeFromJson(null);
}

function questionIsReady(q: StudioQuestion) {
  const rubric = resolveQuestionRubric(q);
  return Boolean(q.expectedAnswer?.trim() && isPublishReady(rubric));
}

function displayAnswerMethod(q: StudioQuestion): string | null {
  const type = (q.type || "").trim().toLowerCase();
  if (type === "behavioral" || type === "situational" || isConceptualTheoryQuestion(q.content)) {
    return "Text";
  }
  return q.answerMethod?.trim() || null;
}

function buildDisplayNumberMap(questions: StudioQuestion[]): Map<string, number> {
  const sorted = [...questions].sort((a, b) => {
    const d = a.orderIndex - b.orderIndex;
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
  const map = new Map<string, number>();
  sorted.forEach((q, i) => map.set(q.id, i + 1));
  return map;
}

type ReviewFilter = "all" | string;

export type QuestionReviewWorkspaceProps = {
  questions: StudioQuestion[];
  onUpdateQuestion?: (q: StudioQuestion) => Promise<void> | void;
  onDeleteQuestion?: (id: string) => Promise<void> | void;
  onRegenerateQuestion?: (id: string, instruction?: string) => Promise<void> | void;
  onUploadQuestionImage?: (questionId: string, file: File) => Promise<void> | void;
  onDeleteQuestionImage?: (questionId: string) => Promise<void> | void;
  /** SCRUM-429 */
  regeneratingQuestionIds?: string[];
  onSaveDraft?: () => void;
  onPublish?: () => void;
  onPublishBlocked?: () => void;
  isSavingDraft?: boolean;
  isDraftSaved?: boolean;
  isPublished?: boolean;
};

// ── Question detail (inline from chat-panel QuestionCard) ─────────────────────

function QuestionDetail({
  question,
  displayNumber,
  onUpdate,
  onDelete,
  onRegenerate,
  onUploadImage,
  onDeleteImage,
  isRegenerating = false,
}: {
  question: StudioQuestion;
  displayNumber: number;
  onUpdate?: (q: StudioQuestion) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onRegenerate?: (id: string, instruction?: string) => Promise<void> | void;
  onUploadImage?: (questionId: string, file: File) => Promise<void> | void;
  onDeleteImage?: (questionId: string) => Promise<void> | void;
  isRegenerating?: boolean;
}) {
  const { t, lang } = useLanguage();
  const c = t.studioPage.chat;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenNote, setRegenNote] = useState("");
  const [regenStep, setRegenStep] = useState(0);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftContent, setDraftContent] = useState(question.content);
  const [draftAnswer, setDraftAnswer] = useState(question.expectedAnswer ?? "");
  const [draftRubricDoc, setDraftRubricDoc] = useState<RubricV1>(() => resolveQuestionRubric(question));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const templateView = useMemo(() => inferStudioTemplate(question), [question]);
  const templateLabel = templateView.templateId
    ? (STUDIO_QUESTION_TEMPLATES.find((tmpl) => tmpl.id === templateView.templateId)?.label ?? templateView.templateId)
    : null;

  const missingSample = !question.expectedAnswer?.trim();
  const rubricDoc = useMemo(() => resolveQuestionRubric(question), [question]);
  const missingRubric = !isPublishReady(rubricDoc);
  const sourceCount = useMemo(() => {
    const g = groupQuestionSources(question);
    return g.jd.length + g.admin.length + g.llm.length;
  }, [question]);
  const sourceLabels: QuestionSourcesLabels = useMemo(
    () => ({
      sourceRoleJd: c.sourceRoleJd,
      sourceRoleAdmin: c.sourceRoleAdmin,
      sourceRoleLlm: c.sourceRoleLlm,
      sourceWhyAsked: c.sourceWhyAsked,
      sourceTechnicalBody: c.sourceTechnicalBody,
      sourcePrimary: c.sourcePrimary,
      sourceSecondary: c.sourceSecondary,
      jobDescription: c.sourceJobDescription,
      sourcesPanelTitle: c.sourcesPanelTitle,
      sourcesEmptyLegacy: c.sourcesEmptyLegacy,
      missingAdminWarning: c.missingAdminWarning,
      sourceChunk: c.sourceChunk,
    }),
    [c]
  );

  const { mounted: regenMounted, exiting: regenExiting } = useOverlayTransition(regenOpen);
  const regenSteps = useMemo(
    () => [c.regenStep1, c.regenStep2, c.regenStep3, c.regenStepWait],
    [c.regenStep1, c.regenStep2, c.regenStep3, c.regenStepWait]
  );

  useEffect(() => {
    if (!busy || !regenOpen) {
      setRegenStep(0);
      return;
    }
    const id = window.setInterval(() => {
      setRegenStep((s) => (s + 1) % regenSteps.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [busy, regenOpen, regenSteps.length]);

  const answerMethodLabel = displayAnswerMethod(question);

  const typeLabel = formatStudioQuestionTypeLabel(question.type, lang === "vi" ? "vi" : "en");

  useEffect(() => {
    setDetailsOpen(false);
    setSourcesOpen(false);
    setEditing(false);
    setMenuOpen(false);
    setDraftContent(question.content);
    setDraftAnswer(question.expectedAnswer ?? "");
    setDraftRubricDoc(resolveQuestionRubric(question));
  }, [question.id, question.content, question.expectedAnswer, question.scoringRubric, question.rubricJson]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const startEdit = () => {
    setDraftContent(question.content);
    setDraftAnswer(question.expectedAnswer ?? "");
    setDraftRubricDoc(resolveQuestionRubric(question));
    setEditing(true);
    setDetailsOpen(true);
  };

  const saveEdit = async () => {
    if (!onUpdate || !draftContent.trim()) return;
    setBusy(true);
    try {
      const rubricPayload = prepareRubricForSave(draftRubricDoc);
      await onUpdate({
        ...question,
        content: draftContent.trim(),
        expectedAnswer: draftAnswer.trim() || null,
        scoringRubric: rubricPayload.displayText || null,
        rubricJson: rubricPayload.rubricJson,
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
    setMenuOpen(false);
    try {
      await onUploadImage(question.id, file);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmDelete = async () => {
    if (!onDelete) return;
    setBusy(true);
    try {
      await onDelete(question.id);
      setDeleteConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const showImageMenu = Boolean(onUploadImage || (onDeleteImage && templateView.attachedImageUrl));

  return (
    <div
      key={question.id}
      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/80"
      style={{ animation: "fadeSlideIn 0.18s ease-out both" }}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">
            #{displayNumber}
          </span>
          {isRegenerating && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
              {c.regeneratingBadge ?? "Đang regen…"}
            </span>
          )}
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", typeBadge(question.type))}>
            {typeLabel}
          </span>
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", difficultyBadge(question.difficulty))}>
            {question.difficulty}
          </span>
          {question.skill?.trim() ? (
            <span
              title={question.skill.trim()}
              className="inline-flex max-w-[160px] truncate rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
            >
              {question.skill.trim()}
            </span>
          ) : null}
          {question.focusArea?.trim() &&
          question.focusArea.trim().toLowerCase() !== (question.skill?.trim().toLowerCase() ?? "") ? (
            <span
              title={question.focusArea.trim()}
              className="inline-flex max-w-[160px] truncate rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            >
              {question.focusArea.trim()}
            </span>
          ) : null}
          {templateLabel && (
            <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
              {templateLabel}
            </span>
          )}
          {answerMethodLabel && (
            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              Answer: {answerMethodLabel}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-950/50">
            {onUpdate && (
              <button
                type="button"
                onClick={startEdit}
                disabled={busy}
                className="inline-flex h-7 w-7 items-center justify-center text-gray-500 transition-colors hover:bg-white hover:text-primary disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
                title={c.edit}
                aria-label={c.edit}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
            {onRegenerate && (
              <button
                type="button"
                onClick={() => {
                  setRegenNote("");
                  setRegenError(null);
                  setRegenStep(0);
                  setRegenOpen(true);
                }}
                disabled={busy || isRegenerating}
                className="inline-flex h-7 w-7 items-center justify-center border-l border-gray-200 text-gray-500 transition-colors hover:bg-white hover:text-amber-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                title={c.regenerate}
                aria-label={c.regenerate}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", (busy || isRegenerating) && "animate-spin")} strokeWidth={2} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={busy}
                className="inline-flex h-7 w-7 items-center justify-center border-l border-gray-200 text-gray-500 transition-colors hover:bg-white hover:text-red-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                title={c.delete}
                aria-label={c.delete}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
          </div>

          {showImageMenu && (
            <div ref={menuRef} className="relative">
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
                onClick={() => setMenuOpen((v) => !v)}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-gray-50/80 text-gray-500 transition-opacity hover:bg-white hover:text-primary disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950/50 dark:text-gray-400 dark:hover:bg-gray-800",
                  menuOpen && "opacity-100"
                )}
                title={c.moreActions}
                aria-label={c.moreActions}
                aria-expanded={menuOpen}
              >
                <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-10 mt-1 min-w-36 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {onUploadImage && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      <ImagePlus className="h-3.5 w-3.5" strokeWidth={2} />
                      {templateView.attachedImageUrl ? c.changeImage : c.addImage}
                    </button>
                  )}
                  {onDeleteImage && templateView.attachedImageUrl && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setMenuOpen(false);
                        try {
                          await onDeleteImage(question.id);
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                      {c.removeImage}
                    </button>
                  )}
                </div>
              )}
            </div>
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
          <RubricEditor
            value={draftRubricDoc}
            onChange={setDraftRubricDoc}
            questionType={question.type}
            disabled={busy}
            compact={false}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={busy}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {c.cancel}
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={busy || !draftContent.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {busy ? c.saving : c.save}
            </button>
          </div>
        </div>
      ) : (
        <>
          {templateView.attachedImageUrl ? (
            <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={templateView.attachedImageUrl}
                alt={c.attachedImageAlt}
                className="max-h-72 w-full object-contain bg-gray-50 dark:bg-gray-950"
              />
            </div>
          ) : null}

          <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">{question.content}</p>

          {question.rationale?.trim() ? (
            <div className="mt-2.5 flex gap-2 rounded-lg border border-violet-200/90 bg-violet-50/90 px-2.5 py-2 dark:border-violet-800/60 dark:bg-violet-950/40">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white dark:bg-violet-500">
                <Lightbulb className="h-3.5 w-3.5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                  {c.rationaleLabel}
                </p>
                <p className="mt-0.5 text-[12px] font-medium leading-snug text-violet-950 dark:text-violet-50">
                  {question.rationale.trim()}
                </p>
              </div>
            </div>
          ) : null}

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
                {c.diagramHintTitle}
              </p>
              <p className="mt-0.5 text-[10px] text-sky-700/80 dark:text-sky-300/70">{c.diagramHintSub}</p>
              <p className="mt-1 text-xs text-sky-900 dark:text-sky-200">{templateView.diagramDescription}</p>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
              title={c.sourcesPanelTitle}
            >
              <FileText className="h-3 w-3" strokeWidth={2} />
              {c.sourcesLabel.replace("{{count}}", String(Math.max(1, sourceCount || 1)))}
              <ChevronDown className={cn("h-3 w-3 transition-transform", sourcesOpen && "rotate-180")} />
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
              {detailsOpen ? c.collapse : c.detailsToggle}
            </button>

            {!detailsOpen && missingSample && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                {c.missingSampleShort}
              </span>
            )}
            {!detailsOpen && missingRubric && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                {c.missingRubricShort}
              </span>
            )}
            {!sourcesOpen && (
              <QuestionSourcesSummaryChips question={question} labels={sourceLabels} />
            )}
          </div>

          {sourcesOpen && (
            <QuestionSourcesGroupedPanel
              question={question}
              labels={sourceLabels}
              className="mt-1.5"
            />
          )}

          {detailsOpen && (
            <div className="mt-1.5 space-y-1.5">
              {question.expectedAnswer?.trim() ? (
                <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                    {c.sampleAnswerLabel}
                  </p>
                  <QuestionContent
                    text={question.expectedAnswer}
                    stripMatchingSnippet={templateView.snippet}
                    codeVariant="answer"
                    className="mt-1.5 text-xs text-gray-700 dark:text-gray-200"
                  />
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">{c.noAnswer}</p>
              )}
              {rubricDoc.criteria.length > 0 ? (
                <div className="rounded-lg border border-amber-200/70 bg-amber-50/80 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                    {c.scoringRubric}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-gray-700 dark:text-gray-200">
                    {rubricDoc.criteria.map((crit) => (
                      <li key={crit.id}>
                        <span className="font-medium">[{crit.weight}%]</span> {crit.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400">{c.noRubric}</p>
              )}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={c.confirmDeleteTitle}
        message={c.confirmDelete}
        confirmLabel={c.confirmDeleteConfirm}
        cancelLabel={c.cancel}
        variant="danger"
        loading={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {regenMounted && typeof document !== "undefined"
        ? createPortal(
            <div
              className={cn(
                "fixed inset-0 z-[80] flex items-center justify-center p-4",
                "transition-opacity duration-300",
                regenExiting || !regenOpen ? "opacity-0" : "opacity-100"
              )}
              onClick={() => {
                if (!busy) setRegenOpen(false);
              }}
            >
              <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[3px]" />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="studio-regen-title"
                aria-busy={busy}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/20",
                  "bg-gradient-to-b from-white to-amber-50/40 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.45)]",
                  "dark:border-gray-700 dark:from-gray-900 dark:to-amber-950/20",
                  "transition-all duration-300",
                  regenExiting || !regenOpen ? "translate-y-2 scale-[0.98] opacity-0" : "translate-y-0 scale-100 opacity-100"
                )}
              >
                {/* Top accent */}
                <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />

                {busy ? (
                  <div className="px-5 pb-5 pt-6">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 shadow-inner dark:bg-amber-900/50">
                      <RefreshCw className="h-7 w-7 animate-spin text-amber-600 dark:text-amber-300" strokeWidth={2.25} />
                    </div>
                    <h3
                      id="studio-regen-title"
                      className="mt-4 text-center text-base font-semibold tracking-tight text-gray-900 dark:text-gray-50"
                    >
                      {c.regenGeneratingTitle}
                    </h3>
                    <p className="mt-1 text-center text-[12px] text-gray-500 dark:text-gray-400">
                      {c.regenGeneratingHint}
                    </p>

                    {/* Indeterminate progress */}
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950/60">
                      <div
                        className="h-full w-2/5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                        style={{
                          animation: "studioRegenSlide 1.35s ease-in-out infinite",
                        }}
                      />
                    </div>

                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-white/80 px-3 py-2.5 dark:border-amber-800/50 dark:bg-gray-950/50">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} />
                      <p
                        key={regenStep}
                        className="text-[12px] font-medium leading-snug text-amber-950 dark:text-amber-100"
                        style={{ animation: "studioRegenFade 0.35s ease-out" }}
                      >
                        {regenSteps[regenStep] ?? c.regenStepWait}
                      </p>
                    </div>

                    <div className="mt-4 flex justify-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 dark:bg-amber-500"
                          style={{ animationDelay: `${i * 160}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-5 pb-5 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
                          <Sparkles className="h-5 w-5" strokeWidth={2} />
                        </span>
                        <div>
                          <h3
                            id="studio-regen-title"
                            className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-50"
                          >
                            {c.regenNoteTitle}
                          </h3>
                          <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                            {c.regenNoteHint}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRegenOpen(false)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        aria-label={c.regenCancel}
                      >
                        <X className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[
                        c.regenChipHarder,
                        c.regenChipMoreCode,
                        c.regenChipShorter,
                        c.regenChipJd,
                        c.regenChipClarify,
                      ].map((chip) => {
                        const active = regenNote.includes(chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() =>
                              setRegenNote((prev) =>
                                prev.includes(chip)
                                  ? prev
                                      .replace(chip, "")
                                      .replace(/\s{2,}/g, " ")
                                      .trim()
                                  : prev.trim()
                                    ? `${prev.trim()} ${chip}`
                                    : chip
                              )
                            }
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                              active
                                ? "border-amber-400 bg-amber-100 text-amber-900 shadow-sm dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100"
                                : "border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-amber-700"
                            )}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      value={regenNote}
                      onChange={(e) => setRegenNote(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder={c.regenNotePlaceholder}
                      className="mt-3 w-full resize-y rounded-xl border border-gray-200 bg-white/90 px-3 py-2.5 text-sm leading-relaxed text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    />
                    <p className="mt-1 text-right text-[10px] text-gray-400">{regenNote.length}/1000</p>

                    {regenError ? (
                      <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                        {regenError}
                      </p>
                    ) : null}

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRegenOpen(false)}
                        className="rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {c.regenCancel}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!onRegenerate) return;
                          setRegenError(null);
                          setBusy(true);
                          try {
                            await onRegenerate(question.id, regenNote.trim() || undefined);
                            setRegenOpen(false);
                          } catch (err) {
                            const msg =
                              err instanceof Error && err.message
                                ? err.message
                                : "Regen failed";
                            setRegenError(msg);
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-amber-500/25 transition hover:from-amber-400 hover:to-orange-400"
                      >
                        <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.25} />
                        {c.regenConfirm}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <style>{`
                @keyframes studioRegenSlide {
                  0% { transform: translateX(-120%); }
                  100% { transform: translateX(320%); }
                }
                @keyframes studioRegenFade {
                  from { opacity: 0; transform: translateY(4px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

// ── Workspace ────────────────────────────────────────────────────────────────

export function QuestionReviewWorkspace({
  questions,
  onUpdateQuestion,
  onDeleteQuestion,
  onRegenerateQuestion,
  onUploadQuestionImage,
  onDeleteQuestionImage,
  regeneratingQuestionIds = [],
  onSaveDraft,
  onPublish,
  onPublishBlocked,
  isSavingDraft = false,
  isDraftSaved = false,
  isPublished = false,
}: QuestionReviewWorkspaceProps) {
  const { t, lang } = useLanguage();
  const c = t.studioPage.chat;
  const s = t.studioPage;
  const typeLang = lang === "vi" ? "vi" : "en";

  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const total = questions.length;

  const displayNumberById = useMemo(() => buildDisplayNumberMap(questions), [questions]);

  const readyCount = useMemo(
    () => questions.filter(questionIsReady).length,
    [questions]
  );

  const ragSourceCount = useMemo(() => {
    const files = new Set<string>();
    for (const q of questions) {
      for (const cit of q.citations ?? []) {
        if (cit.sourceFile?.trim()) files.add(cit.sourceFile.trim());
      }
    }
    return files.size;
  }, [questions]);

  const typesPresent = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const q of questions) {
      const type = q.type?.trim();
      if (type && !seen.has(type)) {
        seen.add(type);
        out.push(type);
      }
    }
    return out;
  }, [questions]);

  const filtered = useMemo(() => {
    let list = [...questions];
    if (filter !== "all") {
      list = list.filter((q) => q.type === filter);
    }
    return list.sort((a, b) => a.orderIndex - b.orderIndex);
  }, [questions, filter]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillVisible = selectedId && filtered.some((q) => q.id === selectedId);
    if (stillVisible) return;
    setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((q) => q.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  const selectedIndex = selected ? filtered.findIndex((q) => q.id === selected.id) : -1;

  const selectByOffset = (delta: number) => {
    if (filtered.length === 0 || selectedIndex < 0) return;
    const next = Math.min(filtered.length - 1, Math.max(0, selectedIndex + delta));
    setSelectedId(filtered[next].id);
  };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        selectByOffset(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        selectByOffset(1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectByOffset closes over latest filtered/selectedIndex
  }, [filtered, selectedIndex]);

  const handleListKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectByOffset(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectByOffset(-1);
    }
  };

  const handlePublish = () => {
    if (isPublished) {
      onPublish?.();
      return;
    }
    // SCRUM-439: dialog chọn subset — chỉ cần đủ min ready, không bắt buộc all ready
    onPublish?.();
  };

  const filterChipClass = (active: boolean) =>
    cn(
      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
      active
        ? "bg-primary text-white"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
    );

  const navigatorPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{c.reviewQuestionsTitle}</h3>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 lg:hidden dark:hover:bg-gray-800"
            onClick={() => setNavOpen(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" className={filterChipClass(filter === "all")} onClick={() => setFilter("all")}>
            {c.reviewFilterAll.replace("{{count}}", String(total))}
          </button>
          {typesPresent.map((type) => (
            <button
              key={type}
              type="button"
              className={filterChipClass(filter === type)}
              onClick={() => setFilter(type)}
            >
              {formatStudioQuestionTypeLabel(type, typeLang)}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleListKeyDown}
        className="min-h-0 flex-1 overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        role="listbox"
        aria-label={c.reviewQuestionsTitle}
      >
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-400">{c.reviewNavHint}</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((q) => {
              const ready = questionIsReady(q);
              const isSelected = q.id === selectedId;
              const isRegen = regeneratingQuestionIds.includes(q.id);
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedId(q.id);
                      setNavOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 border-l-[3px] px-3 py-2.5 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/8 dark:bg-primary/20"
                        : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-200">
                      #{displayNumberById.get(q.id) ?? 0}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-800 dark:text-gray-100">
                      {formatStudioQuestionTypeLabel(q.type, typeLang)}
                    </span>
                    {isRegen ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-500" strokeWidth={2.5} aria-label="regenerating" />
                    ) : ready ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={2.5} aria-label="ready" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    )}
                    {isSelected && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Sticky summary bar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white/95 px-3 py-2.5 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/95 sm:gap-3 sm:px-4">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-50">
          {c.reviewCreated.replace("{{count}}", String(total))}
        </p>
        <span className="hidden text-gray-300 sm:inline dark:text-gray-600">·</span>
        <p className="hidden text-xs text-gray-500 sm:inline dark:text-gray-300">
          {c.reviewRagSources.replace("{{count}}", String(ragSourceCount))}
        </p>

        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
            total > 0
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          )}
        >
          {c.reviewReady.replace("{{ready}}", String(total)).replace("{{total}}", String(total))}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 md:hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            onClick={() => setNavOpen(true)}
          >
            <List className="h-3.5 w-3.5" />
            {c.reviewListToggle}
          </button>
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 md:inline-flex lg:hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            onClick={() => setNavOpen((v) => !v)}
          >
            <List className="h-3.5 w-3.5" />
            {c.reviewListToggle}
          </button>

          {!isPublished && (
            <>
              <button
                type="button"
                disabled={isSavingDraft || isDraftSaved}
                onClick={() => onSaveDraft?.()}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isDraftSaved
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 disabled:cursor-default dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                )}
              >
                {isSavingDraft ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isDraftSaved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {isSavingDraft ? s.saving : isDraftSaved ? s.saved : s.save}
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  readyCount === total && total > 0
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "border border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500"
                )}
              >
                <Globe className="h-3.5 w-3.5" />
                {s.publish}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile: horizontal # chips */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-gray-100 px-3 py-2 md:hidden dark:border-gray-800">
        {questions
          .slice()
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((q) => {
            const isSelected = q.id === selectedId;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setSelectedId(q.id)}
                className={cn(
                  "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-2 text-xs font-bold transition-colors",
                  isSelected
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                )}
              >
                #{displayNumberById.get(q.id) ?? 0}
              </button>
            );
          })}
      </div>

      {/* Body: navigator + detail */}
      <div className="relative flex min-h-0 flex-1">
        {/* md overlay backdrop */}
        {navOpen && (
          <button
            type="button"
            className="absolute inset-0 z-20 bg-black/30 lg:hidden"
            aria-label="Close list"
            onClick={() => setNavOpen(false)}
          />
        )}

        {/* Navigator: drawer overlay below lg; always visible on lg+ */}
        <aside
          className={cn(
            "z-30 w-[280px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900",
            "lg:static lg:flex lg:shadow-none",
            navOpen
              ? "absolute inset-y-0 left-0 flex shadow-lg"
              : "hidden lg:flex"
          )}
        >
          {navigatorPanel}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-gray-50/40 p-3 sm:p-4 dark:bg-gray-950">
          {selected ? (
            <>
              <QuestionDetail
                question={selected}
                displayNumber={displayNumberById.get(selected.id) ?? 1}
                onUpdate={onUpdateQuestion}
                onDelete={onDeleteQuestion}
                onRegenerate={onRegenerateQuestion}
                onUploadImage={onUploadQuestionImage}
                onDeleteImage={onDeleteQuestionImage}
                isRegenerating={regeneratingQuestionIds.includes(selected.id)}
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={selectedIndex <= 0}
                  onClick={() => selectByOffset(-1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {c.reviewPrev}
                </button>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-300">
                  {c.reviewOf
                    .replace("{{current}}", String(selectedIndex + 1))
                    .replace("{{total}}", String(filtered.length))}
                </p>
                <button
                  type="button"
                  disabled={selectedIndex < 0 || selectedIndex >= filtered.length - 1}
                  onClick={() => selectByOffset(1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {c.reviewNext}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-gray-400">{c.reviewNavHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
