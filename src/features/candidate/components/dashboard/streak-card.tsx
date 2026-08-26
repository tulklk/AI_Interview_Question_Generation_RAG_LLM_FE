"use client";

import { Flame, Trophy, CalendarDays, Clock, Target } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { PracticeHeatmapResult } from "@/features/candidate/utils/dashboard-analytics";

const WEEK_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMotivation(streak: number): { text: string; color: string } {
  if (streak === 0) return { text: "Cố gắng lên nào! 🔥", color: "text-red-500 dark:text-red-400" };
  if (streak < 3)   return { text: "Khởi động tốt! ⚡", color: "text-amber-500 dark:text-amber-400" };
  if (streak < 7)   return { text: "Đang bứt phá! 🚀", color: "text-orange-500 dark:text-orange-400" };
  if (streak < 14)  return { text: "Xuất sắc! Giữ vững! 🔥", color: "text-orange-500 dark:text-orange-400" };
  return { text: "Huyền thoại rồi! 🏆", color: "text-violet-600 dark:text-violet-400" };
}

function getNextMilestone(streak: number): { days: number; label: string } | null {
  const milestones = [3, 7, 14, 30, 60, 100];
  const next = milestones.find((m) => m > streak);
  if (!next) return null;
  return { days: next - streak, label: `${next} ngày` };
}

interface StreakCardProps {
  heatmap: PracticeHeatmapResult;
  loading?: boolean;
}

export function StreakCard({ heatmap, loading }: StreakCardProps) {
  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="hr-glass-card p-5 sm:p-6 flex flex-col gap-4">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-7 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>
        <div className="flex justify-between">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="h-3 w-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
    );
  }

  const { currentStreak, longestStreak, days } = heatmap;
  const motivation = getMotivation(currentStreak);
  const nextMilestone = getNextMilestone(currentStreak);

  // Build activity map từ heatmap days
  const activityMap = new Map<string, boolean>();
  let totalMinutes = 0;
  for (const d of days) {
    if (d.count > 0) activityMap.set(d.date, true);
    totalMinutes += d.minutes;
  }

  // Tính tuần hiện tại: T2 (Mon) → CN (Sun)
  const today = new Date();
  const todayStr = toLocalDateStr(today);
  const todayDOW = today.getDay(); // 0=Sun … 6=Sat
  const monday = new Date(today);
  monday.setDate(today.getDate() - (todayDOW === 0 ? 6 : todayDOW - 1));

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = toLocalDateStr(d);
    return {
      label: WEEK_LABELS[i],
      dateStr,
      isToday: dateStr === todayStr,
      isActive: activityMap.get(dateStr) ?? false,
    };
  });

  // Thống kê bổ sung
  const weekActiveDays = weekDays.filter((d) => d.isActive).length;
  const weekPct = Math.round((weekActiveDays / 7) * 100);

  const currentMonthPrefix = todayStr.slice(0, 7); // "YYYY-MM"
  const monthActiveDays = days.filter(
    (d) => d.date.startsWith(currentMonthPrefix) && d.count > 0
  ).length;

  const totalHours = Math.round(totalMinutes / 60);

  return (
    <div className="hr-glass-card p-5 sm:p-6 flex flex-col gap-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className={cn("text-[15px] font-bold", portalHeadingAlt)}>Streak của bạn</h3>
        {nextMilestone && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-500 dark:text-orange-400">
            <Target size={9} className="text-orange-500 dark:text-orange-400" />
            Còn {nextMilestone.days} ngày → {nextMilestone.label}
          </span>
        )}
      </div>

      {/* ── Streak count + motivation ───────────────────────────────────────── */}
      <div className="flex items-center gap-3.5">
        {/* Flame circle */}
        <div className="w-14 h-14 rounded-full bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shrink-0">
          <Flame size={26} className="text-white" />
        </div>

        <div className="min-w-0">
          <p className={cn("leading-none tabular-nums", portalHeadingAlt)}>
            <span className="text-[32px] font-extrabold">{currentStreak}</span>
            <span className="text-[13px] font-semibold text-gray-400 dark:text-gray-500 ml-1.5">
              ngày liên tiếp
            </span>
          </p>
          <p className={cn("text-[12px] font-semibold mt-1.5", motivation.color)}>
            {motivation.text}
          </p>
        </div>
      </div>

      {/* ── Week circles: T2 → CN ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className={cn("text-[10px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
            Tuần này
          </span>
          <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400">
            {weekActiveDays}/7 ngày
          </span>
        </div>

        <div className="flex items-end justify-between mb-2">
          {weekDays.map((day) => (
            <div key={day.dateStr} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "text-[10px] font-bold leading-none",
                  day.isToday
                    ? "text-[#7C3AED] dark:text-[#a78bff]"
                    : "text-gray-400 dark:text-gray-500"
                )}
              >
                {day.label}
              </span>

              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                  day.isActive
                    ? "bg-linear-to-br from-amber-400 to-orange-500 shadow-sm"
                    : day.isToday
                      ? "border-2 border-[#7C3AED]/70 dark:border-[#a78bff]/50 bg-violet-50 dark:bg-violet-950/20"
                      : "border-2 border-gray-200 dark:border-gray-700/70"
                )}
              >
                {day.isActive && <Flame size={13} className="text-white" />}
              </div>
            </div>
          ))}
        </div>

        {/* Weekly progress bar */}
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-linear-to-r from-amber-400 to-orange-500 transition-all duration-700"
            style={{ width: `${weekPct}%` }}
          />
        </div>
      </div>

      {/* ── Mini stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={13} className="text-orange-500 dark:text-orange-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-none mb-0.5">Tháng này</p>
            <p className={cn("text-[13px] font-bold leading-none", portalHeadingAlt)}>
              {monthActiveDays} <span className="text-[10px] font-medium text-gray-400">ngày</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={13} className="text-orange-500 dark:text-orange-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-none mb-0.5">Tổng luyện tập</p>
            <p className={cn("text-[13px] font-bold leading-none", portalHeadingAlt)}>
              {totalHours} <span className="text-[10px] font-medium text-gray-400">giờ</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Record footer ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800/80">
        <Trophy size={13} className="text-amber-500 shrink-0" />
        <span className={cn("text-[12px] font-semibold", portalSubtextAlt)}>
          Kỷ lục:{" "}
          <span className={cn("font-extrabold", portalHeadingAlt)}>
            {longestStreak}
          </span>{" "}
          ngày
        </span>
      </div>
    </div>
  );
}
