import { Eye, Pencil, Ban, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types/admin";

const roleConfig: Record<AdminUser["role"], { bg: string; color: string }> = {
  Admin: { bg: "bg-violet-50", color: "text-violet-600" },
  Recruiter: { bg: "bg-blue-50", color: "text-blue-600" },
  Guest: { bg: "bg-gray-100", color: "text-gray-500" },
};

const statusConfig: Record<AdminUser["status"], { bg: string; color: string }> = {
  Active: { bg: "bg-emerald-50", color: "text-emerald-600" },
  Pending: { bg: "bg-amber-50", color: "text-amber-600" },
  Suspended: { bg: "bg-red-50", color: "text-red-600" },
};

interface UserTableProps {
  users: AdminUser[];
  onEdit: (user: AdminUser) => void;
}

export function UserTable({ users, onEdit }: UserTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Active</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map((user, i) => {
            const role = roleConfig[user.role];
            const status = statusConfig[user.status];
            return (
              <tr
                key={user.id}
                className="hover:bg-gray-50/50 transition-colors animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#6c47ff]/10 flex items-center justify-center shrink-0">
                      <span className="text-[#6c47ff] text-xs font-bold">
                        {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <span className="font-medium text-gray-800">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-gray-500">{user.email}</td>
                <td className="px-4 py-3.5">
                  <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", role.bg, role.color)}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", status.bg, status.color)}>
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-gray-500 text-xs">{user.createdDate}</td>
                <td className="px-4 py-3.5 text-gray-500 text-xs">{user.lastActive}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-1.5 text-gray-400 hover:text-[#6c47ff] hover:bg-indigo-50 rounded-lg transition-colors" title="View">
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => onEdit(user)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Disable">
                      <Ban size={14} />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
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
  );
}
