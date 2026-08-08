"use client";

/**
 * SCRUM-397 v3: cột giữa — composer đủ field như Studio Save.
 */
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

export type ContentMode = "theory" | "code" | "system_design";

const CODE_TEMPLATES = STUDIO_QUESTION_TEMPLATES.filter((t) => t.id !== "SYSTEM_DESIGN");

const TEMPLATE_META: Record<
  StudioCodeTemplateId,
  { icon: typeof Code2; hintVi: string }
> = {
  CODE_COMPLETION: { icon: Code2, hintVi: "Ứng viên hoàn thiện đoạn code" },
  BUG_DETECTION: { icon: Bug, hintVi: "Tìm và giải thích lỗi trong code" },
  REFACTORING: { icon: Wrench, hintVi: "Cải thiện code smell / clean code" },
  TEST_CASE_DESIGN: { icon: FileSearch, hintVi: "Thiết kế test case / edge cases" },
  PERFORMANCE_ANALYSIS: { icon: Gauge, hintVi: "Phân tích độ phức tạp / tối ưu" },
  SYSTEM_DESIGN: { icon: Network, hintVi: "Thiết kế kiến trúc hệ thống" },
};

const QUESTION_TYPES: QuestionType[] = [
  "Technical",
  "Behavioral",
  "Situational",
  "Problem-solving",
  "System-design",
];

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

export function QuestionBuilderComposer(props: Props) {
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
      {/* Content mode */}
      <div>
        <h3 className={cn(portalHeading, "mb-2 text-sm font-semibold")}>Loại nội dung</h3>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "theory" as const, label: "Lý thuyết", icon: BookOpen },
              { id: "code" as const, label: "Code", icon: Code2 },
              { id: "system_design" as const, label: "System design", icon: Network },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const active = contentMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                onClick={() => onContentModeChange(m.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50",
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 text-gray-600 hover:border-primary/40 dark:border-gray-700 dark:text-gray-300"
                )}
              >
                <Icon size={16} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates (code / system design) */}
      {contentMode === "code" ? (
        <div>
          <h3 className={cn(portalHeading, "mb-2 text-sm font-semibold")}>Mẫu code</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                    "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-gray-200 hover:border-primary/40 dark:border-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      active
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    )}
                  >
                    <Icon size={15} />
                  </span>
                  <span>
                    <span className={cn(portalHeading, "block text-xs font-semibold")}>{tpl.label}</span>
                    <span className={cn(portalSubtext, "mt-0.5 block text-[10px]")}>{meta.hintVi}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {contentMode === "system_design" ? (
        <p className={cn(portalSubtext, "rounded-lg bg-sky-50 px-3 py-2 text-xs dark:bg-sky-950/30")}>
          Template System design — thêm gợi ý diagram bên dưới để History/Marketplace hiển thị đúng card.
        </p>
      ) : null}

      {/* Question content */}
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label className={cn(portalHeading, "text-xs font-semibold")}>Nội dung câu hỏi</label>
          <span className={cn(portalSubtext, "text-[10px] tabular-nums")}>{question.length} ký tự</span>
        </div>
        <textarea
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          rows={4}
          disabled={disabled}
          className={cn(
            portalInput,
            "w-full rounded-xl px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
          )}
          placeholder={
            disabled
              ? "Chọn hoặc tạo bộ câu hỏi trước khi soạn..."
              : "Nhập nội dung câu hỏi..."
          }
        />
      </div>

      {contentMode === "code" ? (
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label className={cn(portalHeading, "text-xs font-semibold")}>
              Code snippet (đề bài — không phải đáp án)
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
              <span className="font-medium">Ngôn ngữ</span>
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
              "w-full rounded-xl px-3 py-2 font-mono text-xs outline-none focus:border-primary disabled:opacity-50"
            )}
            placeholder="Để trống sẽ dùng snippet mẫu theo template..."
          />
        </div>
      ) : null}

      {contentMode === "system_design" ? (
        <div>
          <label className={cn(portalHeading, "mb-1.5 block text-xs font-semibold")}>
            Gợi ý diagram
          </label>
          <textarea
            value={diagramDescription}
            onChange={(e) => onDiagramDescriptionChange(e.target.value)}
            rows={3}
            disabled={disabled}
            className={cn(
              portalInput,
              "w-full rounded-xl px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
            )}
            placeholder="VD: architecture overview, sequence diagram, ERD..."
          />
        </div>
      ) : null}

      {/* Classification */}
      <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
        <h3 className={cn(portalHeading, "text-xs font-semibold")}>Phân loại</h3>

        <div>
          <p className={cn(portalSubtext, "mb-1.5 text-[10px] font-medium uppercase")}>Độ khó</p>
          <div className="flex flex-wrap gap-1.5">
            {(["Easy", "Medium", "Hard"] as DifficultyLevel[]).map((d) => (
              <button
                key={d}
                type="button"
                disabled={disabled}
                onClick={() => onDifficultyChange(d)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
                  difficulty === d
                    ? d === "Easy"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : d === "Hard"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={cn(portalSubtext, "mb-1.5 text-[10px] font-medium uppercase")}>Loại câu hỏi</p>
          <div className="flex flex-wrap gap-1.5">
            {QUESTION_TYPES.map((qt) => (
              <button
                key={qt}
                type="button"
                disabled={disabled}
                onClick={() => onQuestionTypeChange(qt)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-50",
                  questionType === qt
                    ? "bg-primary text-white"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700"
                )}
              >
                {qt}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label className={cn(portalHeading, "mb-1 block text-[11px] font-semibold")}>
              Skill / tech tag
            </label>
            <input
              value={skill}
              onChange={(e) => onSkillChange(e.target.value)}
              disabled={disabled}
              placeholder="VD: React, SQL, Redis"
              className={cn(
                portalInput,
                "w-full rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-50"
              )}
            />
          </div>
          <div>
            <label className={cn(portalHeading, "mb-1 block text-[11px] font-semibold")}>
              Focus area
            </label>
            <input
              value={focusArea}
              onChange={(e) => onFocusAreaChange(e.target.value)}
              disabled={disabled}
              placeholder="VD: Frontend, Database"
              className={cn(
                portalInput,
                "w-full rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-primary disabled:opacity-50"
              )}
            />
          </div>
        </div>
      </div>

      {/* Answer & rubric */}
      <div className="space-y-3">
        <h3 className={cn(portalHeading, "text-sm font-semibold")}>Đáp án & chấm điểm</h3>
        <div>
          <label className={cn(portalHeading, "mb-1.5 block text-xs font-semibold")}>
            Sample answer (đáp án mẫu)
          </label>
          <textarea
            value={sampleAnswer}
            onChange={(e) => onSampleAnswerChange(e.target.value)}
            rows={4}
            disabled={disabled}
            className={cn(
              portalInput,
              "w-full rounded-xl px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
            )}
            placeholder="Đáp án mẫu cho HR / marketplace — không nhét code snippet đề bài vào đây."
          />
        </div>
        <div>
          <label className={cn(portalHeading, "mb-1.5 block text-xs font-semibold")}>
            Rubric / tiêu chí đánh giá
          </label>
          <textarea
            value={rubricText}
            onChange={(e) => onRubricTextChange(e.target.value)}
            rows={3}
            disabled={disabled}
            className={cn(
              portalInput,
              "w-full rounded-xl px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
            )}
            placeholder={"Mỗi dòng 1 tiêu chí, ví dụ:\nGiải thích đúng nguyên nhân lỗi\nĐề xuất fix hợp lý\nNêu edge case"}
          />
        </div>
        <div>
          <label className={cn(portalHeading, "mb-1.5 block text-xs font-semibold")}>
            Rationale (lý do hỏi)
          </label>
          <input
            value={rationale}
            onChange={(e) => onRationaleChange(e.target.value)}
            disabled={disabled}
            placeholder="VD: Kiểm tra hiểu biết về concurrency"
            className={cn(
              portalInput,
              "w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
            )}
          />
        </div>
      </div>

      {/* Image */}
      <div className="space-y-2">
        <label className={cn(portalHeading, "block text-xs font-semibold")}>
          Gợi ý hình ảnh + đính kèm
        </label>
        <textarea
          value={imageHint}
          onChange={(e) => onImageHintChange(e.target.value)}
          rows={2}
          disabled={disabled}
          className={cn(
            portalInput,
            "w-full rounded-xl px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
          )}
          placeholder={imageHintPlaceholder}
        />
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600 hover:border-primary/50 dark:border-gray-600 dark:text-gray-300">
          <ImagePlus size={14} className="text-primary" />
          <span>{imageFileName ?? "Chọn ảnh JPEG/PNG/WebP (upload sau khi lưu)"}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="hidden"
            disabled={disabled}
            onChange={(e) => onPickImage(e.target.files?.[0])}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || disabled}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Đang lưu..." : "Lưu & thêm câu tiếp"}
        </button>
        {selectedSetId ? (
          <Link
            href={`/hr/history/${selectedSetId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ListPlus size={14} />
            Xem bộ câu hỏi
          </Link>
        ) : null}
      </div>
    </section>
  );
}
