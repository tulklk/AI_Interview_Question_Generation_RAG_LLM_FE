"use client";

import { useAdminInView } from "@/features/admin/hooks/use-admin-in-view";
import { Users2, UserCheck, Clock, Loader2 } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { getAdminUserStatus } from "@/features/admin/utils/admin-user-display";
import type { AdminUserListItem } from "@/features/admin/types/admin-user";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useCountUp } from "@/shared/hooks/use-count-up";

function StatNumber({ value, active }: { value: number; active: boolean }) {
  const display = useCountUp(value, active);
  return <>{display}</>;
}

interface UserStatsProps {
  users: AdminUserListItem[];
  totalCount: number;
  loading?: boolean;
}

export function UserStats({ users, totalCount, loading = false }: UserStatsProps) {
  const { t } = useLanguage();
  const s = t.adminPages.users.stats;
  const { ref, isInView } = useAdminInView();

  const active = users.filter((u) => getAdminUserStatus(u) === "Active").length;
  const pending = users.filter((u) => getAdminUserStatus(u) === "Pending").length;

  const stats = [
    {
      label: s.totalUsers,
      numericValue: totalCount,
      icon: Users2,
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
      iconColor: "text-[#7C3AED] dark:text-[#a78bff]",
    },
    {
      label: s.activeUsers,
      numericValue: active,
      icon: UserCheck,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: s.pendingApproval,
      numericValue: pending,
      icon: Clock,
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div ref={ref} className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((st, i) => {
        const Icon = st.icon;
        return (
          <div
            key={st.label}
            className={cn("hr-stat-card flex items-center gap-4 p-5", isInView ? "animate-fade-up" : "opacity-0")}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10", st.iconBg)}>
              {loading ? (
                <Loader2 size={18} className={cn("animate-spin", st.iconColor)} />
              ) : (
                <Icon size={20} className={st.iconColor} />
              )}
            </div>
            <div>
              <p className={cn("text-2xl font-bold leading-none tabular-nums", portalHeadingAlt)}>
                {loading ? "—" : <StatNumber value={st.numericValue} active={isInView && !loading} />}
              </p>
              <p className={cn("mt-1 text-sm", portalSubtextAlt)}>{st.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
