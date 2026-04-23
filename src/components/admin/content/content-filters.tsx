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
}

export function ContentFilters({
  search,
  role,
  dateRange,
  onSearchChange,
  onRoleChange,
  onDateRangeChange,
}: ContentFiltersProps) {
  const { t } = useLanguage();
  const f = t.adminPages.content.filters;
  const c = t.adminPages.content;

  const roles = [f.allRoles, "Frontend", "Backend", "Data", "Product", "Design", "DevOps", "ML"];
  const dateRanges = [f.allTime, f.today, f.thisWeek, f.thisMonth, f.last3Months];

  return (
    <div className="flex items-center gap-3 mb-4 animate-fade-up">
      <div className="relative flex-1 max-w-xs">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={f.searchPlaceholder}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors"
        />
      </div>

      <select
        value={role}
        onChange={(e) => onRoleChange(e.target.value)}
        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors"
      >
        {roles.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>

      <select
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value)}
        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors"
      >
        {dateRanges.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>

      <button className="ml-auto flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 bg-white rounded-lg px-4 py-2 transition-colors hover:border-gray-300">
        <Download size={14} />
        {c.exportAll}
      </button>
    </div>
  );
}
