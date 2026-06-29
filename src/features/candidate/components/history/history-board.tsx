"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, RefreshCw, Eye, BarChart2, Clock, Trophy, BookOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { practiceSessions } from "@/features/candidate/data/jobseeker";
import { useLanguage } from "@/shared/providers/language-context";
import { StatCard } from "@/features/candidate/components/ui/stat-card";
import { Pill, getScoreBadgeClass } from "@/features/candidate/components/ui/pill";
import {
  portalHeadingAlt,
  portalInput,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

export function HistoryBoard() {
  const { t } = useLanguage();
  const p = t.jobseekerHistoryPage;

  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("All Time");

  const filtered = practiceSessions.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.setTitle.toLowerCase().includes(q) || s.company.toLowerCase().includes(q);
  });

  const avgScore = Math.round(practiceSessions.reduce((a, s) => a + s.score, 0) / practiceSessions.length);
  const bestScore = Math.max(...practiceSessions.map((s) => s.score));
  const totalTime = practiceSessions.reduce((a, s) => a + parseInt(s.duration), 0);

  const statCards = [
    { icon: BookOpen, label: p.statLabels[0], value: practiceSessions.length.toString(), bg: "bg-blue-50 dark:bg-blue-950/40", color: "text-blue-500 dark:text-blue-400" },
    { icon: BarChart2, label: p.statLabels[1], value: `${avgScore}%`, bg: "bg-violet-50 dark:bg-violet-950/40", color: "text-violet-500 dark:text-violet-400" },
    { icon: Trophy, label: p.statLabels[2], value: `${bestScore}%`, bg: "bg-amber-50 dark:bg-amber-950/40", color: "text-amber-500 dark:text-amber-400" },
    { icon: Clock, label: p.statLabels[3], value: `${totalTime} min`, bg: "bg-emerald-50 dark:bg-emerald-950/40", color: "text-emerald-500 dark:text-emerald-400" },
  ];

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <StatCard icon={s.icon} iconBg={s.bg} iconColor={s.color} value={s.value} label={s.label} />
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className={cn(
          "flex items-center gap-2 flex-1 rounded-lg px-3 h-[38px] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(108,71,255,0.1)] transition-all",
          portalInput
        )}>
          <Search size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={p.filters.searchPlaceholder}
            className="flex-1 text-[12px] bg-transparent outline-none"
          />
        </div>
        <div className="relative shrink-0">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className={cn(
              "appearance-none w-full sm:w-auto rounded-lg pl-3 pr-8 h-[38px] text-[12px] outline-none cursor-pointer focus:border-primary transition-all",
              portalInput
            )}
          >
            {[p.filters.allTime, p.filters.thisWeek, p.filters.thisMonth].map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        </div>
      </motion.div>

      {/* Table — desktop (md+) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden hidden md:block"
      >
        {/* Header */}
        <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_2fr_auto] gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
          {[p.table.session, p.table.date, p.table.score, p.table.duration, p.table.skills, p.table.actions].map((col) => (
            <span key={col} className={cn("text-[11px] font-[700] uppercase tracking-wide", portalSubtextAlt)}>{col}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className={cn("text-center py-12 text-[14px]", portalSubtextAlt)}>{p.noHistory}</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {filtered.map((session, i) => (
              <motion.li
                key={session.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="hr-table-row grid grid-cols-[2.5fr_1fr_1fr_1fr_2fr_auto] gap-4 px-6 py-4 items-center"
              >
                {/* Session */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-8 h-8 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", session.companyColor)}>
                    {session.companyInitials}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-[13px] font-[600] truncate", portalHeadingAlt)}>{session.setTitle}</p>
                    <p className={cn("text-[11px]", portalSubtextAlt)}>{session.company}</p>
                  </div>
                </div>

                {/* Date */}
                <p className={cn("text-[12px]", portalSubtextAlt)}>{session.date}</p>

                {/* Score */}
                <Pill className={cn("text-[13px] font-[700] px-2.5 py-1 w-fit", getScoreBadgeClass(session.score))}>
                  {session.score}%
                </Pill>

                {/* Duration */}
                <p className={cn("text-[12px]", portalSubtextAlt)}>{session.duration}</p>

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5">
                  {session.skills.slice(0, 3).map((skill) => (
                    <span key={skill} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Link
                    href={`/jobseeker/practice/${session.setId}/result`}
                    className={cn(
                      "flex items-center gap-1.5 h-[30px] px-3 text-[11px] font-[600] hover:text-primary hover:bg-[#F5F3FF] dark:hover:bg-purple-950/30 rounded-lg transition-colors",
                      portalSubtextAlt
                    )}
                    title={p.viewBtn}
                  >
                    <Eye size={13} />
                    {p.viewBtn}
                  </Link>
                  <Link
                    href={`/jobseeker/practice/${session.setId}`}
                    className="shimmer-button flex items-center gap-1.5 h-7.5 px-3 text-[11px] font-semibold text-white hr-cta-btn rounded-lg"
                    title={p.retryBtn}
                  >
                    <RefreshCw size={12} />
                    {p.retryBtn}
                  </Link>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* Card list — mobile (below md) */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.length === 0 ? (
          <p className={cn("text-center py-12 text-[14px]", portalSubtextAlt)}>{p.noHistory}</p>
        ) : (
          filtered.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex flex-col gap-3"
            >
              {/* Header row: company icon + title + score */}
              <div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", session.companyColor)}>
                  {session.companyInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[13px] font-[600] truncate", portalHeadingAlt)}>{session.setTitle}</p>
                  <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{session.company}</p>
                </div>
                <Pill className={cn("text-[13px] font-[700] px-2.5 py-1 shrink-0", getScoreBadgeClass(session.score))}>
                  {session.score}%
                </Pill>
              </div>

              {/* Meta: date · duration */}
              <div className={cn("flex items-center gap-3 text-[12px]", portalSubtextAlt)}>
                <span className="flex items-center gap-1">
                  <Clock size={11} className="shrink-0" />
                  {session.date}
                </span>
                <span>·</span>
                <span>{session.duration}</span>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5">
                {session.skills.slice(0, 4).map((skill) => (
                  <span key={skill} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                    {skill}
                  </span>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/jobseeker/practice/${session.setId}/result`}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 h-[34px] text-[12px] font-[600] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors hover:text-primary hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-200 dark:hover:border-violet-800",
                    portalSubtextAlt
                  )}
                >
                  <Eye size={13} />
                  {p.viewBtn}
                </Link>
                <Link
                  href={`/jobseeker/practice/${session.setId}`}
                  className="flex-1 shimmer-button flex items-center justify-center gap-1.5 h-[34px] text-[12px] font-semibold text-white hr-cta-btn rounded-lg"
                >
                  <RefreshCw size={12} />
                  {p.retryBtn}
                </Link>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
