"use client";

import { Search, X } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import type {
  UserTableColumnFilters,
  RoleFilterValue,
  StatusFilterValue,
  PlanFilterValue,
} from "./user-table";

interface UserFiltersProps {
  filters: UserTableColumnFilters;
  onFiltersChange: (next: Partial<UserTableColumnFilters>) => void;
  onClearFilters: () => void;
}

export function UserFilters({ filters, onFiltersChange, onClearFilters }: UserFiltersProps) {
  const { t } = useLanguage();
  const f = t.adminPages.users.filters;
  const roleLabels = t.adminPages.users.roles;

  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.role !== "all" ||
    filters.status !== "all" ||
    filters.plan !== "all" ||
    filters.createdFrom !== "" ||
    filters.createdTo !== "";

  const roles: { value: RoleFilterValue; label: string }[] = [
    { value: "all", label: f.allRoles },
    { value: "ADMIN", label: roleLabels.ADMIN },
    { value: "HR_MANAGER", label: roleLabels.HR_MANAGER },
    { value: "JOB_SEEKER", label: roleLabels.JOB_SEEKER },
  ];

  const statuses: { value: StatusFilterValue; label: string }[] = [
    { value: "all", label: f.allStatus },
    { value: "Active", label: f.statusActive },
    { value: "Suspended", label: f.statusInactive },
  ];

  const plans: { value: PlanFilterValue; label: string }[] = [
    { value: "all", label: f.allPlans },
    { value: "FREE", label: f.planFree },
    { value: "PREMIUM", label: f.planPremium },
  ];

  const selectCls = cn(
    "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors",
    "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
    "focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
  );

  const dateCls = cn(
    "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors",
    "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
    "[color-scheme:light] dark:[color-scheme:dark]",
    "focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      {/* Search by name / email */}
      <div className="relative min-w-0 w-full sm:max-w-xs sm:flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
          placeholder={f.searchPlaceholder}
          className={cn(
            "h-9 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors",
            "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
            "placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
          )}
        />
      </div>

      {/* Role */}
      <select
        value={filters.role}
        onChange={(e) => onFiltersChange({ role: e.target.value as RoleFilterValue })}
        className={selectCls}
      >
        {roles.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ status: e.target.value as StatusFilterValue })}
        className={selectCls}
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Plan */}
      <select
        value={filters.plan}
        onChange={(e) => onFiltersChange({ plan: e.target.value as PlanFilterValue })}
        className={selectCls}
      >
        {plans.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={filters.createdFrom}
          max={filters.createdTo || undefined}
          onChange={(e) => onFiltersChange({ createdFrom: e.target.value })}
          title={f.createdFrom}
          className={dateCls}
        />
        <span className="text-xs text-slate-400">—</span>
        <input
          type="date"
          value={filters.createdTo}
          min={filters.createdFrom || undefined}
          onChange={(e) => onFiltersChange({ createdTo: e.target.value })}
          title={f.createdTo}
          className={dateCls}
        />
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-500 transition-colors",
            "hover:border-slate-300 hover:text-slate-700",
            "dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
          )}
        >
          <X size={13} />
          {f.clearFilters}
        </button>
      )}
    </div>
  );
}
