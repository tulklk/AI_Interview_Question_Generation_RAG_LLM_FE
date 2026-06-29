"use client";

import { roleDistribution } from "@/features/admin/data/admin";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalCard, portalDivider, portalHeading, portalMutedBg, portalSubtext } from "@/shared/utils/portal-ui";

export function RoleDistribution() {
  const { t } = useLanguage();
  const rd = t.adminPages.analytics.roleDistribution;

  return (
    <div className={cn(portalCard, "shadow-sm p-6 flex flex-col animate-fade-up")}>
      <div className="mb-5">
        <h3 className={cn("text-base font-semibold", portalHeading)}>{rd.title}</h3>
        <p className={cn("text-xs mt-0.5", portalSubtext)}>{rd.subtitle}</p>
      </div>

      <div className="space-y-5">
        {roleDistribution.map((item) => {
          const pct = Math.round((item.count / item.total) * 100);
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color} inline-block`} />
                  <span className={cn("text-sm font-medium", portalHeading)}>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs", portalSubtext)}>{item.count} {rd.users}</span>
                  <span className={cn("text-sm font-bold", portalHeading)}>{pct}%</span>
                </div>
              </div>
              <div className={cn("h-2 rounded-full overflow-hidden", portalMutedBg)}>
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className={cn("mt-6 pt-5 border-t flex items-center justify-between", portalDivider)}>
        <span className={cn("text-sm", portalSubtext)}>{rd.total}</span>
        <span className={cn("text-xl font-bold", portalHeading)}>142</span>
      </div>
    </div>
  );
}
