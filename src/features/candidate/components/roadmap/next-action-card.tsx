"use client";

import Link from "next/link";
import { ArrowRight, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { NEXT_ACTION } from "@/features/candidate/data/roadmap-dummy";

type NextActionData = typeof NEXT_ACTION;

const DIFFICULTY_STYLE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  Easy:   { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", label: "Dễ" },
  Medium: { bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-600 dark:text-amber-400",    label: "Trung bình" },
  Hard:   { bg: "bg-rose-50 dark:bg-rose-950/30",       text: "text-rose-600 dark:text-rose-400",      label: "Khó" },
};

interface NextActionCardProps {
  action: NextActionData;
}

export function NextActionCard({ action }: NextActionCardProps) {
  const diff = DIFFICULTY_STYLE[action.difficulty] ?? DIFFICULTY_STYLE.Medium;
  const stepPct = action.totalSteps > 0
    ? Math.round((action.completedSteps / action.totalSteps) * 100)
    : 0;

  return (
    <div className="hr-glass-card p-5 sm:p-6 mb-6 border-l-[3px] border-l-primary">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center shrink-0">
            <Zap size={14} className="text-primary" />
          </div>
          <p className={cn("text-[10px] font-bold uppercase tracking-widest", portalSubtextAlt)}>
            Việc nên làm tiếp theo
          </p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          {action.phase}
        </span>
      </div>

      {/* Title + description */}
      <h2 className={cn("text-[17px] font-[800] leading-tight mb-1.5", portalHeadingAlt)}>
        {action.title}
      </h2>
      <p className={cn("text-[13px] leading-[19px] mb-4", portalSubtextAlt)}>
        {action.description}
      </p>

      {/* Meta badges */}
      <div className="flex items-center gap-2.5 flex-wrap mb-4">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          <Clock size={12} />
          {action.estimatedMinutes} phút
        </span>
        <span
          className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-full",
            diff.bg,
            diff.text,
          )}
        >
          {diff.label}
        </span>
        <span className={cn("text-[11px]", portalSubtextAlt)}>
          {action.completedSteps}/{action.totalSteps} bước
        </span>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={stepPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Tiến độ: ${stepPct}%`}
        className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-4"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${stepPct}%` }}
        />
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/candidate/practice"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-[700] hover:bg-primary-hover transition-colors min-h-[40px]"
        >
          Bắt đầu luyện tập
          <ArrowRight size={14} />
        </Link>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700",
            "text-[13px] font-semibold min-h-[40px] transition-colors",
            "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
          )}
        >
          Xem chi tiết
        </button>
      </div>
    </div>
  );
}
