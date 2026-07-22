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

const DOW_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DOW_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_VI = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface PracticeHeatmapProps {
  heatmap: PracticeHeatmapResult;
}

export function PracticeHeatmap({ heatmap }: PracticeHeatmapProps) {
  const { t, lang } = useLanguage();
  const p = t.jobseekerDashboardPage.heatmap;
  const isVi = lang === "vi";

  const DOW = isVi ? DOW_VI : DOW_EN;
  const MONTHS = isVi ? MONTH_VI : MONTH_EN;

  // Split days into week columns (7 days each)
  const weeks: typeof heatmap.days[] = [];
  for (let i = 0; i < heatmap.days.length; i += 7) {
    weeks.push(heatmap.days.slice(i, i + 7));
  }

  // Day-of-week for the very first day in the data
  const startDow = heatmap.days.length > 0
    ? new Date(heatmap.days[0].date).getDay()  // 0=Sun … 6=Sat
    : 0;

  // Rows to show labels for (rows 1, 3, 5 = Mon/T2, Wed/T4, Fri/T6)
  const LABEL_ROWS = [1, 3, 5];

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isVi ? "vi-VN" : "en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  // Month label for a week column: show if the month changes from the previous column
  function monthLabel(wi: number): string | null {
    if (weeks[wi].length === 0) return null;
    const d = new Date(weeks[wi][0].date);
    const month = d.getMonth();
    if (wi === 0) return MONTHS[month];
    const prevD = new Date(weeks[wi - 1][0].date);
    return prevD.getMonth() !== month ? MONTHS[month] : null;
  }

  const CELL = "w-3 h-3";
  const GAP = "gap-[3px]";

  return (
    <div className="flex flex-col">
      {/* Stats row */}
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

      {/* Heatmap */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className={cn("flex min-w-max", GAP)} role="img" aria-label={p.title}>

          {/* Day-of-week labels column */}
          <div className="flex flex-col shrink-0">
            {/* Spacer matching month label height */}
            <div className="h-3.5" />
            {/* 7 rows, one per day */}
            <div className={cn("flex flex-col", GAP)}>
              {Array.from({ length: 7 }).map((_, rowIdx) => {
                const dow = (startDow + rowIdx) % 7;
                const showLabel = LABEL_ROWS.includes(rowIdx);
                return (
                  <div key={rowIdx} className="w-3 h-3 flex items-center">
                    {showLabel ? (
                      <span className={cn("text-[7.5px] leading-none whitespace-nowrap", portalSubtextAlt)}>
                        {DOW[dow]}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Week columns */}
          {weeks.map((week, wi) => {
            const ml = monthLabel(wi);
            return (
              <div key={wi} className={cn("flex flex-col", GAP)}>
                {/* Month label */}
                <div className="h-3.5 flex items-end">
                  {ml && (
                    <span className={cn("text-[8px] font-semibold leading-none whitespace-nowrap", portalSubtextAlt)}>
                      {ml}
                    </span>
                  )}
                </div>
                {/* Day cells */}
                <div className={cn("flex flex-col", GAP)}>
                  {week.map((day) => (
                    <div
                      key={day.date}
                      title={
                        day.count > 0
                          ? fillTemplate(p.tooltipTemplate, { date: formatDate(day.date), minutes: String(day.minutes), count: String(day.count) })
                          : fillTemplate(p.tooltipEmptyTemplate, { date: formatDate(day.date) })
                      }
                      className={cn(CELL, "rounded-[3px] transition-colors duration-150 cursor-default", intensityClass(day.minutes))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
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
