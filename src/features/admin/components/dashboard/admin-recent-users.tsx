"use client";

import Link from "next/link";
import { Users, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import {
  getAdminUserStatus,
  normalizeAdminRoleKey,
} from "@/features/admin/utils/admin-user-display";
import type { AdminUserListItem, AdminUserRoleKey } from "@/features/admin/types/admin-user";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ statusKey, label }: { statusKey: string; label: string }) {
  if (statusKey === "Active")
    return (
      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
        {label}
      </span>
    );
  if (statusKey === "Pending")
    return (
      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
        {label}
      </span>
    );
  return (
    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

function RoleBadge({ roleKey, label }: { roleKey: AdminUserRoleKey; label: string }) {
  if (roleKey === "ADMIN")
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">
        {label}
      </span>
    );
  if (roleKey === "HR_MANAGER")
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
        {label}
      </span>
    );
  if (roleKey === "JOB_SEEKER")
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
        {label}
      </span>
    );
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5"
        >
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-3 w-36 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-2.5 w-48 rounded bg-gray-50 dark:bg-gray-800/70 animate-pulse" />
          </div>
          <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-5 w-14 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-3 w-12 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AdminRecentUsersProps {
  users: AdminUserListItem[];
  loading: boolean;
}

export function AdminRecentUsers({ users, loading }: AdminRecentUsersProps) {
  const { t } = useLanguage();
  const d = t.adminPages.dashboard.recentUsers;
  const roles = t.adminPages.users.roles;
  const statusLabels = t.adminPages.users.statusLabels;

  return (
    <div className="hr-glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
            <Users size={14} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className={cn("text-sm font-bold leading-tight", portalHeadingAlt)}>{d.title}</h2>
            <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{d.subtitle}</p>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-hover transition-colors"
        >
          {d.viewAll}
          <ExternalLink size={10} />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonRows count={5} />
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Users size={28} className="text-gray-300 dark:text-gray-700" />
          <p className={cn("text-xs", portalSubtextAlt)}>{d.empty}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                <th className={cn("text-left px-4 py-2.5 font-semibold", portalSubtextAlt)}>
                  {d.name}
                </th>
                <th className={cn("text-left px-4 py-2.5 font-semibold", portalSubtextAlt)}>
                  {d.role}
                </th>
                <th className={cn("text-left px-4 py-2.5 font-semibold", portalSubtextAlt)}>
                  {d.status}
                </th>
                <th
                  className={cn(
                    "text-right px-4 py-2.5 font-semibold",
                    portalSubtextAlt
                  )}
                >
                  {d.joined}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.slice(0, 5).map((user) => {
                const statusKey = getAdminUserStatus(user);
                const roleKey = user.roleKey ?? normalizeAdminRoleKey(user.role);
                const statusLabel =
                  statusLabels[statusKey as keyof typeof statusLabels] ?? statusKey;
                const roleLabel = roles[roleKey as keyof typeof roles] ?? user.role;
                const joinedDate = user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "2-digit",
                    })
                  : "—";
                return (
                  <tr key={user.id} className="hr-table-row">
                    <td className="px-4 py-3">
                      <p
                        className={cn(
                          "font-medium leading-tight truncate max-w-40",
                          portalHeadingAlt
                        )}
                      >
                        {user.fullName}
                      </p>
                      <p
                        className={cn(
                          "text-[10px] truncate max-w-40",
                          portalSubtextAlt
                        )}
                      >
                        {user.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge roleKey={roleKey} label={roleLabel} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge statusKey={statusKey} label={statusLabel} />
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right tabular-nums",
                        portalSubtextAlt
                      )}
                    >
                      {joinedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
