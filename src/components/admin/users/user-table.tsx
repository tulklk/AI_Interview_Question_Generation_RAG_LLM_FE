"use client";

import { Eye, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { getAdminUserStatus } from "@/lib/admin-user-display";
import { AvatarCircle } from "@/components/shared/avatar-circle";
import { EmptyState } from "@/components/jobseeker/ui/empty-state";
import type { AdminUserListItem, AdminUserRoleKey, AdminUserStatusKey } from "@/types/admin-user";
import { portalCard, portalDivider, portalHeadingAlt, portalSubtextAlt, portalTableRow } from "@/lib/portal-ui";

const roleConfig: Record<AdminUserRoleKey, { bg: string; color: string }> = {
  ADMIN: { bg: "bg-[#f5f3ff] dark:bg-[#6c47ff]/10", color: "text-[#6c47ff]" },
  HR_MANAGER: { bg: "bg-[#f5f7fb] dark:bg-gray-800", color: "text-[#111827] dark:text-gray-200" },
  JOB_SEEKER: { bg: "bg-[#f5f7fb] dark:bg-gray-800", color: "text-[#6b7280] dark:text-gray-400" },
  UNKNOWN: { bg: "bg-[#f5f7fb] dark:bg-gray-800", color: "text-[#6b7280] dark:text-gray-400" },
};

const statusConfig: Record<AdminUserStatusKey, { bg: string; color: string }> = {
  Active: { bg: "bg-[#f5f3ff] dark:bg-[#6c47ff]/10", color: "text-[#6c47ff]" },
  Pending: { bg: "bg-[#fef3c7] dark:bg-amber-950/40", color: "text-[#92400e] dark:text-amber-400" },
  Suspended: { bg: "bg-red-50 dark:bg-red-950/40", color: "text-red-600 dark:text-red-400" },
};

interface UserTableProps {
  users: AdminUserListItem[];
  loading?: boolean;
  error?: string | null;
  selectedUserId?: string | null;
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

export function UserTable({
  users,
  loading = false,
  error = null,
  selectedUserId,
  onSelectUser,
  onRetry,
}: UserTableProps) {
  const { t, lang } = useLanguage();
  const tbl = t.adminPages.users.table;
  const roleLabels = t.adminPages.users.roles;
  const statusLabels = t.adminPages.users.statusLabels;
  const viewLabel = t.adminPages.users.actions.view;
  const u = t.adminPages.users;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-6 py-10 text-center">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className={cn(portalCard, "mt-4 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800")}
          >
            {u.retry}
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn(portalCard, "flex min-h-[280px] items-center justify-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-none")}>
        <Loader2 size={28} className="animate-spin text-[#6c47ff]" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className={cn(portalCard, "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-none")}>
        <EmptyState icon={Users} title={u.emptyState} />
      </div>
    );
  }

  return (
    <div className={cn(portalCard, "overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-none animate-fade-up")}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className={cn("border-b bg-gray-50 dark:bg-gray-800/50", portalDivider)}>
            <tr>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {tbl.name}
              </th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {tbl.email}
              </th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {tbl.role}
              </th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {tbl.status}
              </th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {tbl.created}
              </th>
              <th className="w-10 px-2 py-3" aria-hidden />
            </tr>
          </thead>
          <tbody className={cn("divide-y", portalDivider)}>
            {users.map((user, i) => {
              const statusKey = getAdminUserStatus(user);
              const role = roleConfig[user.roleKey];
              const status = statusConfig[statusKey];
              const isSelected = selectedUserId === user.id;

              return (
                <tr
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  className={cn(
                    "group cursor-pointer transition-colors animate-fade-up",
                    portalTableRow,
                    isSelected && "bg-[rgba(108,71,255,0.06)] dark:bg-[rgba(108,71,255,0.12)]"
                  )}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <AvatarCircle
                        avatarUrl={user.avatarUrl}
                        fullName={user.fullName}
                        size="sm"
                      />
                      <span className={cn("font-medium", portalHeadingAlt)}>{user.fullName}</span>
                    </div>
                  </td>
                  <td className={cn("px-4 py-3.5", portalSubtextAlt)}>{user.email}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        role.bg,
                        role.color
                      )}
                    >
                      {roleLabels[user.roleKey]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        status.bg,
                        status.color
                      )}
                    >
                      {statusLabels[statusKey]}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3.5 text-xs", portalSubtextAlt)}>
                    {formatDate(user.createdAt, lang === "vi" ? "vi-VN" : "en-US")}
                  </td>
                  <td className="px-2 py-3.5">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 transition-colors group-hover:bg-[rgba(108,71,255,0.1)] group-hover:text-[#6c47ff]"
                      title={viewLabel}
                      aria-hidden
                    >
                      <Eye size={14} />
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
