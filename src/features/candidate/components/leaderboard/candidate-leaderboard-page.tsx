"use client";

import { useState } from "react";
import { Trophy, Zap } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalCard } from "@/shared/utils/portal-ui";
import {
  LEADERBOARD_USERS,
  rankUsers,
  type LeaderboardTab,
} from "@/features/candidate/data/leaderboard-dummy";
import { useUser } from "@/features/auth/context/user-context";
import { LeaderboardPodium }    from "./leaderboard-podium";
import { LeaderboardList }      from "./leaderboard-list";
import { CurrentRankCard, AchievementCard } from "./leaderboard-sidebar";
import { LeagueProgressCard }   from "./league-progress-card";
import { WeeklyChallengesCard } from "./weekly-challenges-card";
import { LeaderboardInfoFaq }   from "./leaderboard-info-faq";

// ── Animation variants ──────────────────────────────────────────────────────
const staggerContainer: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.12 } },
};

const childFadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ── Tabs ────────────────────────────────────────────────────────────────────
const TABS: { id: LeaderboardTab; label: string }[] = [
  { id: "totalXp",  label: "Tổng XP" },
  { id: "streak",   label: "Chuỗi ngày" },
  { id: "weeklyXp", label: "Tuần này" },
];

// ── Motivation banner ───────────────────────────────────────────────────────
function MotivationBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-linear-to-r from-primary/90 to-violet-500/80 dark:from-primary/80 dark:to-violet-600/70 px-5 py-4 flex items-center gap-4">
      <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <Trophy size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight">
          Chinh phục phỏng vấn, vươn lên dẫn đầu!
        </p>
        <p className="text-xs text-white/75 mt-0.5">
          Luyện tập đều đặn mỗi ngày — Tích lũy XP — Thăng hạng liên đoàn
        </p>
      </div>
      <div className="shrink-0 hidden sm:flex items-center gap-1 bg-white/20 rounded-lg px-2.5 py-1.5">
        <Zap size={13} className="text-amber-300" />
        <span className="text-xs font-bold text-white">+100 XP / phiên</span>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export function CandidateLeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("totalXp");
  const { user } = useUser();

  const ranked = rankUsers(LEADERBOARD_USERS, activeTab);
  const top3   = ranked.slice(0, 3);
  const rest   = ranked.slice(3);
  const displayName = user?.fullName?.trim() || undefined;

  return (
    <motion.div
      className="space-y-5"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <motion.header
        variants={childFadeUp}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2"
      >
        <div className="flex items-start gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 mt-0.5"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          >
            <Trophy size={20} className="text-primary dark:text-[#a78bff]" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold text-[#111827] dark:text-gray-100">
              Bảng xếp hạng
            </h1>
            <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-0.5">
              Cùng luyện tập, cải thiện kỹ năng phỏng vấn và chinh phục thứ hạng cao hơn.
            </p>
          </div>
        </div>
        <p className="text-xs text-[#9CA3AF] dark:text-gray-500 shrink-0">
          Mùa hiện tại · Tuần 34
        </p>
      </motion.header>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid xl:grid-cols-[1fr_272px] gap-5 items-start">

        {/* Left column */}
        <motion.div variants={childFadeUp} className="space-y-4">
          <div className={cn(portalCard, "overflow-hidden shadow-sm")}>

            {/* Tabs – underline style */}
            <div className="border-b border-gray-100 dark:border-gray-800">
              <nav className="flex" role="tablist" aria-label="Chế độ xếp hạng">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex-1 py-3.5 text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? "text-primary dark:text-[#a78bff]"
                        : "text-[#6B7280] dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.span
                        layoutId="leaderboard-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-[#7C3AED] rounded-t"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab content — animates on tab switch */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="p-4 space-y-4"
              >
                <MotivationBanner />
                <LeaderboardPodium top3={top3} tab={activeTab} />
                <LeaderboardList
                  rest={rest}
                  all={ranked}
                  tab={activeTab}
                  currentUserName={displayName}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right sidebar */}
        <motion.aside
          variants={childFadeUp}
          className="flex flex-col gap-4"
          style={{ transition: "none" }} // prevent conflicts
        >
          <CurrentRankCard ranked={ranked} tab={activeTab} displayName={displayName} />
          <AchievementCard />
        </motion.aside>
      </div>

      {/* Full-width sections */}
      <motion.div variants={childFadeUp}>
        <LeagueProgressCard />
      </motion.div>
      <motion.div variants={childFadeUp}>
        <WeeklyChallengesCard />
      </motion.div>
      <motion.div variants={childFadeUp}>
        <LeaderboardInfoFaq />
      </motion.div>
    </motion.div>
  );
}
