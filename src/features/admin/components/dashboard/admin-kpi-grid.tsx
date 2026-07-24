"use client";

import { useState, useEffect } from "react";
import { animate } from "framer-motion";
import { useAdminInView } from "@/features/admin/hooks/use-admin-in-view";
import { Users, UserCheck, UserSearch, Building2, Zap, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type { AdminDashboardStats } from "@/features/admin/services/admin-dashboard.service";

function useCountUp(target: number, active: boolean): string {
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    if (!active || target === 0) { setDisplay(target.toLocaleString()); return; }
    const c = animate(0, target, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString()),
    });
    return () => c.stop();
  }, [target, active]);
  return display;
}

interface KpiCardProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  desc: string;
  value: number;
  loading: boolean;
  pending?: boolean;
  isInView: boolean;
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, desc, value, loading, pending, isInView }: KpiCardProps) {
  const animated = useCountUp(value, isInView && !loading && !pending);

  return (
    <div className={cn("hr-stat-card rounded-xl p-5 flex flex-col gap-3", pending && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon size={16} className={iconColor} />
        </div>
        {pending && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 shrink-0">
            API pending
          </span>
        )}
      </div>
      <div>
        {loading ? (
          <div className="h-7 w-16 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse mb-1.5" />
        ) : (
          <p className={cn("text-[26px] font-extrabold leading-none tabular-nums", portalHeadingAlt)}>
            {pending ? "—" : animated}
          </p>
        )}
        <p className={cn("text-[11px] font-semibold uppercase tracking-wider mt-2", portalSubtextAlt)}>
          {label}
        </p>
        <p className={cn("text-[10px] mt-0.5 leading-snug", portalSubtextAlt)}>{desc}</p>
      </div>
    </div>
  );
}

interface AdminKpiGridProps {
  data: AdminDashboardStats | null;
  loading: boolean;
}

export function AdminKpiGrid({ data, loading }: AdminKpiGridProps) {
  const { t } = useLanguage();
  const k = t.adminPages.dashboard.kpis;
  const { ref, isInView } = useAdminInView();

  const kpis: Omit<KpiCardProps, "isInView">[] = [
    {
      icon: Users,
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
      iconColor: "text-violet-600 dark:text-violet-400",
      label: k.totalUsers,
      desc: k.totalUsersDesc,
      value: data?.totalUsers ?? 0,
      loading,
    },
    {
      icon: UserCheck,
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      iconColor: "text-blue-600 dark:text-blue-400",
      label: k.hrManagers,
      desc: k.hrManagersDesc,
      value: data?.hrManagers ?? 0,
      loading,
    },
    {
      icon: UserSearch,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      label: k.jobSeekers,
      desc: k.jobSeekersDesc,
      value: data?.jobSeekers ?? 0,
      loading,
    },
    {
      icon: Building2,
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      iconColor: "text-amber-600 dark:text-amber-400",
      label: k.companies,
      desc: k.companiesDesc,
      value: data?.totalCompanies ?? 0,
      loading,
    },
    {
      icon: Zap,
      iconBg: "bg-gray-50 dark:bg-gray-800",
      iconColor: "text-gray-400 dark:text-gray-600",
      label: k.questionsGenerated,
      desc: k.questionsDesc,
      value: 0,
      loading: false,
      pending: true,
    },
    {
      icon: MonitorPlay,
      iconBg: "bg-gray-50 dark:bg-gray-800",
      iconColor: "text-gray-400 dark:text-gray-600",
      label: k.practiceSessions,
      desc: k.practiceDesc,
      value: 0,
      loading: false,
      pending: true,
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} isInView={isInView} />
      ))}
    </div>
  );
}
