"use client";

import { Search, UserPlus } from "lucide-react";
import { useLanguage } from "@/context/language-context";

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
  const { t } = useLanguage();
  const f = t.adminPages.users.filters;
  const u = t.adminPages.users;

  const roles = [f.allRoles, "Admin", "Recruiter", "Guest"];
  const statuses = [f.allStatus, "Active", "Pending", "Suspended"];

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 animate-fade-up">
      <div className="relative min-w-0 w-full sm:max-w-xs sm:flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={f.searchPlaceholder}
          className="min-h-[38px] w-full rounded-lg border border-[#e5e7eb] bg-white py-2 pl-9 pr-4 text-xs text-[#111827] transition-colors focus:border-[#6c47ff] focus:outline-none focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)]"
        />
      </div>

      <select
        value={role}
        onChange={(e) => onRoleChange(e.target.value)}
        className="min-h-[38px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#111827] focus:border-[#6c47ff] focus:outline-none focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)]"
      >
        {roles.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="min-h-[38px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#111827] focus:border-[#6c47ff] focus:outline-none focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)]"
      >
        {statuses.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={onAddUser}
        className="ml-0 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#6c47ff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a3dd9] active:bg-[#4b2fbf] sm:ml-auto sm:w-auto"
      >
        <UserPlus size={15} />
        {u.addUser}
      </button>
    </div>
  );
}
