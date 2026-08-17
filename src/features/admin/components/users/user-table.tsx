"use client";

import { ChevronRight, Loader2, Users } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { getAdminUserStatus } from "@/features/admin/utils/admin-user-display";
import { AvatarCircle } from "@/shared/components/common/avatar-circle";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import type { AdminUserListItem, AdminUserRoleKey, AdminUserStatusKey } from "@/features/admin/types/admin-user";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

export type StatusFilterValue = "all" | "Active" | "Suspended";
export type RoleFilterValue = "all" | AdminUserRoleKey;
export type PlanFilterValue = "all" | "FREE" | "PREMIUM";

export interface UserTableColumnFilters {
  search: string;
  role: RoleFilterValue;
  status: StatusFilterValue;
  plan: PlanFilterValue;
  createdFrom: string;
  createdTo: string;
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
  onSelectUser: (user: AdminUserListItem) => void;
  onRetry?: () => void;
  /** Current page index — used to key the tbody animation so rows fade in on page change. */
  page?: number;
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

export function UserTable({
  users,
  loading = false,
  error = null,
  selectedUserId,
  onSelectUser,
  onRetry,
  page = 0,
}: UserTableProps) {
  const { t, lang } = useLanguage();
  const tbl = t.adminPages.users.table;
  const roleLabels = t.adminPages.users.roles;
  const statusLabels = t.adminPages.users.statusLabels;
  const viewLabel = t.adminPages.users.actions.view;
  const u = t.adminPages.users;
  const locale = lang === "vi" ? "vi-VN" : "en-US";

  const thCls =
    "bg-slate-50/80 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-205 table-fixed text-sm">
          <colgroup>
            <col className="w-auto" />
            <col className="w-37" />
            <col className="w-28" />
            <col className="w-32" />
            <col className="w-30" />
            <col className="w-10" />
          </colgroup>

          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className={cn(thCls, "px-4")}>{tbl.name}</th>
              <th className={thCls}>{tbl.role}</th>
              <th className={thCls}>{tbl.plan}</th>
              <th className={thCls}>{tbl.status}</th>
              <th className={thCls}>{tbl.created}</th>
              <th className="w-10 bg-slate-50/80 dark:bg-slate-800/40" aria-hidden />
            </tr>
          </thead>

          <AnimatePresence mode="wait" initial={false}>
            <motion.tbody
              key={page}
              className="divide-y divide-slate-100 dark:divide-slate-800/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
            {error && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-3 text-sm font-semibold text-primary hover:underline"
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
                  <Loader2 size={26} className="mx-auto animate-spin text-violet-600" />
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
                        {/* Ảnh tròn 36px nếu có URL; không URL mới hiện chữ viết tắt */}
                        <AvatarCircle
                          key={user.avatarUrl || user.id}
                          avatarUrl={user.avatarUrl}
                          fullName={user.fullName}
                          size="sm"
                          pixelSize={36}
                          className="text-xs"
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
                          "group-hover:bg-white group-hover:text-primary group-hover:shadow-sm dark:group-hover:bg-slate-800",
                          isSelected && "bg-white text-primary shadow-sm dark:bg-slate-800"
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
            </motion.tbody>
          </AnimatePresence>
        </table>
      </div>
    </div>
  );
}
