"use client";

/**
 * Viewer JD gốc của bộ câu hỏi trên History — khác JdFit (đánh giá).
 * Paste → hiện text; UploadedFile → card file + có thể mở xem nội dung đã parse.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, FileText, FileUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

type Props = {
  jobDescription?: string | null;
  /** PastedText | UploadedFile */
  sourceType?: "PastedText" | "UploadedFile" | null;
  originalFileName?: string | null;
  title: string;
  emptyLabel: string;
  collapseLabel: string;
  expandLabel: string;
  missingBadge?: string;
  statsTemplate?: string;
  fromFileLabel?: string;
  viewParsedLabel?: string;
  /** Sidebar mode: clamp JD text and use Xem đầy đủ / Thu gọn. */
  compactPreview?: boolean;
};

function previewSnippet(text: string, max = 140): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max).trimEnd()}…`;
}

function fileExtBadge(name: string): string {
  const ext = name.includes(".") ? name.split(".").pop()!.toUpperCase() : "FILE";
  return ext.slice(0, 5);
}

export function JobDescriptionViewer({
  jobDescription,
  sourceType,
  originalFileName,
  title,
  emptyLabel,
  collapseLabel,
  expandLabel,
  missingBadge = "—",
  statsTemplate = "{{words}} · {{lines}}",
  fromFileLabel = "Từ file",
  viewParsedLabel = "Xem nội dung đã trích",
  compactPreview = false,
}: Props) {
  const text = jobDescription?.trim() ?? "";
  const hasJd = text.length > 0;
  const isFromFile =
    sourceType === "UploadedFile" ||
    (!!originalFileName && originalFileName.trim().length > 0);
  const fileName = originalFileName?.trim() || null;

  // Compact sidebar: start collapsed. File: mặc định thu; paste (full mode): mở text.
  const [open, setOpen] = useState(() => hasJd && !isFromFile && !compactPreview);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hydrated) {
      setHydrated(true);
      return;
    }
    if (!hasJd) {
      setOpen(false);
    }
  }, [hasJd, hydrated]);

  const statsLabel = useMemo(() => {
    if (!hasJd) return null;
    const words = text.split(/\s+/).filter(Boolean).length;
    const lines = text.split(/\n/).length;
    return statsTemplate
      .replace("{{words}}", String(words))
      .replace("{{lines}}", String(lines));
  }, [hasJd, text, statsTemplate]);

  const showBody = hasJd && (compactPreview || open);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border shadow-sm",
        isFromFile
          ? "border-indigo-200/80 bg-white dark:border-indigo-900/50 dark:bg-gray-900"
          : "border-sky-200/70 bg-white dark:border-sky-900/50 dark:bg-gray-900"
      )}
    >
      <button
        type="button"
        onClick={() => hasJd && setOpen((v) => !v)}
        disabled={!hasJd}
        aria-expanded={hasJd ? open : undefined}
        title={hasJd ? (open ? collapseLabel : expandLabel) : undefined}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
          hasJd &&
            (isFromFile
              ? "hover:bg-indigo-50/50 dark:hover:bg-indigo-950/25"
              : "hover:bg-sky-50/60 dark:hover:bg-sky-950/30"),
          "disabled:cursor-default"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            !hasJd
              ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
              : isFromFile
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                : "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
          )}
        >
          {isFromFile ? <FileUp size={16} strokeWidth={2} /> : <FileText size={16} strokeWidth={2} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={cn("text-[13px] font-semibold tracking-tight", portalHeading)}>
              {title}
            </p>
            {statsLabel ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                  isFromFile
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                )}
              >
                {statsLabel}
              </span>
            ) : (
              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                {missingBadge}
              </span>
            )}
            {isFromFile ? (
              <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                {fromFileLabel}
              </span>
            ) : null}
          </div>

          {!hasJd ? (
            <p className={cn("mt-1 text-[11px] leading-snug", portalSubtext)}>{emptyLabel}</p>
          ) : compactPreview ? (
            <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>
              {open ? collapseLabel : expandLabel}
            </p>
          ) : isFromFile && fileName && !open ? (
            <p className={cn("mt-1 truncate text-[12px] font-medium", portalHeading)} title={fileName}>
              {fileName}
            </p>
          ) : !open ? (
            <p className={cn("mt-1 line-clamp-2 text-[11px] leading-snug", portalSubtext)}>
              {previewSnippet(text)}
            </p>
          ) : (
            <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>
              {isFromFile ? viewParsedLabel : collapseLabel}
            </p>
          )}
        </div>

        {hasJd ? (
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              isFromFile
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                : "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
            )}
            aria-hidden
          >
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        ) : null}
      </button>

      {/* Card file nổi bật khi nguồn là upload */}
      {hasJd && isFromFile && fileName ? (
        <div className="border-t border-indigo-100 px-4 py-3 dark:border-indigo-900/40">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border border-indigo-200/80 bg-indigo-50/70 px-3 py-2.5",
              "dark:border-indigo-800/60 dark:bg-indigo-950/35"
            )}
          >
            <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-[9px] font-bold tracking-wide text-indigo-700 shadow-sm dark:bg-gray-900 dark:text-indigo-300">
              {fileExtBadge(fileName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-[13px] font-semibold", portalHeading)} title={fileName}>
                {fileName}
              </p>
              <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>{fromFileLabel}</p>
            </div>
          </div>
        </div>
      ) : null}

      {showBody ? (
        <div
          className={cn(
            "px-4 pb-4",
            isFromFile && fileName ? "pt-0" : "border-t border-sky-100 pt-3 dark:border-sky-900/40"
          )}
        >
          {isFromFile && open ? (
            <p className={cn("mb-2 text-[10px] font-semibold uppercase tracking-wide", portalSubtext)}>
              {viewParsedLabel}
            </p>
          ) : null}
          <div
            className={cn(
              "overflow-y-auto overscroll-contain rounded-lg border px-3.5 py-3",
              compactPreview && !open ? "max-h-36" : compactPreview ? "max-h-64" : "max-h-[min(48vh,380px)]",
              isFromFile
                ? "border-indigo-100/80 bg-linear-to-b from-indigo-50/50 to-white dark:border-indigo-900/40 dark:from-indigo-950/20 dark:to-gray-900/80"
                : "border-sky-100/80 bg-linear-to-b from-sky-50/80 to-white dark:border-sky-900/40 dark:from-sky-950/25 dark:to-gray-900/80"
            )}
          >
            <div
              className={cn(
                "pl-3.5 text-[13px] leading-[1.7] tracking-[0.01em]",
                "whitespace-pre-wrap break-words text-gray-800 dark:text-gray-100",
                compactPreview && !open ? "line-clamp-6" : "",
                isFromFile
                  ? "border-l-[3px] border-indigo-400 dark:border-indigo-500"
                  : "border-l-[3px] border-sky-400 dark:border-sky-500"
              )}
            >
              {text}
            </div>
          </div>
          {compactPreview ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              {open ? collapseLabel : expandLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
