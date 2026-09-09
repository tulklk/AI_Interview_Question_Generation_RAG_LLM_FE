"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Sparkles,
  GripVertical,
  Check,
  X,
  ChevronUp,
  Loader2,
  Lock,
  ImagePlus,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { QuestionContent } from "@/shared/components/ui/question-content";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import {
  portalCard,
  portalHeading,
  portalInput,
  portalMutedBg,
  portalSubtext,
} from "@/shared/utils/portal-ui";
import type { GeneratedQuestion, DifficultyLevel, QuestionType, QuestionSuggestion, Citation } from "@/features/interview/types/generation-session";
import { QuestionTemplateCard } from "@/features/interview/components/generate/question-template-card";
import { STUDIO_QUESTION_TEMPLATES } from "@/features/studio/constants/question-templates";
import { inferGeneratedQuestionTemplate } from "@/features/studio/utils/question-template-infer";
import {
  deleteQuestionSetQuestionImage,
  uploadQuestionSetQuestionImage,
} from "@/features/interview/services/interview.service";
import { ASK_AI_ENABLED } from "@/features/question/constants/question-ui-flags";
import {
  QuestionSourcesGroupedPanel,
  type QuestionSourcesLabels,
} from "@/features/studio/components/question-sources-panel";
import type { PlanSourceScope, StudioQuestion } from "@/features/studio/types/studio.types";

const QUESTION_TYPES: QuestionType[] = ["Technical", "Behavioral", "Situational", "System-design", "Problem-solving"];
const DIFFICULTIES: DifficultyLevel[] = ["Easy", "Medium", "Hard"];

/** Adapter Citation History → StudioQuestion tối thiểu cho panel nguồn. */
function toStudioQuestionForSources(q: GeneratedQuestion): StudioQuestion {
  const citations = (q.citations ?? []).map((c: Citation) => {
    const originRaw = (c.origin ?? "").toUpperCase();
    const origin: PlanSourceScope | null =
      originRaw === "JD" || originRaw === "HR" || originRaw === "SYSTEM" || originRaw === "LLM"
        ? (originRaw as PlanSourceScope)
        : null;
    return {
      sourceFile: c.sourceFile || c.source || "unknown",
      chunkIndex: c.chunkIndex ?? null,
      excerpt: c.excerpt ?? null,
      knowledgeBase: c.knowledgeBase ?? null,
      origin,
      usedFor: c.usedFor ?? null,
      reason: c.reason ?? null,
    };
  });
  return {
    id: q.id,
    content: q.question,
    difficulty: q.difficulty,
    type: "Technical",
    orderIndex: q.orderIndex,
    citations,
  };
}

const difficultyStyles: Record<DifficultyLevel, string> = {
  Easy: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  Medium: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  Hard: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400",
};

const typeStyles: Record<QuestionType, string> = {
  Technical: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
  Behavioral: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400",
  Situational: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  "System-design": "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
  "Problem-solving": "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400",
};

interface QuestionEditCardProps {
  question: GeneratedQuestion;
  index: number;
  sessionId: string;
  /** SCRUM-396: khi có — cho phép upload/xóa ảnh Azure Blob trên History. */
  questionSetId?: string;
  isFirst?: boolean;
  isLast?: boolean;
  isDragging?: boolean;
  /** Set is PUBLISHED — BE rejects add/edit/delete/reorder, so hide those affordances. */
  locked?: boolean;
  isAskAIActive?: boolean;
  /** SCRUM-374: hiển thị sample + scoring rubric như Studio v2. */
  studioFormat?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleListeners?: Record<string, any>;
  onSave: (updated: Partial<GeneratedQuestion>) => Promise<boolean>;
  onEditingChange?: (editing: boolean) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAskAI?: (applyCallback: (s: QuestionSuggestion) => void) => void;
  onImageUpdated?: (updated: GeneratedQuestion) => void;
}

export function QuestionEditCard({
  question,
  index,
  sessionId,
  questionSetId,
  isFirst = false,
  isLast = false,
  isDragging = false,
  locked = false,
  isAskAIActive = false,
  studioFormat: _studioFormat = false,
  dragHandleListeners,
  onSave,
  onEditingChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAskAI,
  onImageUpdated,
}: QuestionEditCardProps) {
  const { t } = useLanguage();
  const rp = t.reviewPage;
  const sc = t.studioPage.chat;
  const { addToast } = useToast();
  const [isAnswerOpen, setIsAnswerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourceLabels: QuestionSourcesLabels = useMemo(
    () => ({
      sourceRoleJd: sc.sourceRoleJd,
      sourceRoleAdmin: sc.sourceRoleAdmin,
      sourceRoleLlm: sc.sourceRoleLlm,
      sourceWhyAsked: sc.sourceWhyAsked,
      sourceTechnicalBody: sc.sourceTechnicalBody,
      sourcePrimary: sc.sourcePrimary,
      sourceSecondary: sc.sourceSecondary,
      jobDescription: sc.sourceJobDescription,
      sourcesPanelTitle: sc.sourcesPanelTitle,
      sourcesEmptyLegacy: sc.sourcesEmptyLegacy,
      missingAdminWarning: sc.missingAdminWarning,
      sourceChunk: sc.sourceChunk,
    }),
    [sc]
  );

  const studioQuestionForSources = useMemo(
    () => toStudioQuestionForSources(question),
    [question]
  );

  // SCRUM-397: form History luôn đủ field như Builder (sample + rubric + rationale + skill)
  // (giữ prop studioFormat để tương thích caller cũ)

  // SCRUM-396: suy template/snippet/image hint từ rationale + sampleAnswer (History)
  const templateVm = useMemo(() => inferGeneratedQuestionTemplate(question), [question]);
  const templateLabel = templateVm.templateId
    ? (STUDIO_QUESTION_TEMPLATES.find((t) => t.id === templateVm.templateId)?.label ?? templateVm.templateId)
    : null;
  const hasTemplateVisual =
    !!templateVm.snippet
    || !!templateVm.diagramDescription
    || !!templateVm.imageHint
    || !!templateVm.templateId
    || !!templateVm.attachedImageUrl;

  // Sample answer: giữ nguyên (giải thích + code) — QuestionContent sẽ tách code block
  const sampleAnswerDisplay = useMemo(() => {
    return (question.sampleAnswer || "").trim();
  }, [question.sampleAnswer]);

  /** Rationale “sạch” cho HR — bỏ meta template/snippet/lang/imageHint. */
  const rationaleDisplay = useMemo(() => {
    const raw = (question.rationale || "").trim();
    if (!raw) return "";
    return raw
      .split(";")
      .map((p) => p.trim())
      .filter((p) => p && !/^(template|snippet|lang|language|imageHint|imagePrompt|diagramHint|diagram)=/i.test(p))
      .join("; ");
  }, [question.rationale]);

  const canEditImage = !!questionSetId && !locked;

  const skillTrimmed = question.skill?.trim() || "";
  const focusTrimmed = question.focusArea?.trim() || "";
  const showFocusBadge =
    !!focusTrimmed && focusTrimmed.toLowerCase() !== skillTrimmed.toLowerCase();

  const hasDetailContent =
    !!sampleAnswerDisplay || !!question.scoringRubric?.trim()
    || !!(question.citations && question.citations.length > 0);

  async function handleUploadImage(file: File | undefined) {
    if (!file || !questionSetId) return;
    setImageBusy(true);
    try {
      const updated = await uploadQuestionSetQuestionImage(questionSetId, question.id, file);
      if (!updated) {
        addToast("error", "Upload ảnh thất bại.");
        return;
      }
      onImageUpdated?.({
        ...question,
        attachedImageUrl: updated.attachedImageUrl ?? null,
      });
      addToast("success", "Đã thêm ảnh đính kèm.");
    } finally {
      setImageBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteImage() {
    if (!questionSetId) return;
    setImageBusy(true);
    try {
      const updated = await deleteQuestionSetQuestionImage(questionSetId, question.id);
      if (!updated) {
        addToast("error", "Xóa ảnh thất bại.");
        return;
      }
      onImageUpdated?.({
        ...question,
        attachedImageUrl: null,
      });
      addToast("success", "Đã xóa ảnh đính kèm.");
    } finally {
      setImageBusy(false);
    }
  }

  // Edit state — đủ field như Question Builder
  const [editQuestion, setEditQuestion] = useState(question.question);
  const [editType, setEditType] = useState<QuestionType>(question.questionType);
  const [editDifficulty, setEditDifficulty] = useState<DifficultyLevel>(question.difficulty);
  const [editSkill, setEditSkill] = useState(question.skill ?? "");
  const [editFocusArea, setEditFocusArea] = useState(question.focusArea ?? "");
  const [editRationale, setEditRationale] = useState(rationaleDisplay);
  const [editSampleAnswer, setEditSampleAnswer] = useState(question.sampleAnswer ?? "");
  const [editScoringRubric, setEditScoringRubric] = useState(question.scoringRubric ?? "");
  const [editAnswerMethod, setEditAnswerMethod] = useState<"Text" | "Code">(
    question.answerMethod === "Code" ? "Code" : "Text"
  );

  /** Giữ meta kỹ thuật (template/snippet/…) khi HR chỉ sửa rationaleCore. */
  function mergeRationaleMeta(core: string): string {
    const metaParts = (question.rationale || "")
      .split(";")
      .map((p) => p.trim())
      .filter((p) => /^(template|snippet|lang|language|imageHint|imagePrompt|diagramHint|diagram)=/i.test(p));
    const parts = [core.trim(), ...metaParts].filter(Boolean);
    return parts.join(";");
  }

  function startEdit() {
    setEditQuestion(question.question);
    setEditType(question.questionType);
    setEditDifficulty(question.difficulty);
    setEditSkill(question.skill ?? "");
    setEditFocusArea(question.focusArea ?? "");
    setEditRationale(
      (question.rationale || "")
        .split(";")
        .map((p) => p.trim())
        .filter((p) => p && !/^(template|snippet|lang|language|imageHint|imagePrompt|diagramHint|diagram)=/i.test(p))
        .join("; ")
    );
    setEditSampleAnswer(question.sampleAnswer ?? "");
    setEditScoringRubric(question.scoringRubric ?? "");
    setEditAnswerMethod(question.answerMethod === "Code" ? "Code" : "Text");
    setIsEditing(true);
    onEditingChange?.(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    onEditingChange?.(false);
  }

  async function saveEdit() {
    if (isSaving) return;
    setIsSaving(true);
    const payload: Partial<GeneratedQuestion> = {
      question: editQuestion,
      questionType: editType,
      difficulty: editDifficulty,
      skill: editSkill.trim() || undefined,
      focusArea: editFocusArea.trim() || undefined,
      sampleAnswer: editSampleAnswer,
      scoringRubric: editScoringRubric,
      rationale: mergeRationaleMeta(editRationale),
      answerMethod: editAnswerMethod,
    };
    const ok = await onSave(payload);
    setIsSaving(false);
    if (ok) {
      setIsEditing(false);
      onEditingChange?.(false);
    }
  }

  function handleApplyAISuggestion(suggestion: QuestionSuggestion) {
    setEditQuestion(suggestion.question);
    setEditType((suggestion.questionType as QuestionType) ?? question.questionType);
    setEditDifficulty((suggestion.difficulty as DifficultyLevel) ?? question.difficulty);
    setEditRationale(suggestion.rationale ?? question.rationale ?? "");
    setEditSampleAnswer(suggestion.sampleAnswer ?? question.sampleAnswer ?? "");
    setIsEditing(true);
  }

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      isDragging
        ? "border-primary/40 shadow-2xl bg-white dark:bg-gray-900"
        : isEditing
          ? "border-primary/50 shadow-sm"
          : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
    )}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {/* Drag handle + index */}
          <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
            <div
              className={cn(
                "text-gray-300 dark:text-gray-600 select-none touch-none",
                dragHandleListeners ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
              )}
              {...(dragHandleListeners ?? {})}
            >
              <GripVertical size={14} />
            </div>
            <div className={cn("flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold", portalMutedBg, portalHeading)}>
              {index}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Badges — một hàng, không lặp skill/focus/difficulty */}
            {!isEditing && (
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", difficultyStyles[question.difficulty])}>
                  {rp.difficulty[question.difficulty]}
                </span>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", typeStyles[question.questionType])}>
                  {rp.questionType[question.questionType]}
                </span>
                {templateLabel ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
                    {templateLabel}
                  </span>
                ) : null}
                {skillTrimmed ? (
                  <span
                    title={skillTrimmed}
                    className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300 max-w-[200px] truncate"
                  >
                    {skillTrimmed}
                  </span>
                ) : null}
                {showFocusBadge ? (
                  <span
                    title={focusTrimmed}
                    className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 max-w-[200px] truncate"
                  >
                    {focusTrimmed}
                  </span>
                ) : null}
                {question.isEdited && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400">
                    Edited
                  </span>
                )}
              </div>
            )}

            {/* Question text or Edit form */}
            {isEditing ? (
              <div className="space-y-3">
                {/* Meta: loại · độ khó · phương thức */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                      {rp.questionFields.questionType}
                    </label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as QuestionType)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        portalInput
                      )}
                    >
                      {QUESTION_TYPES.map((qt) => (
                        <option key={qt} value={qt}>{rp.questionType[qt]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                      {rp.questionFields.difficulty}
                    </label>
                    <select
                      value={editDifficulty}
                      onChange={(e) => setEditDifficulty(e.target.value as DifficultyLevel)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        portalInput
                      )}
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>{rp.difficulty[d]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                      Phương thức trả lời
                    </label>
                    <select
                      value={editAnswerMethod}
                      onChange={(e) => setEditAnswerMethod(e.target.value as "Text" | "Code")}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        portalInput
                      )}
                    >
                      <option value="Text">Text — văn xuôi</option>
                      <option value="Code">Code — nhập code</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                      Skill / tech tag
                    </label>
                    <input
                      value={editSkill}
                      onChange={(e) => setEditSkill(e.target.value)}
                      placeholder="VD: React, SQL, Redis"
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        portalInput
                      )}
                    />
                  </div>
                  <div>
                    <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                      Focus area
                    </label>
                    <input
                      value={editFocusArea}
                      onChange={(e) => setEditFocusArea(e.target.value)}
                      placeholder="VD: Frontend, Database"
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        portalInput
                      )}
                    />
                  </div>
                </div>

                {/* Đề + Đáp án/Code — tách khung, cạnh nhau trên desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
                  <div className="rounded-xl border border-sky-200/80 bg-sky-50/40 p-3 dark:border-sky-900/50 dark:bg-sky-950/20 flex flex-col min-h-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className={cn("text-xs font-semibold", portalHeading)}>
                        {rp.questionFields.question}
                      </label>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                        Đề bài
                      </span>
                    </div>
                    <textarea
                      value={editQuestion}
                      onChange={(e) => setEditQuestion(e.target.value)}
                      rows={12}
                      className={cn(
                        "w-full flex-1 min-h-[220px] resize-y rounded-lg px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500",
                        portalInput
                      )}
                    />
                  </div>

                  <div
                    className={cn(
                      "rounded-xl border p-3 flex flex-col min-h-0",
                      editAnswerMethod === "Code"
                        ? "border-violet-200/80 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20"
                        : "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className={cn("text-xs font-semibold", portalHeading)}>
                        {rp.questionFields.sampleAnswer}
                      </label>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wide",
                          editAnswerMethod === "Code"
                            ? "text-violet-700 dark:text-violet-400"
                            : "text-emerald-700 dark:text-emerald-400"
                        )}
                      >
                        {editAnswerMethod === "Code" ? "Code / đáp án" : "Đáp án mẫu"}
                      </span>
                    </div>
                    <textarea
                      value={editSampleAnswer}
                      onChange={(e) => setEditSampleAnswer(e.target.value)}
                      rows={12}
                      spellCheck={editAnswerMethod !== "Code"}
                      className={cn(
                        "w-full flex-1 min-h-[220px] resize-y rounded-lg px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2",
                        editAnswerMethod === "Code"
                          ? "font-mono text-[12px] focus:ring-violet-500/20 focus:border-violet-500"
                          : "focus:ring-emerald-500/20 focus:border-emerald-500",
                        portalInput
                      )}
                    />
                  </div>
                </div>

                {/* Meta phụ: rationale + rubric */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div>
                    <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                      {rp.questionFields.rationale} (lý do hỏi)
                    </label>
                    <textarea
                      value={editRationale}
                      onChange={(e) => setEditRationale(e.target.value)}
                      rows={3}
                      placeholder="Lý do hỏi câu này (không gồm template/snippet meta)"
                      className={cn(
                        "w-full resize-y rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        portalInput
                      )}
                    />
                  </div>
                  <div>
                    <label className={cn("text-xs font-medium mb-1 block", portalHeading)}>
                      Scoring rubric / tiêu chí (mỗi dòng 1 tiêu chí)
                    </label>
                    <textarea
                      value={editScoringRubric}
                      onChange={(e) => setEditScoringRubric(e.target.value)}
                      rows={3}
                      className={cn(
                        "w-full resize-y rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        portalInput
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveEdit()}
                    disabled={!editQuestion.trim() || isSaving}
                    className="relative flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors overflow-hidden"
                  >
                    {!isSaving && (
                      <span className="absolute inset-0 rounded-lg bg-white/20 animate-ping pointer-events-none" />
                    )}
                    {isSaving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    {isSaving ? rp.saving : rp.questionActions.save}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={isSaving}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors",
                      portalCard,
                      portalHeading,
                      "hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    )}
                  >
                    <X size={13} />
                    {rp.questionActions.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {hasTemplateVisual ? (
                  <QuestionTemplateCard
                    bare
                    title={`#${index}`}
                    difficulty={question.difficulty}
                    prompt={question.question}
                    snippet={templateVm.snippet}
                    snippetLanguage={templateVm.snippetLanguage}
                    templateId={templateVm.templateId}
                    diagramDescription={templateVm.diagramDescription}
                    attachedImageUrl={templateVm.attachedImageUrl || question.attachedImageUrl || undefined}
                  />
                ) : (
                  <QuestionContent text={question.question} className={cn("text-sm leading-relaxed font-medium", portalHeading)} />
                )}

                {/* Lý do hỏi — luôn hiện để HR chú ý (không cần mở chi tiết) */}
                {rationaleDisplay ? (
                  <div
                    className={cn(
                      "mt-3 flex gap-2.5 rounded-xl border border-violet-200/90 bg-violet-50/90 px-3 py-2.5",
                      "shadow-[inset_0_0_0_1px_rgba(139,92,246,0.08)]",
                      "dark:border-violet-800/60 dark:bg-violet-950/40"
                    )}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm dark:bg-violet-500">
                      <Lightbulb size={14} strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-violet-700 dark:text-violet-300">
                        Lý do hỏi
                      </p>
                      <p className="mt-1 text-[13px] font-medium leading-relaxed text-violet-950 dark:text-violet-50">
                        {rationaleDisplay}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Hàng công cụ: mở chi tiết + ảnh */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAnswerOpen(!isAnswerOpen)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors",
                      isAnswerOpen
                        ? "border-primary/30 bg-primary/5 text-primary"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-primary/40 hover:text-primary dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300"
                    )}
                  >
                    {isAnswerOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {isAnswerOpen ? "Thu gọn chi tiết" : "Sample answer & rubric"}
                  </button>

                  {canEditImage && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => void handleUploadImage(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        disabled={imageBusy}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600 hover:border-primary/40 hover:text-primary disabled:opacity-40 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300"
                      >
                        {imageBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" strokeWidth={2} />}
                        {(templateVm.attachedImageUrl || question.attachedImageUrl) ? "Đổi ảnh" : "Thêm ảnh"}
                      </button>
                      {(templateVm.attachedImageUrl || question.attachedImageUrl) && (
                        <button
                          type="button"
                          disabled={imageBusy}
                          onClick={() => void handleDeleteImage()}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-40 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                        >
                          Xóa ảnh
                        </button>
                      )}
                    </>
                  )}
                </div>

                {isAnswerOpen && (
                  <div className="mt-3 space-y-2 animate-fade-up">
                    {!hasDetailContent ? (
                      <p className={cn("text-[11px]", portalSubtext)}>Chưa có chi tiết bổ sung.</p>
                    ) : (
                      <>
                        {sampleAnswerDisplay ? (
                          <div className="rounded-lg border border-gray-100 border-l-2 border-l-emerald-500 bg-emerald-50/40 px-3 py-2 dark:border-gray-800 dark:border-l-emerald-500 dark:bg-emerald-950/20">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                              Đáp án mẫu
                            </p>
                            <QuestionContent
                              text={sampleAnswerDisplay}
                              stripMatchingSnippet={templateVm.snippet}
                              codeVariant="answer"
                              className={cn("mt-1.5 text-sm leading-relaxed", portalHeading)}
                            />
                          </div>
                        ) : null}
                        {question.scoringRubric?.trim() ? (
                          <div className="rounded-lg border border-gray-100 border-l-2 border-l-amber-500 bg-amber-50/40 px-3 py-2 dark:border-gray-800 dark:border-l-amber-500 dark:bg-amber-950/20">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                              Scoring rubric
                            </p>
                            <p className={cn("mt-0.5 text-sm whitespace-pre-wrap leading-relaxed", portalHeading)}>
                              {question.scoringRubric}
                            </p>
                          </div>
                        ) : null}
                        {question.citations && question.citations.length > 0 ? (
                          <QuestionSourcesGroupedPanel
                            question={studioQuestionForSources}
                            labels={sourceLabels}
                            className="mt-0.5"
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action buttons — vertical on desktop, hidden here on mobile (shown below) */}
          {!isEditing && (
            <div className="hidden sm:flex flex-col items-center gap-1 shrink-0">
              {ASK_AI_ENABLED && (
                <button
                  type="button"
                  onClick={() => onAskAI?.(handleApplyAISuggestion)}
                  title={rp.questionActions.askAI}
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                    isAskAIActive
                      ? "bg-primary/10 text-primary"
                      : "text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-primary/10"
                  )}
                >
                  <Sparkles size={13} />
                </button>
              )}
              {locked ? (
                <div
                  title={rp.editLockedHint}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-amber-500 dark:text-amber-400"
                >
                  <Lock size={13} />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startEdit}
                    title={rp.questionActions.edit}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => !isFirst && onMoveUp()}
                    disabled={isFirst}
                    title={rp.questionActions.moveUp}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => !isLast && onMoveDown()}
                    disabled={isLast}
                    title={rp.questionActions.moveDown}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    title={rp.questionActions.delete}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile action bar — horizontal row, hidden on sm+ (handled by vertical column above) */}
        {!isEditing && (
          <div className="sm:hidden flex items-center gap-1 mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800">
            {ASK_AI_ENABLED && (
              <button
                type="button"
                onClick={() => onAskAI?.(handleApplyAISuggestion)}
                title={rp.questionActions.askAI}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-colors",
                  isAskAIActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10"
                )}
              >
                <Sparkles size={12} />
                <span>{rp.questionActions.askAI}</span>
              </button>
            )}
            {locked ? (
              <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-amber-500 dark:text-amber-400">
                <Lock size={12} />
                <span>{rp.statusPublished}</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startEdit}
                  title={rp.questionActions.edit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Pencil size={12} />
                  <span>{rp.questionActions.edit}</span>
                </button>
                <button
                  type="button"
                  onClick={() => !isFirst && onMoveUp()}
                  disabled={isFirst}
                  title={rp.questionActions.moveUp}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => !isLast && onMoveDown()}
                  disabled={isLast}
                  title={rp.questionActions.moveDown}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  title={rp.questionActions.delete}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Delete confirm inline */}
        {showDeleteConfirm && (
          <div className="mt-3 flex items-center justify-between rounded-lg px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 animate-fade-up">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              {rp.deleteConfirm}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                {rp.cancelBtn}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); onDelete(); }}
                className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                {rp.confirmDelete}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
