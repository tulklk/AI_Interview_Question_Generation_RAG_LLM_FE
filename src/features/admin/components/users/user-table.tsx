"use client";

import { ChevronUp, ChevronDown, ChevronRight, Loader2, Users, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { getAdminUserStatus } from "@/features/admin/utils/admin-user-display";
import { AvatarCircle } from "@/shared/components/common/avatar-circle";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import type { AdminUserListItem, AdminUserRoleKey, AdminUserStatusKey } from "@/features/admin/types/admin-user";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

export type StatusFilterValue = "all" | "Active" | "Suspended";
export type RoleFilterValue = "all" | AdminUserRoleKey;

export interface UserTableColumnFilters {
  search: string;
  role: RoleFilterValue;
  status: StatusFilterValue;
}

const roleStyles: Record<AdminUserRoleKey, string> = {
  ADMIN: "bg-violet-50 text-violet-700 ring-violet-200/80 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800/60",
  HR_MANAGER: "bg-sky-50 text-sky-700 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800/60",
  JOB_SEEKER: "bg-slate-100 text-slate-600 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  UNKNOWN: "bg-slate-100 text-slate-500 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
};

const statusStyles: Record<AdminUserStatusKey, { badge: string; dot: string }> = {
  Active: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50",
    dot: "bg-emerald-500",
  },
  Pending: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/50",
    dot: "bg-amber-500",
  },
  Suspended: {
    badge: "bg-red-50 text-red-700 ring-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800/50",
    dot: "bg-red-500",
  },
};

interface UserTableProps {
  users: AdminUserListItem[];
  loading?: boolean;
  error?: string | null;
  selectedUserId?: string | null;
  filters: UserTableColumnFilters;
  onFiltersChange: (next: Partial<UserTableColumnFilters>) => void;
  onClearFilters: () => void;
  onSelectUser: (user: AdminUserListItem) => void;
  onRetry?: () => void;
}

function formatDate(value: string | undefined, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

const chevBtn =
  "flex flex-1 items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200";

/** Filter gọn: nhãn + stack ▲▼ — có viền ngoài, width cố định (tránh nhảy khi đổi nhãn) */
function StepperFilter<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const label = options[idx]?.label ?? value;
  const active = value !== options[0]?.value;

  function step(delta: number) {
    const n = options.length;
    if (n === 0) return;
    onChange(options[(idx + delta + n) % n]!.value);
  }

  return (
    <div
      className={cn(
        "box-border inline-flex h-7 w-full items-stretch overflow-hidden rounded-md border text-[11px]",
        active
          ? "border-violet-300 bg-violet-50/80 dark:border-violet-700 dark:bg-violet-950/30"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className={cn(
          "flex min-w-0 flex-1 items-center truncate px-1.5 font-medium tabular-nums",
          active ? "text-violet-700 dark:text-violet-300" : "text-slate-600 dark:text-slate-300"
        )}
        title={label}
      >
        {label}
      </span>
      <div className="flex w-4 shrink-0 flex-col">
        <button type="button" className={chevBtn} onClick={() => step(-1)} aria-label="Up">
          <ChevronUp size={10} strokeWidth={2.5} />
        </button>
        <button type="button" className={chevBtn} onClick={() => step(1)} aria-label="Down">
          <ChevronDown size={10} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export function UserTable({
  users,
  loading = false,
  error = null,
  selectedUserId,
  filters,
  onFiltersChange,
  onClearFilters,
  onSelectUser,
  onRetry,
}: UserTableProps) {
  const { t, lang } = useLanguage();
  const tbl = t.adminPages.users.table;
  const f = t.adminPages.users.filters;
  const roleLabels = t.adminPages.users.roles;
  const statusLabels = t.adminPages.users.statusLabels;
  const viewLabel = t.adminPages.users.actions.view;
  const u = t.adminPages.users;
  const locale = lang === "vi" ? "vi-VN" : "en-US";

  const hasActiveFilters =
    filters.search.trim() !== "" || filters.role !== "all" || filters.status !== "all";

  const roles: { value: RoleFilterValue; label: string }[] = [
    { value: "all", label: f.allShort },
    { value: "ADMIN", label: roleLabels.ADMIN },
    { value: "HR_MANAGER", label: roleLabels.HR_MANAGER },
    { value: "JOB_SEEKER", label: roleLabels.JOB_SEEKER },
  ];

  const statuses: { value: StatusFilterValue; label: string }[] = [
    { value: "all", label: f.allShort },
    { value: "Active", label: f.statusActive },
    { value: "Suspended", label: f.statusInactive },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] table-fixed text-sm">
          <colgroup>
            <col className="w-auto" />
            <col className="w-[148px]" />
            <col className="w-[112px]" />
            <col className="w-[128px]" />
            <col className="w-[120px]" />
            <col className="w-10" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className="bg-slate-50/80 px-3 py-2 text-left dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
                    <Search
                      size={12}
                      className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      value={filters.search}
                      onChange={(e) => onFiltersChange({ search: e.target.value })}
                      placeholder={tbl.name}
                      className="h-7 w-full rounded-md bg-transparent py-0 pl-7 pr-2 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-200"
                    />
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={onClearFilters}
                      className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                      title={f.clearFilters}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </th>
              <th className="w-[148px] max-w-[148px] bg-slate-50/80 px-2 py-2 text-left dark:bg-slate-800/40">
                <StepperFilter
                  options={roles}
                  value={filters.role}
                  onChange={(role) => onFiltersChange({ role })}
                />
              </th>
              <th className="w-[112px] max-w-[112px] bg-slate-50/80 px-3 py-2 text-left text-[11px] font-semibold text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                {tbl.plan}
              </th>
              <th className="w-[128px] max-w-[128px] bg-slate-50/80 px-2 py-2 text-left dark:bg-slate-800/40">
                <StepperFilter
                  options={statuses}
                  value={filters.status}
                  onChange={(status) => onFiltersChange({ status })}
                />
              </th>
              <th className="w-[120px] max-w-[120px] bg-slate-50/80 px-3 py-2 text-left text-[11px] font-semibold text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                {tbl.created}
              </th>
              <th className="w-10 bg-slate-50/80 dark:bg-slate-800/40" aria-hidden />
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {error && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-3 text-sm font-semibold text-[#6c47ff] hover:underline"
                    >
                      {u.retry}
                    </button>
                  )}
                </td>
              </tr>
            )}

            {!error && loading && (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Loader2 size={26} className="mx-auto animate-spin text-[#7C3AED]" />
                </td>
              </tr>
            )}

            {!error && !loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10">
                  <EmptyState icon={Users} title={u.emptyState} />
                </td>
              </tr>
            )}

            {!error &&
              !loading &&
              users.map((user) => {
                const statusKey = getAdminUserStatus(user);
                const status = statusStyles[statusKey];
                const isSelected = selectedUserId === user.id;

                return (
                  <tr
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    className={cn(
                      "group cursor-pointer transition-colors",
                      isSelected
                        ? "bg-violet-50/70 dark:bg-violet-950/25"
                        : "hover:bg-slate-50/90 dark:hover:bg-slate-800/40"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <AvatarCircle
                          avatarUrl={user.avatarUrl}
                          fullName={user.fullName}
                          size="sm"
                          className="!h-9 !w-9 !text-xs"
                        />
                        <div className="min-w-0">
                          <p className={cn("truncate font-semibold leading-tight", portalHeadingAlt)}>
                            {user.fullName}
                          </p>
                          <p
                            className={cn("mt-0.5 truncate text-xs", portalSubtextAlt)}
                            title={user.email}
                          >
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                          roleStyles[user.roleKey]
                        )}
                      >
                        {roleLabels[user.roleKey]}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      {user.roleKey === "ADMIN" ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ring-1 ring-inset",
                            user.isPremium
                              ? "bg-amber-50 text-amber-700 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/50"
                              : "bg-slate-100 text-slate-600 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                          )}
                        >
                          {user.isPremium ? "Premium" : "Free"}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                          status.badge
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dot)} />
                        {statusLabels[statusKey]}
                      </span>
                    </td>

                    <td
                      className={cn(
                        "whitespace-nowrap px-3 py-3 text-xs tabular-nums",
                        portalSubtextAlt
                      )}
                    >
                      {formatDate(user.createdAt, locale)}
                    </td>

                    <td className="px-2 py-3 text-right">
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition",
                          "group-hover:bg-white group-hover:text-[#6c47ff] group-hover:shadow-sm dark:group-hover:bg-slate-800",
                          isSelected && "bg-white text-[#6c47ff] shadow-sm dark:bg-slate-800"
                        )}
                        title={viewLabel}
                        aria-hidden
                      >
                        <ChevronRight size={16} strokeWidth={2.25} />
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
