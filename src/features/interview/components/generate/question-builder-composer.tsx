"use client";

/**
 * SCRUM-397 v4: cột giữa — composer đủ field như Studio Save.
 * Chia thành các mục thu gọn được + chip trạng thái để HR biết còn thiếu gì.
 */
import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bug,
  ChevronDown,
  Code2,
  FileSearch,
  Gauge,
  ImagePlus,
  Layers,
  ListPlus,
  Loader2,
  Network,
  PenLine,
  Save,
  SlidersHorizontal,
  Target,
  Trash2,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { isPublishReady, RubricEditor, type RubricV1 } from "@/shared/rubric";
import {
  STUDIO_QUESTION_TEMPLATES,
  type StudioCodeTemplateId,
} from "@/features/studio/constants/question-templates";
import { SNIPPET_LANGUAGE_OPTIONS } from "@/features/studio/utils/question-template-infer";
import type { DifficultyLevel, QuestionType } from "@/features/interview/types/generation-session";
import {
  portalCard,
  portalHeading,
  portalInput,
  portalSubtext,
} from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

export type ContentMode = "theory" | "code" | "system_design";

const CODE_TEMPLATES = STUDIO_QUESTION_TEMPLATES.filter((t) => t.id !== "SYSTEM_DESIGN");

const TEMPLATE_META: Record<StudioCodeTemplateId, { icon: typeof Code2 }> = {
  CODE_COMPLETION: { icon: Code2 },
  BUG_DETECTION: { icon: Bug },
  REFACTORING: { icon: Wrench },
  TEST_CASE_DESIGN: { icon: FileSearch },
  PERFORMANCE_ANALYSIS: { icon: Gauge },
  SYSTEM_DESIGN: { icon: Network },
};

const QUESTION_TYPES: QuestionType[] = [
  "Technical",
  "Behavioral",
  "Situational",
  "Problem-solving",
  "System-design",
];

const CONTENT_MODES = [
  { id: "theory" as const, icon: BookOpen },
  { id: "code" as const, icon: Code2 },
  { id: "system_design" as const, icon: Network },
] as const;

const FALLBACK_TEXT = {
  composerTitle: "Compose question",
  composerSubtitle: "Fill in the sections below, then save into the selected set.",
  requiredTag: "Required",
  optionalTag: "Optional",
  filledTag: "Filled",
  emptyTag: "Empty",
  completeness: "Completeness",
  noSetTitle: "No question set selected",
  noSetBody: "Pick a DRAFT set on the left, or create a new one to start composing.",
  sectionContentType: "Content type",
  sectionContentTypeHint: "Pick the question format and a matching code template.",
  sectionQuestionHint: "The prompt candidates will read.",
  classificationHint: "Improves filtering and recommendations.",
  scoringHint: "Needed before publishing to the Marketplace.",
  imageSectionHint: "Optional illustration shown with the question.",
  saveHintNeedQuestion: "Enter the question content to save.",
  removeImage: "Remove image",
};

type Props = {
  disabled: boolean;
  selectedSetId: string | null;
  contentMode: ContentMode;
  onContentModeChange: (m: ContentMode) => void;
  selectedTemplate: StudioCodeTemplateId;
  onTemplateChange: (id: StudioCodeTemplateId) => void;
  questionType: QuestionType;
  onQuestionTypeChange: (t: QuestionType) => void;
  question: string;
  onQuestionChange: (v: string) => void;
  codeSnippet: string;
  onCodeSnippetChange: (v: string) => void;
  /** Ngôn ngữ snippet: "auto" | csharp | typescript | … */
  snippetLanguage: string;
  onSnippetLanguageChange: (v: string) => void;
  diagramDescription: string;
  onDiagramDescriptionChange: (v: string) => void;
  difficulty: DifficultyLevel;
  onDifficultyChange: (d: DifficultyLevel) => void;
  skill: string;
  onSkillChange: (v: string) => void;
  focusArea: string;
  onFocusAreaChange: (v: string) => void;
  sampleAnswer: string;
  onSampleAnswerChange: (v: string) => void;
  rubricDoc: RubricV1;
  onRubricDocChange: (v: RubricV1) => void;
  rationale: string;
  onRationaleChange: (v: string) => void;
  imageHint: string;
  onImageHintChange: (v: string) => void;
  imageHintPlaceholder: string;
  imageFileName: string | null;
  onPickImage: (file: File | undefined) => void;
  /** Preview ảnh local để hiện thumbnail trước khi lưu. */
  imagePreviewUrl?: string | null;
  onRemoveImage?: () => void;
  saving: boolean;
  onSave: () => void;
};

/** Small uppercase tracking label for field groups. */
function FieldLabel({
  children,
  className,
  required,
}: {
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <p
      className={cn(
        "text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400",
        className
      )}
    >
      {children}
      {required && <span className="ml-1 text-rose-500">*</span>}
    </p>
  );
}

type SectionStatus = "done" | "todo" | "optional";

function StatusChip({ status, labels }: { status: SectionStatus; labels: typeof FALLBACK_TEXT }) {
  if (status === "done") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        {labels.filledTag}
      </span>
    );
  }
  if (status === "todo") {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
        {labels.requiredTag}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      {labels.optionalTag}
    </span>
  );
}

/** Mỗi bước soạn câu hỏi là một khối gập được, có số thứ tự + trạng thái. */
function Section({
  index,
  icon: Icon,
  title,
  hint,
  status,
  labels,
  defaultOpen = true,
  children,
}: {
  index: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  hint: string;
  status: SectionStatus;
  labels: typeof FALLBACK_TEXT;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 bg-gray-50/70 px-3.5 py-3 text-left transition-colors hover:bg-gray-100/70 dark:bg-gray-800/40 dark:hover:bg-gray-800/70"
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
            status === "done"
              ? "bg-emerald-500 text-white"
              : status === "todo"
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
          )}
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("flex items-center gap-1.5 text-xs font-bold", portalHeading)}>
            <Icon size={13} className="shrink-0 text-primary" />
            {title}
          </span>
          <span className={cn("mt-0.5 block text-[11px] leading-snug", portalSubtext)}>{hint}</span>
        </span>
        <StatusChip status={status} labels={labels} />
        <ChevronDown
          size={15}
          className={cn(
            "shrink-0 text-gray-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div
          className="space-y-4 px-3.5 py-4"
          style={{ animation: "slideUpFade 0.22s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function QuestionBuilderComposer(props: Props) {
  const { t } = useLanguage();
  const qb = t.questionBuilder;
  const labels = { ...FALLBACK_TEXT, ...(qb as unknown as Partial<typeof FALLBACK_TEXT>) };

  /** Map content mode id → translated label */
  const modeLabel: Record<string, string> = {
    theory: qb.modes.theory,
    code: qb.modes.code,
    system_design: qb.modes.systemDesign,
  };

  const {
    disabled,
    selectedSetId,
    contentMode,
    onContentModeChange,
    selectedTemplate,
    onTemplateChange,
    questionType,
    onQuestionTypeChange,
    question,
    onQuestionChange,
    codeSnippet,
    onCodeSnippetChange,
    snippetLanguage,
    onSnippetLanguageChange,
    diagramDescription,
    onDiagramDescriptionChange,
    difficulty,
    onDifficultyChange,
    skill,
    onSkillChange,
    focusArea,
    onFocusAreaChange,
    sampleAnswer,
    onSampleAnswerChange,
    rubricDoc,
    onRubricDocChange,
    rationale,
    onRationaleChange,
    imageHint,
    onImageHintChange,
    imageHintPlaceholder,
    imageFileName,
    onPickImage,
    imagePreviewUrl,
    onRemoveImage,
    saving,
    onSave,
  } = props;

  const hasQuestion = question.trim().length > 0;
  const hasSample = sampleAnswer.trim().length > 0;
  const rubricReady = isPublishReady(rubricDoc);
  const hasTags = skill.trim().length > 0 || focusArea.trim().length > 0;
  const hasImage = Boolean(imageFileName) || imageHint.trim().length > 0;

  // Thanh hoàn thiện: 4 mục quyết định câu hỏi có publish được lên Marketplace.
  const checks = [hasQuestion, hasSample, rubricReady, hasTags];
  const doneCount = checks.filter(Boolean).length;
  const donePct = Math.round((doneCount / checks.length) * 100);

  // Chưa chọn bộ → hiện empty state thay vì hàng loạt input bị mờ.
  if (disabled) {
    return (
      <section className={cn(portalCard, "p-8")}>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Layers size={22} className="text-primary" />
          </span>
          <p className={cn("text-sm font-bold", portalHeading)}>{labels.noSetTitle}</p>
          <p className={cn("max-w-sm text-xs leading-relaxed", portalSubtext)}>{labels.noSetBody}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn(portalCard, "overflow-hidden")}>
      {/* Header + thanh hoàn thiện */}
      <div className="border-b border-gray-100 px-4 py-3.5 dark:border-gray-800 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={cn("flex items-center gap-1.5 text-sm font-bold", portalHeading)}>
              <PenLine size={14} className="text-primary" />
              {labels.composerTitle}
            </h3>
            <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>{labels.composerSubtitle}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("text-[10px] font-semibold uppercase tracking-widest", portalSubtext)}>
              {labels.completeness}
            </p>
            <p className={cn("text-sm font-bold tabular-nums", portalHeading)}>
              {doneCount}
              <span className={portalSubtext}>/{checks.length}</span>
            </p>
          </div>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              donePct === 100 ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${donePct}%` }}
          />
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        {/* ── 1. Loại nội dung + template ── */}
        <Section
          index={1}
          icon={Layers}
          title={labels.sectionContentType}
          hint={labels.sectionContentTypeHint}
          status="done"
          labels={labels}
        >
          <div className="flex rounded-xl border border-gray-200 bg-gray-50/80 p-1 dark:border-gray-700 dark:bg-gray-800/40">
            {CONTENT_MODES.map((m) => {
              const Icon = m.icon;
              const active = contentMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onContentModeChange(m.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-all",
                    active
                      ? "bg-white text-primary shadow-sm ring-1 ring-gray-200/70 dark:bg-gray-700 dark:text-primary dark:ring-gray-600"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  )}
                >
                  <Icon size={13} />
                  {modeLabel[m.id]}
                </button>
              );
            })}
          </div>

          {contentMode === "code" && (
            <div
              key="tpl"
              style={{ animation: "slideUpFade 0.25s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
            >
              <FieldLabel className="mb-2">{qb.templateLabel}</FieldLabel>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {CODE_TEMPLATES.map((tpl) => {
                  const Icon = TEMPLATE_META[tpl.id].icon;
                  const active = selectedTemplate === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => onTemplateChange(tpl.id)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                        active
                          ? "border-primary/40 bg-primary/5 shadow-sm"
                          : "border-gray-100 hover:border-primary/25 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                          active
                            ? "bg-primary text-white"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        <Icon size={14} />
                      </span>
                      <span>
                        <span className={cn(portalHeading, "block text-xs font-semibold")}>
                          {tpl.label}
                        </span>
                        <span className={cn(portalSubtext, "mt-0.5 block text-[10px] leading-snug")}>
                          {qb.templateHints[tpl.id]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {contentMode === "system_design" && (
            <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 dark:border-sky-900/30 dark:bg-sky-950/20">
              <Network size={13} className="mt-px shrink-0 text-sky-500" />
              <p className="text-[11px] leading-relaxed text-sky-700 dark:text-sky-300">
                {qb.systemDesignBanner}
              </p>
            </div>
          )}
        </Section>

        {/* ── 2. Nội dung câu hỏi ── */}
        <Section
          index={2}
          icon={PenLine}
          title={qb.questionContentLabel}
          hint={labels.sectionQuestionHint}
          status={hasQuestion ? "done" : "todo"}
          labels={labels}
        >
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <FieldLabel required>{qb.questionContentLabel}</FieldLabel>
              <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
                {question.length} {qb.charCount}
              </span>
            </div>
            <textarea
              value={question}
              onChange={(e) => onQuestionChange(e.target.value)}
              rows={5}
              disabled={saving}
              className={cn(
                portalInput,
                "w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary disabled:opacity-60"
              )}
              placeholder={qb.questionPlaceholder}
            />
          </div>

          {contentMode === "code" && (
            <div key="snippet">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <FieldLabel>{qb.codeSnippetLabel}</FieldLabel>
                <label className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">{qb.languageLabel}</span>
                  <select
                    value={snippetLanguage}
                    onChange={(e) => onSnippetLanguageChange(e.target.value)}
                    disabled={saving}
                    className={cn(
                      portalInput,
                      "rounded-md px-2 py-1 text-[11px] font-semibold outline-none focus:border-primary disabled:opacity-60"
                    )}
                  >
                    {SNIPPET_LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <textarea
                value={codeSnippet}
                onChange={(e) => onCodeSnippetChange(e.target.value)}
                rows={6}
                disabled={saving}
                className={cn(
                  portalInput,
                  "w-full rounded-xl px-3 py-2.5 font-mono text-xs leading-relaxed outline-none focus:border-primary disabled:opacity-60"
                )}
                placeholder={qb.codeSnippetPlaceholder}
              />
            </div>
          )}

          {contentMode === "system_design" && (
            <div key="diagram">
              <FieldLabel className="mb-1.5">{qb.diagramLabel}</FieldLabel>
              <textarea
                value={diagramDescription}
                onChange={(e) => onDiagramDescriptionChange(e.target.value)}
                rows={3}
                disabled={saving}
                className={cn(
                  portalInput,
                  "w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary disabled:opacity-60"
                )}
                placeholder={qb.diagramPlaceholder}
              />
            </div>
          )}
        </Section>

        {/* ── 3. Phân loại ── */}
        <Section
          index={3}
          icon={SlidersHorizontal}
          title={qb.classificationSection}
          hint={labels.classificationHint}
          status={hasTags ? "done" : "optional"}
          labels={labels}
        >
          <div>
            <FieldLabel className="mb-2">{qb.difficultyLabel}</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {(["Easy", "Medium", "Hard"] as DifficultyLevel[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDifficultyChange(d)}
                  disabled={saving}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                    difficulty === d
                      ? d === "Easy"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : d === "Hard"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                      : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel className="mb-2">{qb.questionTypeLabel}</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {QUESTION_TYPES.map((qt) => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => onQuestionTypeChange(qt)}
                  disabled={saving}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed",
                    questionType === qt
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
                  )}
                >
                  {qt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <FieldLabel className="mb-1.5">{qb.skillLabel}</FieldLabel>
              <input
                value={skill}
                onChange={(e) => onSkillChange(e.target.value)}
                placeholder={qb.skillPlaceholder}
                disabled={saving}
                className={cn(
                  portalInput,
                  "w-full rounded-lg px-2.5 py-2 text-xs outline-none focus:border-primary disabled:opacity-60"
                )}
              />
            </div>
            <div>
              <FieldLabel className="mb-1.5">{qb.focusAreaLabel}</FieldLabel>
              <input
                value={focusArea}
                onChange={(e) => onFocusAreaChange(e.target.value)}
                placeholder={qb.focusAreaPlaceholder}
                disabled={saving}
                className={cn(
                  portalInput,
                  "w-full rounded-lg px-2.5 py-2 text-xs outline-none focus:border-primary disabled:opacity-60"
                )}
              />
            </div>
          </div>
        </Section>

        {/* ── 4. Đáp án & chấm điểm ── */}
        <Section
          index={4}
          icon={Target}
          title={qb.scoringSection}
          hint={labels.scoringHint}
          status={hasSample && rubricReady ? "done" : "optional"}
          labels={labels}
        >
          <div>
            <FieldLabel className="mb-1.5">{qb.sampleAnswerLabel}</FieldLabel>
            <textarea
              value={sampleAnswer}
              onChange={(e) => onSampleAnswerChange(e.target.value)}
              rows={4}
              disabled={saving}
              className={cn(
                portalInput,
                "w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary disabled:opacity-60"
              )}
              placeholder={qb.sampleAnswerPlaceholder}
            />
          </div>

          <RubricEditor
            value={rubricDoc}
            onChange={onRubricDocChange}
            questionType={questionType}
            contentMode={contentMode}
            disabled={saving}
          />

          <div>
            <FieldLabel className="mb-1.5">{qb.rationaleLabel}</FieldLabel>
            <input
              value={rationale}
              onChange={(e) => onRationaleChange(e.target.value)}
              placeholder={qb.rationalePlaceholder}
              disabled={saving}
              className={cn(
                portalInput,
                "w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
              )}
            />
          </div>
        </Section>

        {/* ── 5. Hình ảnh ── */}
        <Section
          index={5}
          icon={ImagePlus}
          title={qb.imageSection}
          hint={labels.imageSectionHint}
          status={hasImage ? "done" : "optional"}
          labels={labels}
          defaultOpen={false}
        >
          <textarea
            value={imageHint}
            onChange={(e) => onImageHintChange(e.target.value)}
            rows={2}
            disabled={saving}
            className={cn(
              portalInput,
              "w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary disabled:opacity-60"
            )}
            placeholder={imageHintPlaceholder}
          />

          {imagePreviewUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-2.5 dark:border-gray-800 dark:bg-gray-800/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt={imageFileName ?? "preview"}
                className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
              />
              <p className={cn("min-w-0 flex-1 truncate text-xs font-medium", portalHeading)}>
                {imageFileName}
              </p>
              {onRemoveImage && (
                <button
                  type="button"
                  onClick={onRemoveImage}
                  disabled={saving}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <Trash2 size={12} />
                  {labels.removeImage}
                </button>
              )}
            </div>
          ) : (
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-gray-700 dark:hover:border-primary/40",
                saving && "pointer-events-none opacity-60"
              )}
            >
              <ImagePlus size={20} className="text-primary" />
              <span className={cn("text-xs font-medium", portalHeading)}>
                {qb.imagePickerLabel}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="hidden"
                disabled={saving}
                onChange={(e) => onPickImage(e.target.files?.[0])}
              />
            </label>
          )}
        </Section>
      </div>

      {/* ── Thanh lưu dính đáy ── */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/90 sm:px-5">
        {!hasQuestion && (
          <p className="mr-auto text-[11px] font-medium text-amber-600 dark:text-amber-400">
            {labels.saveHintNeedQuestion}
          </p>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !hasQuestion}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-50",
            hasQuestion && "ml-auto"
          )}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? qb.savingBtn : qb.saveBtn}
        </button>
        {selectedSetId ? (
          <Link
            href={`/hr/history/${selectedSetId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ListPlus size={14} />
            {qb.viewSetBtn}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
