"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalCard, portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

interface UserPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

/**
 * Returns the list of page buttons to render.
 * Numbers are actual page indices; "…" is an ellipsis separator.
 */
function getPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  // Near the start
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "…", total];
  }
  // Near the end
  if (current >= total - 3) {
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  }
  // Middle
  return [1, "…", current - 1, current, current + 1, "…", total];
}

export function UserPagination({
  page,
  pageSize,
  totalCount,
  loading = false,
  onPageChange,
}: UserPaginationProps) {
  const { t } = useLanguage();
  const p = t.adminPages.users.pagination;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pageOf = p.pageOf
    .replace("{{page}}", String(page))
    .replace("{{total}}", String(totalPages));

  const pageRange = getPageRange(page, totalPages);

  /** Prev / Next arrow button style */
  const navBtnCls = cn(
    portalCard,
    portalHeadingAlt,
    "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium",
    "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
    "disabled:pointer-events-none disabled:opacity-40"
  );

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      {/* Left: page-of summary */}
      <span className={cn("text-xs", portalSubtextAlt)}>{pageOf}</span>

      {/* Right: prev + page numbers + next */}
      <div className="flex items-center gap-1">
        {/* ← Prev */}
        <button
          type="button"
          disabled={!canPrev || loading}
          onClick={() => onPageChange(page - 1)}
          className={navBtnCls}
        >
          <ChevronLeft size={14} />
          {p.prev}
        </button>

        {/* Numbered page buttons */}
        {pageRange.map((item, idx) =>
          item === "…" ? (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={`ellipsis-${idx}`}
              className={cn(
                "inline-flex h-8 w-6 select-none items-end justify-center pb-0.5 text-sm leading-none",
                portalSubtextAlt
              )}
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              disabled={loading}
              aria-current={item === page ? "page" : undefined}
              onClick={() => item !== page && onPageChange(item)}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium",
                "border transition-colors",
                item === page
                  ? "cursor-default border-violet-600 bg-violet-600 font-semibold text-white dark:border-violet-500 dark:bg-violet-500"
                  : cn(
                      portalCard,
                      portalHeadingAlt,
                      "border-transparent hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700",
                      "dark:hover:border-violet-800/60 dark:hover:bg-violet-950/30 dark:hover:text-violet-300"
                    )
              )}
            >
              {item}
            </button>
          )
        )}

        {/* Next → */}
        <button
          type="button"
          disabled={!canNext || loading}
          onClick={() => onPageChange(page + 1)}
          className={navBtnCls}
        >
          {p.next}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
