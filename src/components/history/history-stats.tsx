"use client";

import { FileText, Zap, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { historyStats } from "@/data/history";
import { useLanguage } from "@/context/language-context";
import { portalCard, portalHeading, portalSubtext } from "@/lib/portal-ui";

const icons = [FileText, Zap, BarChart3];
const iconBgs = [
  "bg-blue-50 dark:bg-blue-950/40",
  "bg-violet-50 dark:bg-violet-950/40",
  "bg-emerald-50 dark:bg-emerald-950/40",
];
const iconColors = ["text-blue-500", "text-violet-500", "text-emerald-500"];

export function HistoryStats() {
  const { t } = useLanguage();
  const labels = t.historyPage.statLabels;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {historyStats.map((stat, i) => {
        const Icon = icons[i];
        return (
          <div
            key={stat.id}
            className={cn(portalCard, "shadow-sm p-5 flex items-center gap-4 animate-fade-up")}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBgs[i]}`}
            >
              <Icon size={20} className={iconColors[i]} />
            </div>
            <div>
              <p className={cn("text-2xl font-bold leading-none", portalHeading)}>
                {stat.value}
              </p>
              <p className={cn("text-sm mt-1", portalSubtext)}>{labels[i] ?? stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
