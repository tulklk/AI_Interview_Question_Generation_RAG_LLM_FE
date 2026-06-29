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

  const btnCls = cn(
    portalCard,
    portalHeadingAlt,
    "inline-flex h-8 items-center gap-1 px-2.5 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 disabled:pointer-events-none disabled:opacity-40"
  );

  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
      <div className="flex items-center gap-2">
        <span className={cn("text-xs", portalSubtextAlt)}>{pageOf}</span>
        <button
          type="button"
          disabled={!canPrev || loading}
          onClick={() => onPageChange(page - 1)}
          className={btnCls}
        >
          <ChevronLeft size={14} />
          {p.prev}
        </button>
        <button
          type="button"
          disabled={!canNext || loading}
          onClick={() => onPageChange(page + 1)}
          className={btnCls}
        >
          {p.next}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
