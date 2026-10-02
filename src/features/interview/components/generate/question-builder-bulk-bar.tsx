"use client";

/**
 * Thêm nhiều câu vào danh sách phiên.
 * Đóng mặc định và nằm trên danh sách — không cạnh ô soạn.
 * Loại và độ khó lấy từ câu đang chọn ở giữa.
 */
import { useId, useState } from "react";
import { ChevronDown, ListPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalInput, portalSubtext } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

export const BULK_MIN = 1;
export const BULK_MAX = 20;

type Props = {
  disabled: boolean;
  creating: boolean;
  count: number;
  pasteText: string;
  onCountChange: (n: number) => void;
  onPasteTextChange: (v: string) => void;
  onCreate: () => void;
  /** Parent đóng panel sau khi tạo xong. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function clampCount(n: number) {
  if (Number.isNaN(n)) return BULK_MIN;
  return Math.min(BULK_MAX, Math.max(BULK_MIN, Math.floor(n)));
}

export function QuestionBuilderBulkBar({
  disabled,
  creating,
  count,
  pasteText,
  onCountChange,
  onPasteTextChange,
  onCreate,
  open: openProp,
  onOpenChange,
}: Props) {
  const { t } = useLanguage();
  const bb = t.questionBuilder.bulkBar;
  const qb = t.questionBuilder;
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const open = openProp ?? openUncontrolled;
  const setOpen = onOpenChange ?? setOpenUncontrolled;
  const countId = useId();
  const pasteId = useId();

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800/60"
      >
        <ListPlus size={14} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1">{qb.bulkToggle}</span>
        <ChevronDown
          size={14}
          className={cn("shrink-0 text-gray-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-gray-100 px-3 py-2.5 dark:border-gray-800">
          <p className={cn("text-[11px] leading-snug", portalSubtext)}>{qb.bulkUsesCurrentMeta}</p>
          <div className="flex items-end gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? <Loader2 size={12} className="animate-spin" /> : <ListPlus size={12} />}
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
      ) : null}
    </div>
  );
}

/** Tách dòng paste thành danh sách nội dung. */
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
