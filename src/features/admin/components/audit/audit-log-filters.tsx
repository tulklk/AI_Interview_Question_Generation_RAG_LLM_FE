"use client";

import { Search } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalInput } from "@/shared/utils/portal-ui";

const ALL = "__all__";

interface AuditLogFiltersProps {
  search: string;
  eventType: string;
  onSearchChange: (v: string) => void;
  onTypeChange: (v: string) => void;
}

const filterCls = cn(
  portalInput,
  "min-h-[38px] rounded-lg text-xs transition-colors focus:border-[#6c47ff] focus:outline-none focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)]"
);

export function AuditLogFilters({
  search,
  eventType,
  onSearchChange,
  onTypeChange,
}: AuditLogFiltersProps) {
  const { t } = useLanguage();
  const f = t.adminPages.audit.filters;
  const labels = t.adminPages.audit.eventLabels;

  const typeOptions: { value: string; label: string }[] = [
    { value: ALL, label: f.allTypes },
    { value: "user_created", label: labels.user_created },
    { value: "recruiter_login", label: labels.recruiter_login },
    { value: "jd_generation", label: labels.jd_generation },
    { value: "export", label: labels.export },
    { value: "settings_change", label: labels.settings_change },
    { value: "admin_action", label: labels.admin_action },
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-3 animate-fade-up">
      <div className="relative min-w-0 w-full sm:max-w-md sm:flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={f.searchPlaceholder}
          className={cn(filterCls, "w-full py-2 pl-9 pr-4")}
        />
      </div>
      <select
        value={eventType}
        onChange={(e) => onTypeChange(e.target.value)}
        className={cn(filterCls, "w-full px-3 py-2 sm:w-auto")}
      >
        {typeOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export const AUDIT_FILTER_ALL = ALL;
