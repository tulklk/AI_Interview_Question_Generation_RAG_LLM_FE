"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  ImagePlus,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import {
  citationDisplayName,
  citationsForDisplay,
  formatCitationExcerpt,
  isJdCitation,
} from "@/features/studio/utils/citation-display";
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

function questionIsReady(q: StudioQuestion) {
  return Boolean(q.expectedAnswer?.trim() && q.scoringRubric?.trim());
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
  onRegenerateQuestion?: (id: string) => Promise<void> | void;
  onUploadQuestionImage?: (questionId: string, file: File) => Promise<void> | void;
  onDeleteQuestionImage?: (questionId: string) => Promise<void> | void;
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
}: {
  question: StudioQuestion;
  displayNumber: number;
  onUpdate?: (q: StudioQuestion) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onRegenerate?: (id: string) => Promise<void> | void;
  onUploadImage?: (questionId: string, file: File) => Promise<void> | void;
  onDeleteImage?: (questionId: string) => Promise<void> | void;
}) {
  const { t, lang } = useLanguage();
  const c = t.studioPage.chat;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftContent, setDraftContent] = useState(question.content);
  const [draftAnswer, setDraftAnswer] = useState(question.expectedAnswer ?? "");
  const [draftRubric, setDraftRubric] = useState(question.scoringRubric ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const templateView = useMemo(() => inferStudioTemplate(question), [question]);
  const templateLabel = templateView.templateId
    ? (STUDIO_QUESTION_TEMPLATES.find((tmpl) => tmpl.id === templateView.templateId)?.label ?? templateView.templateId)
    : null;

  const missingSample = !question.expectedAnswer?.trim();
  const missingRubric = !question.scoringRubric?.trim();
  const sourceRows = useMemo(() => citationsForDisplay(question.citations), [question.citations]);
  const sourceCount = Math.max(sourceRows.length, question.citations?.length ?? 0);

  const answerMethodLabel = displayAnswerMethod(question);

  const typeLabel = formatStudioQuestionTypeLabel(question.type, lang === "vi" ? "vi" : "en");

  useEffect(() => {
    setDetailsOpen(false);
    setSourcesOpen(false);
    setEditing(false);
    setMenuOpen(false);
    setDraftContent(question.content);
    setDraftAnswer(question.expectedAnswer ?? "");
    setDraftRubric(question.scoringRubric ?? "");
  }, [question.id, question.content, question.expectedAnswer, question.scoringRubric]);

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
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", typeBadge(question.type))}>
            {typeLabel}
          </span>
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", difficultyBadge(question.difficulty))}>
            {question.difficulty}
          </span>
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
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onRegenerate(question.id);
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="inline-flex h-7 w-7 items-center justify-center border-l border-gray-200 text-gray-500 transition-colors hover:bg-white hover:text-amber-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                title={c.regenerate}
                aria-label={c.regenerate}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} strokeWidth={2} />
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
          <textarea
            value={draftRubric}
            onChange={(e) => setDraftRubric(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-amber-200 p-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none dark:border-amber-900 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder={c.editRubricPlaceholder}
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
          </div>

          {sourcesOpen && (
            <div className="mt-1.5 rounded-lg border border-sky-200/70 bg-sky-50/70 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/40">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                {c.sourcesPanelTitle}
              </p>
              {sourceRows.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {sourceRows.map((cit, i) => {
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
                          <span className="text-gray-500 dark:text-gray-300">{` — “${excerpt}”`}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-0.5 text-[11px] italic text-gray-500 dark:text-gray-300">{c.sourcesEmptyLegacy}</p>
              )}
            </div>
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
              {question.scoringRubric?.trim() ? (
                <div className="rounded-lg border border-amber-200/70 bg-amber-50/80 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                    {c.scoringRubric}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-700 dark:text-gray-200">{question.scoringRubric}</p>
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
    if (readyCount !== total) {
      onPublishBlocked?.();
      return;
    }
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
                    {ready ? (
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
