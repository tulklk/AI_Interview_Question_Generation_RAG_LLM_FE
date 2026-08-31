"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { Phase, PhaseStatus } from "@/features/candidate/data/roadmap-dummy";

// ── Status configuration ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PhaseStatus,
  {
    dotClass: string;
    dotContent: React.ReactNode;
    badgeBg: string;
    badgeText: string;
    badgeLabel: string;
    lineClass: string;
    cardBorder: string;
    cardBg: string;
  }
> = {
  completed: {
    dotClass:
      "bg-emerald-500 border-emerald-500",
    dotContent: <Check size={10} className="text-white" />,
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    badgeText: "text-emerald-700 dark:text-emerald-400",
    badgeLabel: "Hoàn thành",
    lineClass: "bg-emerald-200 dark:bg-emerald-900/60",
    cardBorder: "border-gray-100 dark:border-gray-800",
    cardBg: "",
  },
  "in-progress": {
    dotClass:
      "bg-primary border-primary ring-4 ring-primary/20",
    dotContent: (
      <span className="w-2 h-2 rounded-full bg-white block" />
    ),
    badgeBg: "bg-primary/10 dark:bg-primary/15",
    badgeText: "text-primary",
    badgeLabel: "Đang học",
    lineClass: "bg-gray-200 dark:bg-gray-700",
    cardBorder: "border-primary/30 dark:border-primary/40",
    cardBg: "bg-violet-50/40 dark:bg-violet-950/10",
  },
  upcoming: {
    dotClass: "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600",
    dotContent: <Circle size={8} className="text-gray-300 dark:text-gray-600" />,
    badgeBg: "bg-gray-100 dark:bg-gray-800",
    badgeText: "text-gray-500 dark:text-gray-400",
    badgeLabel: "Sắp tới",
    lineClass: "bg-gray-200 dark:bg-gray-700",
    cardBorder: "border-gray-100 dark:border-gray-800",
    cardBg: "",
  },
  locked: {
    dotClass: "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
    dotContent: <Lock size={9} className="text-gray-400 dark:text-gray-500" />,
    badgeBg: "bg-gray-100 dark:bg-gray-800",
    badgeText: "text-gray-400 dark:text-gray-500",
    badgeLabel: "Chưa mở",
    lineClass: "bg-gray-200 dark:bg-gray-700",
    cardBorder: "border-gray-100 dark:border-gray-800",
    cardBg: "opacity-70",
  },
};

// ── Phase filter tabs ─────────────────────────────────────────────────────────

const FILTER_OPTIONS: { key: "all" | PhaseStatus; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "completed", label: "Hoàn thành" },
  { key: "in-progress", label: "Đang học" },
  { key: "upcoming", label: "Sắp tới" },
];

// ── Phase card ────────────────────────────────────────────────────────────────

const PREVIEW_TASK_COUNT = 3;

function PhaseCard({ phase, isLast }: { phase: Phase; isLast: boolean }) {
  const cfg = STATUS_CONFIG[phase.status];
  const isLocked = phase.status === "locked";
  const isInProgress = phase.status === "in-progress";

  const [expanded, setExpanded] = useState(
    phase.status === "completed" || phase.status === "in-progress",
  );

  const visibleTasks =
    expanded ? phase.tasks : phase.tasks.slice(0, PREVIEW_TASK_COUNT);
  const hiddenCount = phase.tasks.length - PREVIEW_TASK_COUNT;

  return (
    <div className="flex gap-4">
      {/* ── Connector column ──────────────────────────────────────────────── */}
      <div className="flex flex-col items-center shrink-0">
        {/* Status dot */}
        <div
          className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 z-10",
            cfg.dotClass,
          )}
          aria-hidden="true"
        >
          {cfg.dotContent}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div className={cn("w-0.5 flex-1 mt-1", cfg.lineClass)} />
        )}
      </div>

      {/* ── Phase card ────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 rounded-xl border p-4 mb-4 transition-all",
          cfg.cardBorder,
          cfg.cardBg,
          isInProgress && "shadow-sm shadow-primary/10",
        )}
      >
        {/* Card header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  cfg.badgeBg,
                  cfg.badgeText,
                )}
              >
                {cfg.badgeLabel}
              </span>
              <span className={cn("text-[11px]", portalSubtextAlt)}>
                {phase.weekLabel}
              </span>
            </div>
            <h3
              className={cn(
                "text-[14px] font-[700] leading-tight",
                isLocked
                  ? "text-gray-400 dark:text-gray-500"
                  : portalHeadingAlt,
              )}
            >
              {phase.title}
            </h3>
          </div>

          {/* Progress pill */}
          {!isLocked && (
            <span
              className={cn(
                "shrink-0 text-[11px] font-[700] tabular-nums",
                phase.progress === 100
                  ? "text-emerald-600 dark:text-emerald-400"
                  : portalSubtextAlt,
              )}
            >
              {phase.progress}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        {!isLocked && (
          <div
            role="progressbar"
            aria-valuenow={phase.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${phase.title}: ${phase.progress}%`}
            className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                phase.status === "completed"
                  ? "bg-emerald-500"
                  : "bg-primary",
              )}
              style={{ width: `${phase.progress}%` }}
            />
          </div>
        )}

        {/* Task list */}
        <ul className="flex flex-col gap-1.5 mb-3">
          {visibleTasks.map((task) => (
            <li key={task.id} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                  task.done
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-gray-300 dark:border-gray-600 bg-transparent",
                )}
                aria-hidden="true"
              >
                {task.done && <Check size={9} className="text-white" />}
              </span>
              <span
                className={cn(
                  "text-[12px] leading-[18px]",
                  task.done
                    ? "text-gray-400 dark:text-gray-500 line-through"
                    : isLocked
                      ? "text-gray-400 dark:text-gray-500"
                      : portalSubtextAlt,
                )}
              >
                {task.label}
              </span>
            </li>
          ))}
        </ul>

        {/* Expand / collapse for long task lists */}
        {phase.tasks.length > PREVIEW_TASK_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold mb-3 transition-colors",
              "text-primary hover:text-primary-hover",
            )}
          >
            {expanded ? (
              <>
                <ChevronDown size={12} />
                Thu gọn
              </>
            ) : (
              <>
                <ChevronRight size={12} />
                +{hiddenCount} nội dung khác
              </>
            )}
          </button>
        )}

        {/* CTA */}
        {!isLocked && (
          <Link
            href="/candidate/practice"
            className={cn(
              "inline-flex items-center gap-1.5 text-[12px] font-[700] transition-colors min-h-[36px] px-3 py-1.5 rounded-lg",
              isInProgress
                ? "bg-primary text-white hover:bg-primary-hover"
                : "text-primary hover:text-primary-hover border border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10",
            )}
          >
            {phase.ctaLabel}
            <ChevronRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface RoadmapTimelineProps {
  phases: Phase[];
}

export function RoadmapTimeline({ phases }: RoadmapTimelineProps) {
  const [filter, setFilter] = useState<"all" | PhaseStatus>("all");

  const filtered =
    filter === "all" ? phases : phases.filter((p) => p.status === filter);

  return (
    <div className="hr-glass-card p-5 sm:p-6 mb-6">
      {/* Section header + filter */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h2 className={cn("text-[15px] font-bold", portalHeadingAlt)}>
            Lộ trình học tập
          </h2>
          <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>
            {phases.filter((p) => p.status === "completed").length}/{phases.length} giai đoạn hoàn thành
          </p>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 rounded-lg p-0.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                filter === opt.key
                  ? "bg-white dark:bg-gray-900 text-primary shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div>
        {filtered.length === 0 ? (
          <p className={cn("text-[13px] text-center py-6", portalSubtextAlt)}>
            Không có giai đoạn nào trong bộ lọc này.
          </p>
        ) : (
          filtered.map((phase, i) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              isLast={i === filtered.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
