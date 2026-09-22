"use client";

/**
 * SCRUM-477: thanh Tạo nhanh N câu trên Question Builder.
 * Giữ accordion soạn chi tiết; bar này tạo câu tối thiểu vào bộ đang chọn.
 */
import { useId } from "react";
import { ChevronDown, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DifficultyLevel, QuestionType } from "@/features/interview/types/generation-session";
import {
  portalCard,
  portalHeading,
  portalInput,
  portalSubtext,
} from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

export const BULK_MIN = 1;
export const BULK_MAX = 20;

const QUESTION_TYPES: QuestionType[] = [
  "Technical",
  "Behavioral",
  "Situational",
  "Problem-solving",
  "System-design",
];

const DIFFICULTIES: DifficultyLevel[] = ["Easy", "Medium", "Hard"];

export type BulkCreatePayload = {
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  count: number;
  pasteText: string;
};

type Props = {
  disabled: boolean;
  creating: boolean;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  count: number;
  pasteText: string;
  onQuestionTypeChange: (t: QuestionType) => void;
  onDifficultyChange: (d: DifficultyLevel) => void;
  onCountChange: (n: number) => void;
  onPasteTextChange: (v: string) => void;
  onCreate: () => void;
};

function clampCount(n: number) {
  if (Number.isNaN(n)) return BULK_MIN;
  return Math.min(BULK_MAX, Math.max(BULK_MIN, Math.floor(n)));
}

export function QuestionBuilderBulkBar({
  disabled,
  creating,
  questionType,
  difficulty,
  count,
  pasteText,
  onQuestionTypeChange,
  onDifficultyChange,
  onCountChange,
  onPasteTextChange,
  onCreate,
}: Props) {
  const { t } = useLanguage();
  const qb = t.questionBuilder;
  const bb = qb.bulkBar;
  const typeId = useId();
  const diffId = useId();
  const countId = useId();
  const pasteId = useId();

  return (
    <div id="qb-bulk-bar" className={cn(portalCard, "mb-3 scroll-mt-24 p-3.5 space-y-3")}>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Zap size={14} />
        </div>
        <div className="min-w-0">
          <h3 className={cn("text-sm font-semibold", portalHeading)}>{bb.title}</h3>
          <p className={cn("text-[11px] leading-snug", portalSubtext)}>{bb.hint}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-32 flex-1">
          <label htmlFor={typeId} className={cn("mb-1 block text-[11px] font-medium", portalSubtext)}>
            {bb.typeLabel}
          </label>
          <div className="relative">
            <select
              id={typeId}
              value={questionType}
              disabled={disabled || creating}
              onChange={(e) => onQuestionTypeChange(e.target.value as QuestionType)}
              className={cn(
                portalInput,
                "w-full appearance-none rounded-lg px-2.5 py-1.5 pr-7 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              )}
            >
              {QUESTION_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {qb.questionTypeOptions[ty]}
                </option>
              ))}
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="min-w-24">
          <label htmlFor={diffId} className={cn("mb-1 block text-[11px] font-medium", portalSubtext)}>
            {bb.difficultyLabel}
          </label>
          <div className="relative">
            <select
              id={diffId}
              value={difficulty}
              disabled={disabled || creating}
              onChange={(e) => onDifficultyChange(e.target.value as DifficultyLevel)}
              className={cn(
                portalInput,
                "w-full appearance-none rounded-lg px-2.5 py-1.5 pr-7 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              )}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {qb.difficultyOptions[d]}
                </option>
              ))}
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="w-20">
          <label htmlFor={countId} className={cn("mb-1 block text-[11px] font-medium", portalSubtext)}>
            {bb.countLabel}
          </label>
          <input
            id={countId}
            type="number"
            min={BULK_MIN}
            max={BULK_MAX}
            value={count}
            disabled={disabled || creating}
            onChange={(e) => onCountChange(clampCount(Number(e.target.value)))}
            className={cn(
              portalInput,
              "w-full rounded-lg px-2.5 py-1.5 text-xs tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            )}
          />
        </div>

        <button
          type="button"
          disabled={disabled || creating}
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          {creating ? bb.creatingBtn : bb.createBtn}
        </button>
      </div>

      <div>
        <label htmlFor={pasteId} className={cn("mb-1 block text-[11px] font-medium", portalSubtext)}>
          {bb.pasteLabel}
        </label>
        <textarea
          id={pasteId}
          value={pasteText}
          disabled={disabled || creating}
          onChange={(e) => onPasteTextChange(e.target.value)}
          rows={3}
          placeholder={bb.pastePlaceholder}
          className={cn(
            portalInput,
            "w-full resize-y rounded-lg px-2.5 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          )}
        />
        <p className={cn("mt-1 text-[10px]", portalSubtext)}>
          {bb.pasteEmptyHint.replace("{{count}}", String(count))}
        </p>
      </div>
    </div>
  );
}

/** Tách dòng paste → danh sách nội dung; rỗng thì trả [] */
export function splitBulkLines(text: string): string[] {
  return text
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function buildBulkQuestionTexts(
  pasteText: string,
  count: number,
  placeholderPrefix: string
): string[] {
  const lines = splitBulkLines(pasteText);
  if (lines.length > 0) {
    return lines.slice(0, BULK_MAX);
  }
  const n = clampCount(count);
  return Array.from({ length: n }, (_, i) => `${placeholderPrefix} ${i + 1}`);
}
