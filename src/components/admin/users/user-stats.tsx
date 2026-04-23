"use client";

import { Users2, UserCheck, Clock } from "lucide-react";
import { adminUsers } from "@/data/admin";
import { useLanguage } from "@/context/language-context";

export function UserStats() {
  const { t } = useLanguage();
  const s = t.adminPages.users.stats;

  const total = adminUsers.length;
  const active = adminUsers.filter((u) => u.status === "Active").length;
  const pending = adminUsers.filter((u) => u.status === "Pending").length;

  const stats = [
    { label: s.totalUsers, value: total, icon: Users2, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
    { label: s.activeUsers, value: active, icon: UserCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-500" },
    { label: s.pendingApproval, value: pending, icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-500" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {stats.map((st, i) => {
        const Icon = st.icon;
        return (
          <div
            key={st.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${st.iconBg}`}>
              <Icon size={20} className={st.iconColor} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{st.value}</p>
              <p className="text-sm text-gray-500 mt-1">{st.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
