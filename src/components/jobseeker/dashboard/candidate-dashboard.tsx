"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles, ChevronRight,
  BarChart2, Clock, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  candidateStats, practiceSessions, questionSets,
} from "@/data/jobseeker";
import { QuestionSetCard } from "@/components/jobseeker/marketplace/question-set-card";
import { SkillRadarChart } from "@/components/jobseeker/dashboard/skill-radar-chart";
import { useLanguage } from "@/context/language-context";
import { useUser } from "@/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/lib/greeting";
import { StatCard } from "@/components/jobseeker/ui/stat-card";
import { Pill, getScoreBadgeClass } from "@/components/jobseeker/ui/pill";
import { portalDivider, portalHeadingAlt, portalSubtextAlt } from "@/lib/portal-ui";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const strongSkills = ["React", "TypeScript", "Communication"];
const weakSkills  = ["Situational Questions", "System Design", "SQL"];

export function CandidateDashboard() {
  const { t } = useLanguage();
  const { user, loading } = useUser();
  const p = t.jobseekerDashboardPage;

  const greeting = getTimeOfDayGreeting({
    morning: p.greetingMorning,
    afternoon: p.greetingAfternoon,
    evening: p.greetingEvening,
    night: p.greetingNight,
  });
  const displayName = user?.fullName || (loading ? "..." : "User");
  const welcomeText = buildWelcomeMessage(p.welcomeTemplate, greeting, displayName);

  return (
    <div>
      <motion.div {...fadeUp(0)} className="mb-6">
        <h1 className={cn("text-[30px] font-[800] leading-[36px]", portalHeadingAlt)}>{welcomeText}</h1>
        <p className={cn("text-[16px] leading-[24px] mt-1", portalSubtextAlt)}>{p.welcomeSub}</p>
      </motion.div>

      <motion.div {...fadeUp(0.06)} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {candidateStats.map((stat, i) => (
          <StatCard
            key={stat.id}
            icon={stat.icon}
            iconBg={stat.iconBg}
            iconColor={stat.iconColor}
            value={stat.value}
            label={p.statLabels[i] ?? stat.label}
            trend={stat.trend}
          />
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-6">
        <div className="flex flex-col gap-6">
          <motion.div
            {...fadeUp(0.12)}
            className="hr-glass-card p-6"
          >
            <h2 className={cn("text-[16px] font-[700] mb-4", portalHeadingAlt)}>{p.analyticsTitle}</h2>
            <SkillRadarChart />
          </motion.div>

          <motion.div
            {...fadeUp(0.18)}
            className="hr-glass-card overflow-hidden"
          >
            <div className={cn("flex items-center justify-between px-5 py-4 border-b", portalDivider)}>
              <div>
                <h2 className={cn("text-[15px] font-[700]", portalHeadingAlt)}>{p.recentTitle}</h2>
                <p className={cn("text-[12px]", portalSubtextAlt)}>{p.recentSubtitle}</p>
              </div>
              <Link href="/jobseeker/history" className="text-[12px] font-[600] text-primary hover:text-primary-hover transition-colors">
                {p.viewAllHistory}
              </Link>
            </div>
            <ul className={cn("divide-y", portalDivider)}>
              {practiceSessions.slice(0, 3).map((session) => (
                <li key={session.id} className="hr-table-row flex items-center gap-4 px-5 py-3.5">
                  <div className={cn("w-8 h-8 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", session.companyColor)}>
                    {session.companyInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[13px] font-[600] truncate", portalHeadingAlt)}>{session.setTitle}</p>
                    <p className={cn("text-[11px] flex items-center gap-1", portalSubtextAlt)}>
                      <Clock size={10} />
                      {session.date} · {session.duration}
                    </p>
                  </div>
                  <Pill className={cn("text-[12px] font-[700] px-2.5 py-1", getScoreBadgeClass(session.score))}>
                    {session.score}%
                  </Pill>
                  <Link href={`/jobseeker/practice/${session.setId}`}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-[#F5F3FF] dark:hover:bg-purple-950/30 transition-colors"
                  >
                    <RefreshCw size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="flex flex-col gap-4">
          <motion.div
            {...fadeUp(0.14)}
            className="hr-glass-card p-5"
          >
            <div>
              <h3 className={cn("text-[14px] font-[700] mb-3", portalHeadingAlt)}>{p.strongSkillsTitle}</h3>
              <div className="flex flex-col gap-2">
                {strongSkills.map((skill, i) => (
                  <div key={skill} className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${90 - i * 6}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                      />
                    </div>
                    <span className={cn("text-[12px] font-[500] w-24 shrink-0", portalHeadingAlt)}>{skill}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={cn("mt-4 pt-4 border-t", portalDivider)}>
              <h3 className={cn("text-[14px] font-[700] mb-3", portalHeadingAlt)}>{p.weakSkillsTitle}</h3>
              <div className="flex flex-col gap-2">
                {weakSkills.map((skill, i) => (
                  <div key={skill} className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-amber-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${55 - i * 8}%` }}
                        transition={{ duration: 0.8, delay: 0.35 + i * 0.1 }}
                      />
                    </div>
                    <span className={cn("text-[12px] font-[500] w-24 shrink-0 truncate", portalHeadingAlt)}>{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            {...fadeUp(0.22)}
            className="hr-quick-generate rounded-xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-primary" />
              <h3 className={cn("text-[13px] font-[700]", portalHeadingAlt)}>{p.aiRecommendationTitle}</h3>
            </div>
            <p className={cn("text-[12px] leading-[18px] mb-4", portalSubtextAlt)}>{p.aiRecommendation}</p>
            <Link
              href="/jobseeker"
              className="flex items-center gap-1.5 text-[12px] font-[600] text-primary hover:text-primary-hover transition-colors"
            >
              {p.startPractice}
              <ChevronRight size={12} />
            </Link>
          </motion.div>
        </div>
      </div>

      <motion.div {...fadeUp(0.28)}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className={cn("text-[20px] font-[700]", portalHeadingAlt)}>{p.recommendedTitle}</h2>
            <p className={cn("text-[14px] mt-0.5", portalSubtextAlt)}>{p.recommendedSubtitle}</p>
          </div>
          <Link href="/jobseeker" className="flex items-center gap-1 text-[13px] font-[600] text-primary hover:text-primary-hover transition-colors">
            {p.viewAllSets}
            <BarChart2 size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {questionSets.slice(0, 3).map((set, i) => (
            <motion.div
              key={set.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 + i * 0.08 }}
            >
              <QuestionSetCard set={set} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
