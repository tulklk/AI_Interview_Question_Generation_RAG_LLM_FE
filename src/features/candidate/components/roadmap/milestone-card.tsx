"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { Milestone } from "@/features/candidate/data/roadmap-dummy";

interface MilestoneCardProps {
  milestones: Milestone[];
}

export function MilestoneCard({ milestones }: MilestoneCardProps) {
  const doneCount = milestones.filter((m) => m.done).length;

  return (
    <div className="hr-glass-card p-5 sm:p-6 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className={cn("text-[15px] font-bold", portalHeadingAlt)}>Cột mốc</h2>
        <span className={cn("text-[12px] font-semibold tabular-nums", portalSubtextAlt)}>
          <span className="text-primary font-[700]">{doneCount}</span>/{milestones.length}
        </span>
      </div>

      {/* Overall progress bar */}
      <div
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={milestones.length}
        aria-label="Tiến độ cột mốc"
        className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-4"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${Math.round((doneCount / milestones.length) * 100)}%` }}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-center gap-2.5">
            <span
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                m.done
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-gray-300 dark:border-gray-600",
              )}
              aria-hidden="true"
            >
              {m.done ? (
                <Check size={10} className="text-white" />
              ) : (
                <Circle size={6} className="text-gray-300 dark:text-gray-600" />
              )}
            </span>
            <span
              className={cn(
                "text-[12px] font-semibold",
                m.done
                  ? "text-gray-400 dark:text-gray-500 line-through"
                  : portalHeadingAlt,
              )}
            >
              {m.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
