"use client";

/**
 * SCRUM-397 v3: cột giữa — composer đủ field như Studio Save.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bug,
  Code2,
  FileSearch,
  Gauge,
  ImagePlus,
  ListPlus,
  Loader2,
  Network,
  Save,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/cn";
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
  rubricText: string;
  onRubricTextChange: (v: string) => void;
  rationale: string;
  onRationaleChange: (v: string) => void;
  imageHint: string;
  onImageHintChange: (v: string) => void;
  imageHintPlaceholder: string;
  imageFileName: string | null;
  onPickImage: (file: File | undefined) => void;
  saving: boolean;
  onSave: () => void;
};

/** Small uppercase tracking label for field groups. */
function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400",
        className
      )}
    >
      {children}
    </p>
  );
}

/** Section header with a left accent bar. */
function SectionHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="h-3.5 w-0.5 shrink-0 rounded-full bg-primary/70" />
      <span className={cn(portalHeading, "text-xs font-semibold")}>{children}</span>
    </div>
  );
}

export function QuestionBuilderComposer(props: Props) {
  const { t } = useLanguage();
  const qb = t.questionBuilder;

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
    rubricText,
    onRubricTextChange,
    rationale,
    onRationaleChange,
    imageHint,
    onImageHintChange,
    imageHintPlaceholder,
    imageFileName,
    onPickImage,
    saving,
    onSave,
  } = props;

  return (
    <section className={cn(portalCard, "space-y-5 p-4 sm:p-5")}>

      {/* ── Content mode — segmented control ── */}
      <div>
        <FieldLabel className="mb-2">{qb.contentModeLabel}</FieldLabel>
        <div className="flex rounded-xl border border-gray-200 bg-gray-50/80 p-1 dark:border-gray-700 dark:bg-gray-800/40">
          {CONTENT_MODES.map((m) => {
            const Icon = m.icon;
            const active = contentMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                onClick={() => onContentModeChange(m.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-all disabled:opacity-50",
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
      </div>

      {/* ── Mode-sensitive content — key re-mounts on switch → clean entrance animation ── */}
      <div
        key={contentMode}
        className="space-y-4"
        style={{ animation: "slideUpFade 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
      >
        {/* Templates (code only) */}
        {contentMode === "code" ? (
          <div>
            <FieldLabel className="mb-2">{qb.templateLabel}</FieldLabel>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {CODE_TEMPLATES.map((tpl) => {
                const meta = TEMPLATE_META[tpl.id];
                const Icon = meta.icon;
                const active = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onTemplateChange(tpl.id)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all disabled:opacity-50",
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
                      <span className={cn(portalHeading, "block text-xs font-semibold")}>{tpl.label}</span>
                      <span className={cn(portalSubtext, "mt-0.5 block text-[10px] leading-snug")}>{qb.templateHints[tpl.id]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* System design info banner */}
        {contentMode === "system_design" ? (
          <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 dark:border-sky-900/30 dark:bg-sky-950/20">
            <Network size={13} className="mt-px shrink-0 text-sky-500" />
            <p className="text-[11px] leading-relaxed text-sky-700 dark:text-sky-300">
              {qb.systemDesignBanner}
            </p>
          </div>
        ) : null}

        {/* Question content */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <FieldLabel>{qb.questionContentLabel}</FieldLabel>
            <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-500">{question.length} {qb.charCount}</span>
          </div>
          <textarea
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            rows={4}
            disabled={disabled}
            className={cn(
              portalInput,
              "w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary disabled:opacity-50"
            )}
            placeholder={
              disabled
                ? qb.questionPlaceholderDisabled
                : qb.questionPlaceholder
            }
          />
        </div>

        {/* Code snippet (code only) */}
        {contentMode === "code" ? (
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <FieldLabel>{qb.codeSnippetLabel}</FieldLabel>
              <label className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                <span className="font-semibold">{qb.languageLabel}</span>
                <select
                  value={snippetLanguage}
                  onChange={(e) => onSnippetLanguageChange(e.target.value)}
                  disabled={disabled}
                  className={cn(
                    portalInput,
                    "rounded-md px-2 py-1 text-[11px] font-semibold outline-none focus:border-primary disabled:opacity-50"
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
              disabled={disabled}
              className={cn(
                portalInput,
                "w-full rounded-xl px-3 py-2.5 font-mono text-xs leading-relaxed outline-none focus:border-primary disabled:opacity-50"
              )}
              placeholder={qb.codeSnippetPlaceholder}
            />
          </div>
        ) : null}

        {/* Diagram description (system_design only) */}
        {contentMode === "system_design" ? (
          <div>
            <FieldLabel className="mb-1.5">{qb.diagramLabel}</FieldLabel>
            <textarea
              value={diagramDescription}
              onChange={(e) => onDiagramDescriptionChange(e.target.value)}
              rows={3}
              disabled={disabled}
              className={cn(
                portalInput,
                "w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary disabled:opacity-50"
              )}
              placeholder={qb.diagramPlaceholder}
            />
          </div>
        ) : null}
      </div>

      {/* ── Phân loại ── */}
      <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 dark:border-gray-800 dark:bg-gray-800/25">
        <SectionHeader>{qb.classificationSection}</SectionHeader>

        <div>
          <FieldLabel className="mb-2">{qb.difficultyLabel}</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {(["Easy", "Medium", "Hard"] as DifficultyLevel[]).map((d) => (
              <button
                key={d}
                type="button"
                disabled={disabled}
                onClick={() => onDifficultyChange(d)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50",
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
                disabled={disabled}
                onClick={() => onQuestionTypeChange(qt)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-50",
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
              disabled={disabled}
              placeholder={qb.skillPlaceholder}
              className={cn(
                portalInput,
                "w-full rounded-lg px-2.5 py-2 text-xs outline-none focus:border-primary disabled:opacity-50"
              )}
            />
          </div>
          <div>
            <FieldLabel className="mb-1.5">{qb.focusAreaLabel}</FieldLabel>
            <input
              value={focusArea}
              onChange={(e) => onFocusAreaChange(e.target.value)}
              disabled={disabled}
              placeholder={qb.focusAreaPlaceholder}
              className={cn(
                portalInput,
                "w-full rounded-lg px-2.5 py-2 text-xs outline-none focus:border-primary disabled:opacity-50"
              )}
            />
          </div>
        </div>
      </div>

      {/* ── Đáp án & chấm điểm ── */}
      <div className="space-y-3.5">
        <SectionHeader>{qb.scoringSection}</SectionHeader>

        <div>
          <FieldLabel className="mb-1.5">{qb.sampleAnswerLabel}</FieldLabel>
          <textarea
            value={sampleAnswer}
            onChange={(e) => onSampleAnswerChange(e.target.value)}
            rows={4}
            disabled={disabled}
            className={cn(
              portalInput,
              "w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary disabled:opacity-50"
            )}
            placeholder={qb.sampleAnswerPlaceholder}
          />
        </div>

        <div>
          <FieldLabel className="mb-1.5">{qb.rubricLabel}</FieldLabel>
          <textarea
            value={rubricText}
            onChange={(e) => onRubricTextChange(e.target.value)}
            rows={3}
            disabled={disabled}
            className={cn(
              portalInput,
              "w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary disabled:opacity-50"
            )}
            placeholder={qb.rubricPlaceholder}
          />
        </div>

        <div>
          <FieldLabel className="mb-1.5">{qb.rationaleLabel}</FieldLabel>
          <input
            value={rationale}
            onChange={(e) => onRationaleChange(e.target.value)}
            disabled={disabled}
            placeholder={qb.rationalePlaceholder}
            className={cn(
              portalInput,
              "w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
            )}
          />
        </div>
      </div>

      {/* ── Hình ảnh đính kèm ── */}
      <div className="space-y-2">
        <SectionHeader className="mb-2">{qb.imageSection}</SectionHeader>
        <textarea
          value={imageHint}
          onChange={(e) => onImageHintChange(e.target.value)}
          rows={2}
          disabled={disabled}
          className={cn(
            portalInput,
            "w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary disabled:opacity-50"
          )}
          placeholder={imageHintPlaceholder}
        />
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-200 px-3 py-2.5 text-xs text-gray-500 transition-colors hover:border-primary/40 hover:bg-gray-50/50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800/40">
          <ImagePlus size={14} className="text-primary" />
          <span>{imageFileName ?? qb.imagePickerLabel}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="hidden"
            disabled={disabled}
            onChange={(e) => onPickImage(e.target.files?.[0])}
          />
        </label>
      </div>

      {/* ── Save ── */}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || disabled}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-60"
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
