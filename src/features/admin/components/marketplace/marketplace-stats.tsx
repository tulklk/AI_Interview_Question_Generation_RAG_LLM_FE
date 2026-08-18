"use client";

import { Pin, FileStack, Activity, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalCard, portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { AdminMarketplaceStats } from "@/features/admin/services/admin-marketplace.service";

interface MarketplaceStatsProps {
  stats: AdminMarketplaceStats | null;
  loading: boolean;
  labels: {
    totalPublished: string;
    practicesLast7Days: string;
    pinnedCount: string;
    topHrs: string;
    topSkills: string;
  };
}

export function MarketplaceStats({ stats, loading, labels }: MarketplaceStatsProps) {
  const cards = [
    {
      key: "published",
      label: labels.totalPublished,
      value: stats?.totalPublished ?? 0,
      icon: FileStack,
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "practices",
      label: labels.practicesLast7Days,
      value: stats?.practicesLast7Days ?? 0,
      icon: Activity,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "pinned",
      label: labels.pinnedCount,
      value: stats?.pinnedCount ?? 0,
      icon: Pin,
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className={cn("rounded-xl border p-4", portalCard)}>
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-xs font-medium", portalSubtextAlt)}>{card.label}</p>
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", card.iconBg)}>
                  <Icon size={13} className={card.iconColor} />
                </div>
              </div>
              <p className={cn("mt-2 text-2xl font-bold tabular-nums", portalHeadingAlt)}>
                {loading ? "—" : card.value.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className={cn("rounded-xl border p-4", portalCard)}>
          <div className="mb-3 flex items-center gap-2">
            <Users size={14} className="text-primary" />
            <p className={cn("text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
              {labels.topHrs}
            </p>
          </div>
          {loading || !stats?.topHrs.length ? (
            <p className={cn("text-sm", portalSubtextAlt)}>—</p>
          ) : (
            <ul className="space-y-2">
              {stats.topHrs.map((hr) => (
                <li key={hr.hrUserId} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className={cn("truncate font-semibold", portalHeadingAlt)}>{hr.hrName}</p>
                    <p className={cn("truncate text-xs", portalSubtextAlt)}>{hr.companyName}</p>
                  </div>
                  <span className={cn("shrink-0 tabular-nums text-xs", portalSubtextAlt)}>
                    {hr.attemptCount} · {hr.publishedSetCount} set
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cn("rounded-xl border p-4", portalCard)}>
          <p className={cn("mb-3 text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
            {labels.topSkills}
          </p>
          {loading || !stats?.topSkills.length ? (
            <p className={cn("text-sm", portalSubtextAlt)}>—</p>
          ) : (
            <ul className="space-y-2">
              {stats.topSkills.map((skill) => (
                <li key={skill.skill} className="flex items-center justify-between gap-3 text-sm">
                  <span className={cn("truncate font-medium", portalHeadingAlt)}>{skill.skill}</span>
                  <span className={cn("tabular-nums text-xs", portalSubtextAlt)}>
                    {skill.questionCount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
