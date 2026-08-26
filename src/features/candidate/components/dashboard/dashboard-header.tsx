"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, Map, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { useUser } from "@/features/auth/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/shared/utils/greeting";
import type { TimeRangeKey } from "@/features/candidate/utils/dashboard-analytics";

const RANGE_OPTIONS: TimeRangeKey[] = ["7d", "30d", "90d", "all"];

interface DashboardHeaderProps {
  timeRange: TimeRangeKey;
  onTimeRangeChange: (range: TimeRangeKey) => void;
  activeDate: string | null;       // YYYY-MM-DD
  onDateChange: (date: string | null) => void;
}

/** Format YYYY-MM-DD → "25 Th8" (VI) / "Aug 25" (EN) */
function formatDatePill(dateStr: string, lang: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export function DashboardHeader({ timeRange, onTimeRangeChange, activeDate, onDateChange }: DashboardHeaderProps) {
  const { t, lang } = useLanguage();
  const { user, loading: userLoading } = useUser();
  const p = t.jobseekerDashboardPage;
  const h = p.header;
  const dateInputRef = useRef<HTMLInputElement>(null);

  const greeting = getTimeOfDayGreeting({
    morning: p.greetingMorning,
    afternoon: p.greetingAfternoon,
    evening: p.greetingEvening,
    night: p.greetingNight,
  });
  const displayName = user?.fullName || (userLoading ? "..." : "User");
  const welcomeText = buildWelcomeMessage(p.welcomeTemplate, greeting, displayName);

  /** Max date = today */
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6"
    >
      <div className="min-w-0">
        <h1 className={cn("text-[26px] font-[800] leading-[32px]", portalHeadingAlt)}>{welcomeText}</h1>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* ── Range pills + date picker ─────────────────────────────── */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-gray-100 dark:bg-gray-800/70">
          {RANGE_OPTIONS.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => { onTimeRangeChange(range); onDateChange(null); }}
              className={cn(
                "px-2.5 h-7 rounded-md text-[11px] font-[600] transition-colors",
                !activeDate && timeRange === range
                  ? "bg-white dark:bg-gray-900 text-primary shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {h.rangeLabels[range]}
            </button>
          ))}

          {/* Date pill — shown when a date is active */}
          {activeDate && (
            <div className="flex items-center gap-1 px-2.5 h-7 rounded-md bg-white dark:bg-gray-900 text-primary shadow-sm text-[11px] font-[600]">
              <span>{formatDatePill(activeDate, lang)}</span>
              <button
                type="button"
                onClick={() => onDateChange(null)}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Xóa ngày đã chọn"
              >
                <X size={10} />
              </button>
            </div>
          )}

          {/* Calendar icon button — triggers date input */}
          <div className="relative">
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker?.()}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md transition-colors",
                activeDate
                  ? "text-primary"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              )}
              title="Chọn ngày cụ thể"
            >
              <CalendarDays size={13} />
            </button>
            <input
              ref={dateInputRef}
              type="date"
              className="sr-only"
              value={activeDate ?? ""}
              max={todayStr}
              onChange={(e) => {
                const val = e.target.value;
                if (val) onDateChange(val);
              }}
              aria-label="Chọn ngày phân tích"
            />
          </div>
        </div>

        <Link
          href="/candidate/roadmap"
          className={cn(
            "hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12px] font-[600] border border-gray-200 dark:border-gray-700 hover:border-primary/40 transition-colors",
            portalHeadingAlt
          )}
        >
          <Map size={13} />
          {h.viewRoadmap}
        </Link>

        <Link
          href="/candidate/practice"
          className="shimmer-button flex items-center h-9 px-4 text-[12px] font-semibold text-white hr-cta-btn rounded-lg"
        >
          {h.startPractice}
        </Link>
      </div>
    </motion.div>
  );
}
