"use client";

import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate, type PracticeHeatmapResult } from "@/features/candidate/utils/dashboard-analytics";

function intensityClass(minutes: number): string {
  if (minutes <= 0) return "bg-gray-100 dark:bg-gray-800/70";
  if (minutes <= 15) return "bg-violet-200 dark:bg-violet-900/50";
  if (minutes <= 30) return "bg-violet-400 dark:bg-violet-700/70";
  if (minutes <= 60) return "bg-violet-600 dark:bg-violet-500";
  return "bg-violet-800 dark:bg-violet-400";
}

interface PracticeHeatmapProps {
  heatmap: PracticeHeatmapResult;
}

export function PracticeHeatmap({ heatmap }: PracticeHeatmapProps) {
  const { t, lang } = useLanguage();
  const p = t.jobseekerDashboardPage.heatmap;

  const weeks: typeof heatmap.days[] = [];
  for (let i = 0; i < heatmap.days.length; i += 7) {
    weeks.push(heatmap.days.slice(i, i + 7));
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
          <p className={cn("text-[18px] font-[800] tabular-nums leading-none", portalHeadingAlt)}>{heatmap.currentStreak}</p>
          <p className={cn("text-[10px] mt-1", portalSubtextAlt)}>{p.currentStreak}</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
          <p className={cn("text-[18px] font-[800] tabular-nums leading-none", portalHeadingAlt)}>{heatmap.longestStreak}</p>
          <p className={cn("text-[10px] mt-1", portalSubtextAlt)}>{p.longestStreak}</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
          <p className={cn("text-[18px] font-[800] tabular-nums leading-none", portalHeadingAlt)}>{heatmap.activeDays}</p>
          <p className={cn("text-[10px] mt-1", portalSubtextAlt)}>{p.activeDays}</p>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
        <div className="flex gap-1 w-max" role="img" aria-label={p.title}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={
                    day.count > 0
                      ? fillTemplate(p.tooltipTemplate, { date: formatDate(day.date), minutes: String(day.minutes), count: String(day.count) })
                      : fillTemplate(p.tooltipEmptyTemplate, { date: formatDate(day.date) })
                  }
                  className={cn("w-3 h-3 rounded-[3px] transition-colors duration-150", intensityClass(day.minutes))}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={cn("flex items-center gap-1.5 mt-3 text-[10px]", portalSubtextAlt)}>
        <span>{p.legendLess}</span>
        <span className="w-2.5 h-2.5 rounded-[2px] bg-gray-100 dark:bg-gray-800/70" />
        <span className="w-2.5 h-2.5 rounded-[2px] bg-violet-200 dark:bg-violet-900/50" />
        <span className="w-2.5 h-2.5 rounded-[2px] bg-violet-400 dark:bg-violet-700/70" />
        <span className="w-2.5 h-2.5 rounded-[2px] bg-violet-600 dark:bg-violet-500" />
        <span className="w-2.5 h-2.5 rounded-[2px] bg-violet-800 dark:bg-violet-400" />
        <span>{p.legendMore}</span>
      </div>
    </div>
  );
}
