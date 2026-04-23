"use client";

import { Search, UserPlus } from "lucide-react";

const roles = ["All Roles", "Admin", "Recruiter", "Guest"];
const statuses = ["All Status", "Active", "Pending", "Suspended"];

interface UserFiltersProps {
  search: string;
  role: string;
  status: string;
  onSearchChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onAddUser: () => void;
}

export function UserFilters({
  search,
  role,
  status,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onAddUser,
}: UserFiltersProps) {
  return (
    <div className="flex items-center gap-3 mb-4 animate-fade-up">
      <div className="relative flex-1 max-w-xs">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors"
        />
      </div>

      <select
        value={role}
        onChange={(e) => onRoleChange(e.target.value)}
        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors"
      >
        {roles.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors"
      >
        {statuses.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>

      <button
        onClick={onAddUser}
        className="ml-auto flex items-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
      >
        <UserPlus size={15} />
        Add User
      </button>
    </div>
  );
}
