"use client";

import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { WeekDay } from "@/features/candidate/data/roadmap-dummy";

const STATUS_STYLE: Record<
  WeekDay["status"],
  { dot: string; label: string; labelColor: string; cardBg: string; topicColor: string }
> = {
  completed: {
    dot: "bg-emerald-500",
    label: "Xong",
    labelColor: "text-emerald-600 dark:text-emerald-400",
    cardBg: "bg-gray-50 dark:bg-gray-800/40",
    topicColor: "text-gray-400 dark:text-gray-500",
  },
  current: {
    dot: "bg-primary ring-2 ring-primary/30",
    label: "Hôm nay",
    labelColor: "text-primary",
    cardBg: "bg-violet-50/60 dark:bg-violet-950/15 border border-primary/20",
    topicColor: "font-[700]",
  },
  upcoming: {
    dot: "bg-gray-200 dark:bg-gray-700",
    label: "Sắp tới",
    labelColor: "text-gray-400 dark:text-gray-500",
    cardBg: "bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800",
    topicColor: "",
  },
};

interface WeeklyPlanCardProps {
  plan: WeekDay[];
}

export function WeeklyPlanCard({ plan }: WeeklyPlanCardProps) {
  const completedCount = plan.filter((d) => d.status === "completed").length;

  return (
    <div className="hr-glass-card p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={cn("text-[15px] font-bold", portalHeadingAlt)}>
            Kế hoạch tuần này
          </h2>
          <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>
            {completedCount}/{plan.length} buổi hoàn thành
          </p>
        </div>
        {/* Mini progress dots */}
        <div className="flex items-center gap-1" aria-hidden="true">
          {plan.map((d) => (
            <span
              key={d.dayLabel}
              className={cn(
                "w-2 h-2 rounded-full",
                d.status === "completed"
                  ? "bg-emerald-500"
                  : d.status === "current"
                    ? "bg-primary"
                    : "bg-gray-200 dark:bg-gray-700",
              )}
            />
          ))}
        </div>
      </div>

      {/* Day cards — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {plan.map((day) => {
          const st = STATUS_STYLE[day.status];
          return (
            <div
              key={day.dayLabel}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl p-3 min-w-[76px] shrink-0",
                st.cardBg,
              )}
            >
              {/* Status dot + day label */}
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn("w-2 h-2 rounded-full", st.dot)}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[11px] font-[700]",
                    day.status === "current" ? "text-primary" : portalSubtextAlt,
                  )}
                >
                  {day.dayLabel}
                </span>
              </div>

              {/* Topic */}
              <p
                className={cn(
                  "text-[11px] text-center leading-tight",
                  st.topicColor,
                  portalHeadingAlt,
                )}
              >
                {day.topic}
              </p>

              {/* Duration */}
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[10px]",
                  portalSubtextAlt,
                )}
              >
                <Clock size={9} />
                {day.durationMinutes}p
              </span>

              {/* Status label */}
              {day.status === "completed" ? (
                <Check size={12} className="text-emerald-500" aria-label="Hoàn thành" />
              ) : (
                <span className={cn("text-[9px] font-semibold", st.labelColor)}>
                  {st.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
