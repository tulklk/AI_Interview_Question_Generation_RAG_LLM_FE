"use client";

import { useEffect, useState } from "react";
import { animate } from "framer-motion";
import { Flame, Target, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { ROADMAP_SUMMARY } from "@/features/candidate/data/roadmap-dummy";

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const ctrl = animate(0, value, {
      duration: 1,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [value]);
  return <>{display}</>;
}

function ReadinessRing({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const [displayCurrent, setDisplayCurrent] = useState(0);

  useEffect(() => {
    const ctrl = animate(0, current, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => setDisplayCurrent(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [current]);

  const pct = current / 100;
  const offset = circ - pct * circ;

  const color =
    current >= 70
      ? "#10B981"
      : current >= 50
        ? "#7C3AED"
        : current >= 30
          ? "#F59E0B"
          : "#F43F5E";

  return (
    <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90" aria-hidden="true">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-gray-100 dark:text-gray-800"
          strokeWidth="8"
        />
        {/* target ring faint */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeOpacity="0.15"
          strokeDasharray={circ}
          strokeDashoffset={circ - (target / 100) * circ}
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[22px] font-[800] leading-none tabular-nums"
          style={{ color }}
        >
          {displayCurrent}
        </span>
        <span className={cn("text-[9px] font-[500] mt-0.5", portalSubtextAlt)}>
          / 100
        </span>
      </div>
    </div>
  );
}

type SummaryData = typeof ROADMAP_SUMMARY;

interface RoadmapOverviewProps {
  summary: SummaryData;
}

export function RoadmapOverview({ summary }: RoadmapOverviewProps) {
  return (
    <div className="hr-glass-card p-5 sm:p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── LEFT: Goal info ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className={cn("text-[10px] font-bold uppercase tracking-widest", portalSubtextAlt)}>
            Mục tiêu
          </p>
          <div>
            <p className={cn("text-[20px] font-[800] leading-tight", portalHeadingAlt)}>
              {summary.targetRole}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {summary.currentLevel}
              </span>
              <TrendingUp size={12} className="text-primary" />
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 dark:bg-primary/15 text-primary">
                {summary.targetLevel}
              </span>
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="flex flex-col gap-0.5">
              <span className={cn("text-[10px]", portalSubtextAlt)}>Phiên</span>
              <span className={cn("text-[15px] font-[800] tabular-nums", portalHeadingAlt)}>
                <AnimatedNumber value={summary.sessions} />
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={cn("text-[10px]", portalSubtextAlt)}>TB điểm</span>
              <span className={cn("text-[15px] font-[800] tabular-nums", portalHeadingAlt)}>
                {summary.averageScore}%
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className={cn("text-[10px]", portalSubtextAlt)}>Streak</span>
              <span className="flex items-center gap-1">
                <Flame size={13} className="text-orange-500" />
                <span className={cn("text-[15px] font-[800] tabular-nums", portalHeadingAlt)}>
                  <AnimatedNumber value={summary.streak} />
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ── CENTER: Readiness ring ──────────────────────────────────────── */}
        <div className="flex flex-col items-center justify-center gap-3 md:border-x md:border-gray-100 md:dark:border-gray-800 md:px-6">
          <p className={cn("text-[10px] font-bold uppercase tracking-widest", portalSubtextAlt)}>
            Mức sẵn sàng
          </p>
          <ReadinessRing current={summary.readiness} target={summary.targetReadiness} />
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className={cn(portalSubtextAlt)}>Hiện tại:</span>
            <span className={cn("font-bold", portalHeadingAlt)}>{summary.readiness}</span>
            <span className={cn(portalSubtextAlt)}>→ Mục tiêu:</span>
            <span className="font-bold text-primary">{summary.targetReadiness}</span>
          </div>
        </div>

        {/* ── RIGHT: Completion stats ─────────────────────────────────────── */}
        <div className="flex flex-col gap-3 justify-center">
          <p className={cn("text-[10px] font-bold uppercase tracking-widest", portalSubtextAlt)}>
            Tiến độ lộ trình
          </p>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
                {summary.totalProgress}% hoàn thành
              </span>
              <span className={cn("text-[11px]", portalSubtextAlt)}>
                ~{summary.estimatedWeeks} tuần
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={summary.totalProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Tiến độ lộ trình"
              className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000"
                style={{ width: `${summary.totalProgress}%` }}
              />
            </div>
            <p className={cn("text-[11px] mt-1.5", portalSubtextAlt)}>
              Còn khoảng{" "}
              <span className={cn("font-semibold", portalHeadingAlt)}>
                {summary.remainingTasks} nhiệm vụ
              </span>{" "}
              để hoàn thành mục tiêu.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Zap size={12} className="text-primary shrink-0" />
            <p className={cn("text-[11px]", portalSubtextAlt)}>
              <span className="font-semibold text-primary">{summary.targetReadiness - summary.readiness} điểm</span>{" "}
              nữa để đạt mục tiêu sẵn sàng
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Target size={12} className="text-emerald-500 shrink-0" />
            <p className={cn("text-[11px]", portalSubtextAlt)}>
              Ước tính đạt mục tiêu trong{" "}
              <span className={cn("font-semibold", portalHeadingAlt)}>
                {summary.estimatedWeeks} tuần
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
