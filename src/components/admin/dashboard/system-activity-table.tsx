"use client";

import { UserPlus, LogIn, Zap, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { systemActivity } from "@/data/admin";
import type { SystemActivityEvent } from "@/types/admin";
import { useLanguage } from "@/context/language-context";
import { portalDivider, portalHeading, portalSubtext } from "@/lib/portal-ui";

const eventIcons: Record<SystemActivityEvent["type"], {
  icon: typeof UserPlus; iconBg: string; iconColor: string; badgeBg: string; badgeColor: string;
}> = {
  user_created: {
    icon: UserPlus,
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-blue-500 dark:text-blue-400",
    badgeBg: "bg-blue-50 dark:bg-blue-950/40",
    badgeColor: "text-blue-600 dark:text-blue-400",
  },
  recruiter_login: {
    icon: LogIn,
    iconBg: "bg-gray-100 dark:bg-gray-800",
    iconColor: "text-gray-400 dark:text-gray-500",
    badgeBg: "bg-gray-100 dark:bg-gray-800",
    badgeColor: "text-gray-500 dark:text-gray-400",
  },
  jd_generation: {
    icon: Zap,
    iconBg: "bg-violet-50 dark:bg-violet-950/40",
    iconColor: "text-violet-500 dark:text-violet-400",
    badgeBg: "bg-violet-50 dark:bg-violet-950/40",
    badgeColor: "text-violet-600 dark:text-violet-400",
  },
  export: {
    icon: Download,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    badgeColor: "text-emerald-600 dark:text-emerald-400",
  },
};

export function SystemActivityTable() {
  const { t } = useLanguage();
  const ra = t.adminPages.dashboard.recentActivity;

  return (
    <div className="hr-glass-card p-6 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={cn("text-base font-semibold", portalHeading)}>{ra.title}</h3>
          <p className={cn("text-xs mt-0.5", portalSubtext)}>{ra.subtitle}</p>
        </div>
      </div>

      <div className={cn("overflow-hidden rounded-lg border", portalDivider)}>
        <table className="w-full text-sm">
          <thead className={cn("bg-gray-50 dark:bg-gray-800/50 border-b", portalDivider)}>
            <tr>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ra.event}</th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ra.actor}</th>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ra.details}</th>
              <th className={cn("px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{ra.time}</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", portalDivider)}>
            {systemActivity.map((event, i) => {
              const cfg = eventIcons[event.type];
              const Icon = cfg.icon;
              const label = ra.eventLabels[event.type];
              return (
                <tr
                  key={event.id}
                  className="hr-table-row transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cfg.iconBg)}>
                        <Icon size={13} className={cfg.iconColor} />
                      </div>
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", cfg.badgeBg, cfg.badgeColor)}>
                        {label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className={cn("text-sm font-medium", portalHeading)}>{event.actor}</p>
                    <p className={cn("text-xs mt-0.5", portalSubtext)}>{event.description}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn("text-xs", portalSubtext)}>{event.metadata}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={cn("text-xs", portalSubtext)}>{event.timestamp}</span>
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
