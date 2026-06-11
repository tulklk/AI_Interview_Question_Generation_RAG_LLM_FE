"use client";

import { Users2, UserCheck, Clock, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { getAdminUserStatus } from "@/lib/admin-user-display";
import type { AdminUserListItem } from "@/types/admin-user";
import { cn } from "@/lib/utils";
import { portalCard, portalHeadingAlt, portalSubtextAlt } from "@/lib/portal-ui";

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
      iconBg: "bg-[#f5f3ff] dark:bg-[#6c47ff]/10",
      iconColor: "text-[#6c47ff]",
    },
    {
      label: s.activeUsers,
      value: loading ? "—" : active,
      icon: UserCheck,
      iconBg: "bg-[#f5f3ff] dark:bg-[#6c47ff]/10",
      iconColor: "text-[#6c47ff]",
    },
    {
      label: s.pendingApproval,
      value: loading ? "—" : pending,
      icon: Clock,
      iconBg: "bg-[#f5f3ff] dark:bg-[#6c47ff]/10",
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
            className={cn(portalCard, "flex animate-fade-up items-center gap-4 p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-none")}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className={cn(`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg`, st.iconBg)}
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
