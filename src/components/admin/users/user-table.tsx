"use client";

import { Eye, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { getAdminUserStatus } from "@/lib/admin-user-display";
import { AvatarCircle } from "@/components/shared/avatar-circle";
import { EmptyState } from "@/components/jobseeker/ui/empty-state";
import type { AdminUserListItem, AdminUserRoleKey, AdminUserStatusKey } from "@/types/admin-user";
import { portalDivider, portalHeadingAlt, portalSubtextAlt } from "@/lib/portal-ui";

const roleConfig: Record<AdminUserRoleKey, { bg: string; color: string }> = {
  ADMIN:      { bg: "bg-violet-50 dark:bg-violet-950/40",  color: "text-[#7C3AED] dark:text-[#a78bff]" },
  HR_MANAGER: { bg: "bg-blue-50 dark:bg-blue-950/40",      color: "text-blue-600 dark:text-blue-400" },
  JOB_SEEKER: { bg: "bg-gray-100 dark:bg-gray-800",        color: "text-gray-500 dark:text-gray-400" },
  UNKNOWN:    { bg: "bg-gray-100 dark:bg-gray-800",        color: "text-gray-500 dark:text-gray-400" },
};

const statusConfig: Record<AdminUserStatusKey, { bg: string; color: string }> = {
  Active:    { bg: "bg-emerald-50 dark:bg-emerald-950/40", color: "text-emerald-600 dark:text-emerald-400" },
  Pending:   { bg: "bg-amber-50 dark:bg-amber-950/40",     color: "text-amber-600 dark:text-amber-400" },
  Suspended: { bg: "bg-red-50 dark:bg-red-950/40",         color: "text-red-600 dark:text-red-400" },
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
            className="hr-glass-card mt-4 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {u.retry}
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="hr-glass-card flex min-h-70 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="hr-glass-card">
        <EmptyState icon={Users} title={u.emptyState} />
      </div>
    );
  }

  return (
    <div className="hr-glass-card overflow-hidden animate-fade-up">
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-sm">
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
                    "group cursor-pointer hr-table-row transition-colors animate-fade-up",
                    isSelected && "bg-[rgba(124,58,237,0.06)] dark:bg-[rgba(124,58,237,0.12)]"
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
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", role.bg, role.color)}>
                      {roleLabels[user.roleKey]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", status.bg, status.color)}>
                      {statusLabels[statusKey]}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3.5 text-xs", portalSubtextAlt)}>
                    {formatDate(user.createdAt, lang === "vi" ? "vi-VN" : "en-US")}
                  </td>
                  <td className="px-2 py-3.5">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 transition-colors group-hover:bg-[rgba(124,58,237,0.1)] group-hover:text-[#7C3AED] dark:group-hover:text-[#a78bff]"
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
