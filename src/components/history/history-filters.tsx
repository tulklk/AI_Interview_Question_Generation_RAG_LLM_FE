"use client";

import { Search, Filter, Clock, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { portalHeading, portalInput } from "@/lib/portal-ui";

const roleKeys = ["Frontend", "Backend", "Data", "Product", "Design", "DevOps", "ML"];
const levelKeys = ["Intern", "Junior", "Mid-Level", "Senior", "Lead"];

interface HistoryFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  role: string;
  onRoleChange: (v: string) => void;
  level: string;
  onLevelChange: (v: string) => void;
}

export function HistoryFilters({
  search,
  onSearchChange,
  role,
  onRoleChange,
  level,
  onLevelChange,
}: HistoryFiltersProps) {
  const { t } = useLanguage();
  const hf = t.historyPage.filters;

  const roles = [{ value: "", label: hf.allRoles }, ...roleKeys.map((r) => ({ value: r, label: r }))];
  const levels = [{ value: "", label: hf.allLevels }, ...levelKeys.map((l) => ({ value: l, label: l }))];

  const filterBox = cn(
    "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
    "bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60",
    "text-gray-900 dark:text-gray-100"
  );

  return (
    <div className="flex items-center gap-3 mb-4 animate-fade-up">
      <div className="relative flex-1 max-w-xs">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={hf.searchPlaceholder}
          className={cn(
            "w-full pl-9 pr-4 py-2 text-sm rounded-lg transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 dark:focus:ring-violet-400/20 dark:focus:border-violet-400",
            "bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60",
            "text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          )}
        />
      </div>

      <div className={filterBox}>
        <Filter size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
        <select
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          className={cn("text-sm bg-transparent focus:outline-none cursor-pointer", portalHeading)}
        >
          {roles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className={filterBox}>
        <Clock size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
        <select
          value={level}
          onChange={(e) => onLevelChange(e.target.value)}
          className={cn("text-sm bg-transparent focus:outline-none cursor-pointer", portalHeading)}
        >
          {levels.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className={cn(
          "ml-auto flex items-center gap-2 text-sm font-semibold rounded-lg px-4 py-2 transition-colors",
          "bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60",
          "text-gray-700 dark:text-gray-300",
          "hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-600 dark:hover:text-violet-400"
        )}
      >
        <Download size={14} />
        {hf.exportAll}
      </button>
    </div>
  );
}
