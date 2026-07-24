"use client";

import { motion } from "framer-motion";
import { useAdminInView } from "@/features/admin/hooks/use-admin-in-view";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { adminCategoryStats } from "@/features/admin/data/admin";
import { useLanguage } from "@/shared/providers/language-context";
import { useChartTheme } from "@/shared/hooks/use-chart-theme";
import { cn } from "@/lib/cn";
import { portalCard, portalHeading, portalMutedBg, portalSubtext } from "@/shared/utils/portal-ui";
import { useCountUp } from "@/shared/hooks/use-count-up";

function CatCount({ count, active }: { count: number; active: boolean }) {
  const display = useCountUp(count, active);
  return <>{display}</>;
}

export default function CategoryChart() {
  const { t } = useLanguage();
  const cc = t.adminPages.analytics.categoryChart;
  const chart = useChartTheme();

  const { ref, isInView } = useAdminInView();

  const max = Math.max(...adminCategoryStats.map((c) => c.count));

  return (
    <div ref={ref} className={cn(portalCard, "shadow-sm p-6 flex flex-col", isInView ? "animate-fade-up" : "opacity-0")}>
      <div className="mb-1">
        <h3 className={cn("text-base font-semibold", portalHeading)}>{cc.title}</h3>
        <p className={cn("text-xs mt-0.5", portalSubtext)}>{cc.subtitle}</p>
      </div>

      <div className="mt-4">
        {isInView ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart
              data={adminCategoryStats}
              margin={{ top: 4, right: 4, bottom: 0, left: -28 }}
              barSize={28}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chart.chartGrid} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: chart.axisTickFill }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: chart.axisTickFill }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 10,
                  backgroundColor: chart.tooltipBg,
                  border: `1px solid ${chart.tooltipBorder}`,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
                cursor={{ fill: chart.isDark ? "rgba(108, 71, 255, 0.12)" : "#f5f3ff" }}
              />
              <Bar
                dataKey="count"
                name={cc.questions}
                fill="#6c47ff"
                radius={[4, 4, 0, 0]}
                isAnimationActive
                animationBegin={0}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 140 }} />
        )}
      </div>

      <div className="mt-5 space-y-3">
        {adminCategoryStats.map((cat, i) => (
          <motion.div
            key={cat.name}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -14 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
            transition={{ duration: 0.32, ease: "easeOut", delay: 0.08 + i * 0.08 }}
          >
            <span className={cn("text-xs w-24 shrink-0", portalSubtext)}>{cat.name}</span>
            <div className={cn("flex-1 h-1.5 rounded-full overflow-hidden", portalMutedBg)}>
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: isInView ? `${(cat.count / max) * 100}%` : 0 }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.12 + i * 0.1 }}
              />
            </div>
            <span className={cn("text-xs font-semibold w-12 text-right shrink-0 tabular-nums", portalHeading)}>
              <CatCount count={cat.count} active={isInView} />
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
