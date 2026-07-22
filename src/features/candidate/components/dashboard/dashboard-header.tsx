"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Map } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { useUser } from "@/features/auth/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/shared/utils/greeting";
import { fillTemplate, type TimeRangeKey } from "@/features/candidate/utils/dashboard-analytics";
import type { PracticeStats } from "@/features/candidate/services/practice-session.service";

const RANGE_OPTIONS: TimeRangeKey[] = ["7d", "30d", "90d", "all"];

interface DashboardHeaderProps {
  loading: boolean;
  stats: PracticeStats | null;
  streakDays: number;
  timeRange: TimeRangeKey;
  onTimeRangeChange: (range: TimeRangeKey) => void;
}

export function DashboardHeader({ loading, stats, streakDays, timeRange, onTimeRangeChange }: DashboardHeaderProps) {
  const { t } = useLanguage();
  const { user, loading: userLoading } = useUser();
  const p = t.jobseekerDashboardPage;
  const h = p.header;

  const greeting = getTimeOfDayGreeting({
    morning: p.greetingMorning,
    afternoon: p.greetingAfternoon,
    evening: p.greetingEvening,
    night: p.greetingNight,
  });
  const displayName = user?.fullName || (userLoading ? "..." : "User");
  const welcomeText = buildWelcomeMessage(p.welcomeTemplate, greeting, displayName);

  const sessionCount = stats?.totalSessions ?? 0;
  const summary = loading
    ? ""
    : sessionCount === 0
      ? h.summaryEmpty
      : fillTemplate(h.summaryTemplate, {
          count: String(sessionCount),
          avg: String(stats?.averageScore ?? 0),
          streak: String(streakDays),
        });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6"
    >
      <div className="min-w-0">
        <h1 className={cn("text-[26px] font-[800] leading-[32px]", portalHeadingAlt)}>{welcomeText}</h1>
        <p className={cn("text-[14px] leading-[20px] mt-1.5 max-w-xl", portalSubtextAlt)}>{summary}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-gray-100 dark:bg-gray-800/70">
          {RANGE_OPTIONS.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onTimeRangeChange(range)}
              className={cn(
                "px-2.5 h-7 rounded-md text-[11px] font-[600] transition-colors",
                timeRange === range
                  ? "bg-white dark:bg-gray-900 text-primary shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {h.rangeLabels[range]}
            </button>
          ))}
        </div>

        <Link
          href="#role-readiness"
          className={cn(
            "hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12px] font-[600] border border-gray-200 dark:border-gray-700 hover:border-primary/40 transition-colors",
            portalHeadingAlt
          )}
        >
          <Map size={13} />
          {h.viewRoadmap}
        </Link>

        <Link
          href="/jobseeker/practice"
          className="shimmer-button flex items-center gap-1.5 h-9 px-4 text-[12px] font-semibold text-white hr-cta-btn rounded-lg"
        >
          <Sparkles size={13} />
          {h.startPractice}
        </Link>
      </div>
    </motion.div>
  );
}
