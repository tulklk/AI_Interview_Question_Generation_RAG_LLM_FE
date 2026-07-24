"use client";

import { motion } from "framer-motion";
import { useAdminInView } from "@/features/admin/hooks/use-admin-in-view";
import { roleDistribution } from "@/features/admin/data/admin";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalCard, portalDivider, portalHeading, portalMutedBg, portalSubtext } from "@/shared/utils/portal-ui";
import { useCountUp } from "@/shared/hooks/use-count-up";

function RoleCount({ count, active }: { count: number; active: boolean }) {
  const display = useCountUp(count, active);
  return <>{display}</>;
}

function RolePct({ pct, active }: { pct: number; active: boolean }) {
  const display = useCountUp(pct, active);
  return <>{display}%</>;
}

export function RoleDistribution() {
  const { t } = useLanguage();
  const rd = t.adminPages.analytics.roleDistribution;

  const { ref, isInView } = useAdminInView();

  const total = roleDistribution.reduce((s, r) => s + r.count, 0);
  const totalDisplay = useCountUp(total, isInView);

  return (
    <div ref={ref} className={cn(portalCard, "shadow-sm p-6 flex flex-col", isInView ? "animate-fade-up" : "opacity-0")}>
      <div className="mb-5">
        <h3 className={cn("text-base font-semibold", portalHeading)}>{rd.title}</h3>
        <p className={cn("text-xs mt-0.5", portalSubtext)}>{rd.subtitle}</p>
      </div>

      <div className="space-y-5">
        {roleDistribution.map((item, i) => {
          const pct = Math.round((item.count / item.total) * 100);
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 14 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 14 }}
              transition={{ duration: 0.32, ease: "easeOut", delay: 0.08 + i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color} inline-block`} />
                  <span className={cn("text-sm font-medium", portalHeading)}>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs tabular-nums", portalSubtext)}>
                    <RoleCount count={item.count} active={isInView} /> {rd.users}
                  </span>
                  <span className={cn("text-sm font-bold tabular-nums", portalHeading)}>
                    <RolePct pct={pct} active={isInView} />
                  </span>
                </div>
              </div>
              <div className={cn("h-2 rounded-full overflow-hidden", portalMutedBg)}>
                <motion.div
                  className={`h-full rounded-full ${item.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: isInView ? `${pct}%` : 0 }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.14 + i * 0.12 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className={cn("mt-6 pt-5 border-t flex items-center justify-between", portalDivider)}>
        <span className={cn("text-sm", portalSubtext)}>{rd.total}</span>
        <span className={cn("text-xl font-bold tabular-nums", portalHeading)}>{totalDisplay}</span>
      </div>
    </div>
  );
}
