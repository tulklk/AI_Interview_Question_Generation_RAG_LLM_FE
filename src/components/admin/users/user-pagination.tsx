"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/language-context";

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

  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#6b7280]">{pageOf}</span>
        <button
          type="button"
          disabled={!canPrev || loading}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e5e7eb] bg-white px-2.5 text-xs font-medium text-[#111827] transition-colors hover:bg-[#f9fafb] disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={14} />
          {p.prev}
        </button>
        <button
          type="button"
          disabled={!canNext || loading}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e5e7eb] bg-white px-2.5 text-xs font-medium text-[#111827] transition-colors hover:bg-[#f9fafb] disabled:pointer-events-none disabled:opacity-40"
        >
          {p.next}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
