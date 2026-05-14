"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp, Sparkles, ChevronRight,
  BarChart2, Clock, RefreshCw,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  candidateStats, practiceSessions, questionSets, skillRadarData,
} from "@/data/jobseeker";
import { QuestionSetCard } from "@/components/jobseeker/marketplace/question-set-card";
import { useLanguage } from "@/context/language-context";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

const strongSkills = ["React", "TypeScript", "Communication"];
const weakSkills  = ["Situational Questions", "System Design", "SQL"];

export function CandidateDashboard() {
  const { t } = useLanguage();
  const p = t.jobseekerDashboardPage;

  return (
    <div>
      {/* ── Welcome ───────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0)} className="mb-6">
        <h1 className="text-[30px] font-[800] text-[#111827] leading-[36px]">{p.welcome}</h1>
        <p className="text-[16px] text-[#6B7280] leading-[24px] mt-1">{p.welcomeSub}</p>
      </motion.div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <motion.div {...fadeUp(0.06)} className="grid grid-cols-4 gap-4 mb-6">
        {candidateStats.map((stat, i) => (
          <div
            key={stat.id}
            className="bg-white rounded-xl p-5"
            style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
          >
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", stat.iconBg)}>
              <stat.icon size={16} className={stat.iconColor} />
            </div>
            <p className="text-[24px] font-[700] text-[#111827] leading-none">{stat.value}</p>
            <p className="text-[13px] text-[#6B7280] mt-1">{p.statLabels[i] ?? stat.label}</p>
            {stat.trend && (
              <p className="text-[11px] text-emerald-600 font-[500] mt-1 flex items-center gap-1">
                <TrendingUp size={10} />
                {stat.trend}
              </p>
            )}
          </div>
        ))}
      </motion.div>

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_320px] gap-6 mb-6">
        {/* Analytics + Recent */}
        <div className="flex flex-col gap-6">
          {/* Performance Radar */}
          <motion.div
            {...fadeUp(0.12)}
            className="bg-white rounded-xl p-6"
            style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
          >
            <h2 className="text-[16px] font-[700] text-[#111827] mb-4">{p.analyticsTitle}</h2>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={skillRadarData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fontSize: 11, fontFamily: "Be Vietnam Pro", fill: "#6B7280" }}
                />
                <Radar
                  dataKey="score" stroke="#6C47FF" fill="#6C47FF" fillOpacity={0.12} strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Recent Sessions */}
          <motion.div
            {...fadeUp(0.18)}
            className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-[15px] font-[700] text-[#111827]">{p.recentTitle}</h2>
                <p className="text-[12px] text-[#6B7280]">{p.recentSubtitle}</p>
              </div>
              <Link href="/jobseeker/history" className="text-[12px] font-[600] text-primary hover:text-primary-hover transition-colors">
                {p.viewAllHistory}
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {practiceSessions.slice(0, 3).map((session) => (
                <li key={session.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors">
                  <div className={cn("w-8 h-8 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", session.companyColor)}>
                    {session.companyInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[600] text-[#111827] truncate">{session.setTitle}</p>
                    <p className="text-[11px] text-[#6B7280] flex items-center gap-1">
                      <Clock size={10} />
                      {session.date} · {session.duration}
                    </p>
                  </div>
                  <span className={cn(
                    "text-[12px] font-[700] px-2.5 py-1 rounded-[6px]",
                    session.score >= 80 ? "bg-emerald-50 text-emerald-700" :
                    session.score >= 65 ? "bg-violet-50 text-violet-700" :
                    "bg-amber-50 text-amber-700"
                  )}>
                    {session.score}%
                  </span>
                  <Link href={`/jobseeker/practice/${session.setId}`}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-[#F5F3FF] transition-colors"
                  >
                    <RefreshCw size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Right column: skills + AI recommendation */}
        <div className="flex flex-col gap-4">
          {/* Strong skills */}
          <motion.div
            {...fadeUp(0.14)}
            className="bg-white rounded-xl p-5"
            style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
          >
            <h3 className="text-[14px] font-[700] text-[#111827] mb-3">{p.strongSkillsTitle}</h3>
            <div className="flex flex-col gap-2">
              {strongSkills.map((skill, i) => (
                <div key={skill} className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${90 - i * 6}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    />
                  </div>
                  <span className="text-[12px] font-[500] text-[#111827] w-24 shrink-0">{skill}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Weak skills */}
          <motion.div
            {...fadeUp(0.18)}
            className="bg-white rounded-xl p-5"
            style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
          >
            <h3 className="text-[14px] font-[700] text-[#111827] mb-3">{p.weakSkillsTitle}</h3>
            <div className="flex flex-col gap-2">
              {weakSkills.map((skill, i) => (
                <div key={skill} className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-amber-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${55 - i * 8}%` }}
                      transition={{ duration: 0.8, delay: 0.35 + i * 0.1 }}
                    />
                  </div>
                  <span className="text-[12px] font-[500] text-[#111827] w-24 shrink-0 truncate">{skill}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Recommendation */}
          <motion.div
            {...fadeUp(0.22)}
            className="bg-[#F5F3FF] rounded-xl p-5"
            style={{ boxShadow: "rgba(0,0,0,0.06) 0px 4px 6px -1px" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-primary" />
              <h3 className="text-[13px] font-[700] text-[#111827]">{p.aiRecommendationTitle}</h3>
            </div>
            <p className="text-[12px] text-[#6B7280] leading-[18px] mb-4">{p.aiRecommendation}</p>
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

      {/* ── Recommended Sets ─────────────────────────────────────── */}
      <motion.div {...fadeUp(0.28)}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[20px] font-[700] text-[#111827]">{p.recommendedTitle}</h2>
            <p className="text-[14px] text-[#6B7280] mt-0.5">{p.recommendedSubtitle}</p>
          </div>
          <Link href="/jobseeker" className="flex items-center gap-1 text-[13px] font-[600] text-primary hover:text-primary-hover transition-colors">
            {p.viewAllSets}
            <BarChart2 size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-5">
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
