"use client";

import { Users2, UserCheck, Clock, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { getAdminUserStatus } from "@/lib/admin-user-display";
import type { AdminUserListItem } from "@/types/admin-user";
import { cn } from "@/lib/utils";
import { portalHeadingAlt, portalSubtextAlt } from "@/lib/portal-ui";

interface UserStatsProps {
  users: AdminUserListItem[];
  totalCount: number;
  loading?: boolean;
}

export function UserStats({ users, totalCount, loading = false }: UserStatsProps) {
  const { t } = useLanguage();
  const s = t.adminPages.users.stats;

  const active = users.filter((u) => getAdminUserStatus(u) === "Active").length;
  const pending = users.filter((u) => getAdminUserStatus(u) === "Pending").length;

  const stats = [
    {
      label: s.totalUsers,
      value: loading ? "—" : totalCount,
      icon: Users2,
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
      iconColor: "text-[#7C3AED] dark:text-[#a78bff]",
    },
    {
      label: s.activeUsers,
      value: loading ? "—" : active,
      icon: UserCheck,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: s.pendingApproval,
      value: loading ? "—" : pending,
      icon: Clock,
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((st, i) => {
        const Icon = st.icon;
        return (
          <div
            key={st.label}
            className="hr-stat-card flex animate-fade-up items-center gap-4 p-5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10", st.iconBg)}
            >
              {loading ? (
                <Loader2 size={18} className={cn("animate-spin", st.iconColor)} />
              ) : (
                <Icon size={20} className={st.iconColor} />
              )}
            </div>
            <div>
              <p className={cn("text-2xl font-bold leading-none", portalHeadingAlt)}>{st.value}</p>
              <p className={cn("mt-1 text-sm", portalSubtextAlt)}>{st.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
