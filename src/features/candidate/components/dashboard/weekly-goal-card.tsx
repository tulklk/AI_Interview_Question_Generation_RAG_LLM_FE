"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Target, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { useWeeklyGoal, type WeeklyGoal } from "@/features/candidate/hooks/use-weekly-goal";
import type { CompletedSessionSummary } from "@/features/candidate/services/practice-session.service";

const SESSION_OPTIONS = [2, 3, 5, 7];

interface WeeklyGoalCardProps {
  sessions: CompletedSessionSummary[];
}

export function WeeklyGoalCard({ sessions }: WeeklyGoalCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerDashboardPage.weeklyGoal;
  const { goal, hasSetGoal, setGoal, sessionsCount, minutesCount, daysLeft } = useWeeklyGoal(sessions);
  const [selected, setSelected] = useState(3);

  if (!hasSetGoal) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
          <Target size={18} className="text-primary" />
        </div>
        <div>
          <p className={cn("text-[13px] font-[700]", portalHeadingAlt)}>{p.onboardingTitle}</p>
          <p className={cn("text-[12px] leading-[17px] mt-1", portalSubtextAlt)}>{p.onboardingSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {SESSION_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSelected(n)}
              className={cn(
                "w-10 h-9 rounded-lg text-[13px] font-[700] border transition-colors",
                selected === n
                  ? "bg-primary text-white border-primary"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary/50"
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setGoal({ sessionsTarget: selected, minutesTarget: selected * 20 } satisfies WeeklyGoal)}
          className="shimmer-button h-9 px-5 text-[12px] font-semibold text-white hr-cta-btn rounded-lg"
        >
          {p.setGoalBtn}
        </button>
      </div>
    );
  }

  const sessionsPct = Math.min((sessionsCount / goal.sessionsTarget) * 100, 100);
  const minutesPct = Math.min((minutesCount / goal.minutesTarget) * 100, 100);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn("text-[12px] font-[600]", portalSubtextAlt)}>{fillTemplate(p.sessionsProgress, { done: String(sessionsCount), target: String(goal.sessionsTarget) })}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${sessionsPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn("text-[12px] font-[600]", portalSubtextAlt)}>{fillTemplate(p.minutesProgress, { done: String(minutesCount), target: String(goal.minutesTarget) })}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${minutesPct}%` }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className={cn("text-[11px]", portalSubtextAlt)}>{fillTemplate(p.daysLeft, { days: String(daysLeft) })}</span>
        <Link
          href="/jobseeker/practice"
          className="flex items-center gap-1 text-[12px] font-[600] text-primary hover:text-primary-hover transition-colors"
        >
          {p.continue}
          <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}
