"use client";

import { Search, Download } from "lucide-react";
import { useLanguage } from "@/context/language-context";

interface ContentFiltersProps {
  search: string;
  role: string;
  dateRange: string;
  onSearchChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onDateRangeChange: (v: string) => void;
  onExportAll: () => void;
}

export function ContentFilters({
  search,
  role,
  dateRange,
  onSearchChange,
  onRoleChange,
  onDateRangeChange,
  onExportAll,
}: ContentFiltersProps) {
  const { t } = useLanguage();
  const f = t.adminPages.content.filters;
  const c = t.adminPages.content;

  const roles = [f.allRoles, "Frontend", "Backend", "Data", "Product", "Design", "DevOps", "ML"];
  const dateRanges = [f.allTime, f.today, f.thisWeek, f.thisMonth, f.last3Months];

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 animate-fade-up">
      <div className="relative min-w-0 w-full sm:max-w-xs sm:flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={f.searchPlaceholder}
          className="min-h-[38px] w-full rounded-lg border border-[#e5e7eb] bg-white py-2 pl-9 pr-4 text-xs text-[#111827] transition-colors placeholder:text-[#9ca3af] focus:border-[#6c47ff] focus:outline-none focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)]"
        />
      </div>

      <select
        value={role}
        onChange={(e) => onRoleChange(e.target.value)}
        className="min-h-[38px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#111827] transition-colors focus:border-[#6c47ff] focus:outline-none focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)]"
      >
        {roles.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>

      <select
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value)}
        className="min-h-[38px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#111827] transition-colors focus:border-[#6c47ff] focus:outline-none focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)]"
      >
        {dateRanges.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={onExportAll}
        className="ml-0 inline-flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition-colors hover:border-[#d1d5db] hover:bg-[#f9fafb] sm:ml-auto sm:w-auto"
      >
        <Download size={14} />
        {c.exportAll}
      </button>
    </div>
  );
}
