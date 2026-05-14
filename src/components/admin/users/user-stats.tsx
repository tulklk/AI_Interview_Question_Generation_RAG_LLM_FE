"use client";

import { Users2, UserCheck, Clock } from "lucide-react";
import type { AdminUser } from "@/types/admin";
import { useLanguage } from "@/context/language-context";

interface UserStatsProps {
  users: AdminUser[];
}

export function UserStats({ users }: UserStatsProps) {
  const { t } = useLanguage();
  const s = t.adminPages.users.stats;

  const total = users.length;
  const active = users.filter((u) => u.status === "Active").length;
  const pending = users.filter((u) => u.status === "Pending").length;

  const stats = [
    {
      label: s.totalUsers,
      value: total,
      icon: Users2,
      iconBg: "bg-[#f5f3ff]",
      iconColor: "text-[#6c47ff]",
    },
    {
      label: s.activeUsers,
      value: active,
      icon: UserCheck,
      iconBg: "bg-[#f5f3ff]",
      iconColor: "text-[#6c47ff]",
    },
    {
      label: s.pendingApproval,
      value: pending,
      icon: Clock,
      iconBg: "bg-[#f5f3ff]",
      iconColor: "text-[#6c47ff]",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((st, i) => {
        const Icon = st.icon;
        return (
          <div
            key={st.label}
            className="flex animate-fade-up items-center gap-4 rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${st.iconBg}`}
            >
              <Icon size={20} className={st.iconColor} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none text-[#111827]">{st.value}</p>
              <p className="mt-1 text-sm text-[#6b7280]">{st.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
