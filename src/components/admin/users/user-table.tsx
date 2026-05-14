"use client";

import { Eye, Pencil, Ban, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types/admin";
import { useLanguage } from "@/context/language-context";

const roleConfig: Record<AdminUser["role"], { bg: string; color: string }> = {
  Admin: { bg: "bg-[#f5f3ff]", color: "text-[#6c47ff]" },
  Recruiter: { bg: "bg-[#f5f7fb]", color: "text-[#111827]" },
  Guest: { bg: "bg-[#f5f7fb]", color: "text-[#6b7280]" },
};

const statusConfig: Record<AdminUser["status"], { bg: string; color: string }> = {
  Active: { bg: "bg-[#f5f3ff]", color: "text-[#6c47ff]" },
  Pending: { bg: "bg-[#fef3c7]", color: "text-[#92400e]" },
  Suspended: { bg: "bg-red-50", color: "text-red-600" },
};

interface UserTableProps {
  users: AdminUser[];
  onEdit: (user: AdminUser) => void;
  onSuspend: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

export function UserTable({ users, onEdit, onSuspend, onDelete }: UserTableProps) {
  const { t } = useLanguage();
  const tbl = t.adminPages.users.table;
  const actions = t.adminPages.users.actions;
  const roleLabels = t.adminPages.users.roles;
  const statusLabels = t.adminPages.users.statusLabels;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] animate-fade-up">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.lastActive}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                {tbl.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3f4f6]">
            {users.map((user, i) => {
              const role = roleConfig[user.role];
              const status = statusConfig[user.status];
              return (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-[#f9fafb]/80 animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(108,71,255,0.1)]">
                        <span className="text-xs font-bold text-[#6c47ff]">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                      </div>
                      <span className="font-medium text-[#111827]">{user.name}</span>
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
                      {roleLabels[user.role]}
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
                      {statusLabels[user.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#6b7280]">{user.createdDate}</td>
                  <td className="px-4 py-3.5 text-xs text-[#6b7280]">{user.lastActive}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-[#9ca3af] transition-colors hover:bg-[rgba(108,71,255,0.1)] hover:text-[#6c47ff]"
                        title={actions.view}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(user)}
                        className="rounded-lg p-1.5 text-[#9ca3af] transition-colors hover:bg-[#f5f7fb] hover:text-[#111827]"
                        title={actions.edit}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSuspend(user)}
                        disabled={user.status === "Suspended"}
                        className="rounded-lg p-1.5 text-[#9ca3af] transition-colors hover:bg-[#fef3c7] hover:text-[#92400e] disabled:pointer-events-none disabled:opacity-40"
                        title={actions.disable}
                      >
                        <Ban size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(user)}
                        className="rounded-lg p-1.5 text-[#9ca3af] transition-colors hover:bg-red-50 hover:text-red-600"
                        title={actions.delete}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
