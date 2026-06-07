"use client";

import { Eye, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { getAdminUserStatus } from "@/lib/admin-user-display";
import { AvatarCircle } from "@/components/shared/avatar-circle";
import { EmptyState } from "@/components/jobseeker/ui/empty-state";
import type { AdminUserListItem, AdminUserRoleKey, AdminUserStatusKey } from "@/types/admin-user";

const roleConfig: Record<AdminUserRoleKey, { bg: string; color: string }> = {
  ADMIN: { bg: "bg-[#f5f3ff]", color: "text-[#6c47ff]" },
  HR_MANAGER: { bg: "bg-[#f5f7fb]", color: "text-[#111827]" },
  JOB_SEEKER: { bg: "bg-[#f5f7fb]", color: "text-[#6b7280]" },
  UNKNOWN: { bg: "bg-[#f5f7fb]", color: "text-[#6b7280]" },
};

const statusConfig: Record<AdminUserStatusKey, { bg: string; color: string }> = {
  Active: { bg: "bg-[#f5f3ff]", color: "text-[#6c47ff]" },
  Pending: { bg: "bg-[#fef3c7]", color: "text-[#92400e]" },
  Suspended: { bg: "bg-red-50", color: "text-red-600" },
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
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
        <p className="text-sm text-red-700">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#111827] shadow-sm ring-1 ring-[#e5e7eb] hover:bg-[#f9fafb]"
          >
            {u.retry}
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-[#e5e7eb] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
        <Loader2 size={28} className="animate-spin text-[#6c47ff]" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
        <EmptyState icon={Users} title={u.emptyState} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] animate-fade-up">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-[#e5e7eb] bg-[#f9fafb]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.name}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.email}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.role}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.status}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.created}
              </th>
              <th className="w-10 px-2 py-3" aria-hidden />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f4f6]">
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
                    "group cursor-pointer transition-colors hover:bg-[#f9fafb]/80 animate-fade-up",
                    isSelected && "bg-[rgba(108,71,255,0.06)]"
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
                      <span className="font-medium text-[#111827]">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[#6b7280]">{user.email}</td>
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
                  <td className="px-4 py-3.5 text-xs text-[#6b7280]">
                    {formatDate(user.createdAt, lang === "vi" ? "vi-VN" : "en-US")}
                  </td>
                  <td className="px-2 py-3.5">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#9ca3af] transition-colors group-hover:bg-[rgba(108,71,255,0.1)] group-hover:text-[#6c47ff]"
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
