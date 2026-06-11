"use client";

import { Search } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import type { AdminUserRoleKey } from "@/types/admin-user";
import { cn } from "@/lib/utils";
import { portalInput } from "@/lib/portal-ui";

export type StatusFilterValue = "all" | "Active" | "Pending" | "Suspended";
export type RoleFilterValue = "all" | AdminUserRoleKey;

interface UserFiltersProps {
  search: string;
  role: RoleFilterValue;
  status: StatusFilterValue;
  onSearchChange: (v: string) => void;
  onRoleChange: (v: RoleFilterValue) => void;
  onStatusChange: (v: StatusFilterValue) => void;
}

const filterCls = cn(
  portalInput,
  "min-h-[38px] rounded-lg text-xs transition-colors focus:border-[#6c47ff] focus:outline-none focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)]"
);

export function UserFilters({
  search,
  role,
  status,
  onSearchChange,
  onRoleChange,
  onStatusChange,
}: UserFiltersProps) {
  const { t } = useLanguage();
  const f = t.adminPages.users.filters;
  const roleLabels = t.adminPages.users.roles;

  const roles: { value: RoleFilterValue; label: string }[] = [
    { value: "all", label: f.allRoles },
    { value: "ADMIN", label: roleLabels.ADMIN },
    { value: "HR_MANAGER", label: roleLabels.HR_MANAGER },
    { value: "JOB_SEEKER", label: roleLabels.JOB_SEEKER },
  ];

  const statuses: { value: StatusFilterValue; label: string }[] = [
    { value: "all", label: f.allStatus },
    { value: "Active", label: f.statusActive },
    { value: "Pending", label: f.statusPending },
    { value: "Suspended", label: f.statusInactive },
  ];

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 animate-fade-up">
      <div className="relative min-w-0 w-full sm:max-w-xs sm:flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={f.searchPlaceholder}
          className={cn(filterCls, "w-full py-2 pl-9 pr-4")}
        />
      </div>

      <select
        value={role}
        onChange={(e) => onRoleChange(e.target.value as RoleFilterValue)}
        className={cn(filterCls, "px-3 py-2")}
      >
        {roles.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as StatusFilterValue)}
        className={cn(filterCls, "px-3 py-2")}
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
