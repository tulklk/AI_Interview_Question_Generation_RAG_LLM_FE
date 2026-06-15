"use client";

import { useState } from "react";
import { Search, Filter, Clock, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { portalHeading, portalInput } from "@/lib/portal-ui";

const roleKeys = ["Frontend", "Backend", "Data", "Product", "Design", "DevOps", "ML"];
const levelKeys = ["Intern", "Junior", "Mid-Level", "Senior", "Lead"];

export function HistoryFilters() {
  const { t } = useLanguage();
  const hf = t.historyPage.filters;

  const roles = [hf.allRoles, ...roleKeys];
  const levels = [hf.allLevels, ...levelKeys];

  const [search, setSearch] = useState("");
  const [role, setRole] = useState(hf.allRoles);
  const [level, setLevel] = useState(hf.allLevels);

  const filterBox = cn(
    "flex items-center gap-2 rounded-lg px-3 py-2",
    portalInput
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
          onChange={(e) => setSearch(e.target.value)}
          placeholder={hf.searchPlaceholder}
          className={cn(
            "w-full pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
            portalInput
          )}
        />
      </div>

      <div className={filterBox}>
        <Filter size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={cn("text-sm bg-transparent focus:outline-none cursor-pointer", portalHeading)}
        >
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className={filterBox}>
        <Clock size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className={cn("text-sm bg-transparent focus:outline-none cursor-pointer", portalHeading)}
        >
          {levels.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>

      <button className={cn(
        "ml-auto flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2 transition-colors",
        portalInput,
        "hover:border-gray-300 dark:hover:border-gray-600"
      )}>
        <Download size={14} />
        {hf.exportAll}
      </button>
    </div>
  );
}
