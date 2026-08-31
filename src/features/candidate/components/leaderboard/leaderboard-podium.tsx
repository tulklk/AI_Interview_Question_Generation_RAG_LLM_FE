"use client";

import { Crown, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { RankedUser, LeaderboardTab } from "@/features/candidate/data/leaderboard-dummy";

// ── Score by tab ────────────────────────────────────────────────────────────
function scoreLabel(user: RankedUser, tab: LeaderboardTab): string {
  if (tab === "streak") return `${user.streak} ngày`;
  const xp = tab === "weeklyXp" ? user.weeklyXp : user.totalXp;
  return xp.toLocaleString("vi-VN");
}

// ── Rank badge config ───────────────────────────────────────────────────────
const RANK_CFG = {
  1: { badge: "bg-amber-400  text-white", ring: "ring-4 ring-amber-200  dark:ring-amber-800/60", score: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50/70 dark:bg-amber-950/25 border-amber-200/70 dark:border-amber-800/40" },
  2: { badge: "bg-slate-400  text-white", ring: "ring-4 ring-slate-200  dark:ring-slate-700/50", score: "text-[#6B7280] dark:text-gray-300",   bg: "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800" },
  3: { badge: "bg-orange-400 text-white", ring: "ring-4 ring-orange-200 dark:ring-orange-800/40", score: "text-[#6B7280] dark:text-gray-300",   bg: "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800" },
} as const;

// ── Animation variants ──────────────────────────────────────────────────────
// Each podium card comes in from below with spring
const cardVariants = {
  hidden:  { opacity: 0, y: 32, scale: 0.95 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 280, damping: 22, delay: i * 0.1 },
  }),
};

const crownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.6 },
  show:   {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 14, delay: 0.25 },
  },
};

// ── Single podium card ──────────────────────────────────────────────────────
function PodiumCard({
  user,
  tab,
  isFirst = false,
  animOrder = 0,
}: {
  user: RankedUser;
  tab: LeaderboardTab;
  isFirst?: boolean;
  animOrder?: number;
}) {
  const rank  = user.rank as 1 | 2 | 3;
  const cfg   = RANK_CFG[rank];
  const score = scoreLabel(user, tab);
  const unit  = tab === "streak" ? "" : " XP";

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Crown — only for #1 */}
      <div className="h-6 flex items-center justify-center">
        {isFirst ? (
          <motion.div variants={crownVariants} initial="hidden" animate="show">
            <Crown size={20} className="text-amber-400 fill-amber-400" />
          </motion.div>
        ) : (
          <span className="h-5" /> // spacer keeps cards aligned
        )}
      </div>

      {/* Card */}
      <motion.div
        custom={animOrder}
        variants={cardVariants}
        initial="hidden"
        animate="show"
        whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
        className={cn(
          "flex flex-col items-center gap-2.5 w-full rounded-2xl px-4 py-5 border cursor-default",
          isFirst ? "shadow-lg" : "shadow-sm",
          cfg.bg
        )}
      >
        {/* Avatar with rank badge */}
        <div className="relative">
          <div
            className={cn(
              "rounded-full flex items-center justify-center font-bold text-primary dark:text-[#a78bff]",
              "bg-primary/10 dark:bg-primary/20",
              isFirst ? "w-20 h-20 text-xl shadow-xl" : "w-16 h-16 text-base shadow-md",
              cfg.ring
            )}
          >
            {user.initials}
          </div>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20, delay: animOrder * 0.1 + 0.3 }}
            className={cn(
              "absolute -bottom-1.5 left-1/2 -translate-x-1/2",
              "w-6 h-6 rounded-full flex items-center justify-center",
              "text-xs font-black border-2 border-white dark:border-gray-900",
              cfg.badge
            )}
          >
            {rank}
          </motion.span>
        </div>

        {/* Info */}
        <div className="text-center mt-1">
          <p className={cn("font-semibold text-[#111827] dark:text-gray-100 leading-tight", isFirst ? "text-base" : "text-sm")}>
            {user.name}
          </p>
          <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
            Level {user.level}
          </p>
        </div>

        {/* Score */}
        <div className="flex items-center gap-1">
          <Zap size={13} className={isFirst ? "text-amber-500" : "text-[#9CA3AF]"} />
          <span className={cn("text-sm font-bold", cfg.score)}>
            {score}{unit}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

// ── Podium ──────────────────────────────────────────────────────────────────
interface LeaderboardPodiumProps {
  top3: RankedUser[];
  tab: LeaderboardTab;
}

export function LeaderboardPodium({ top3, tab }: LeaderboardPodiumProps) {
  const first  = top3.find((u) => u.rank === 1);
  const second = top3.find((u) => u.rank === 2);
  const third  = top3.find((u) => u.rank === 3);
  if (!first) return null;

  return (
    <section aria-label="Top 3 ứng viên">
      {/* Desktop: #2 | #1 | #3 — #1 elevated */}
      <div className="hidden md:grid md:grid-cols-3 gap-3 items-end pb-2">
        {second && <PodiumCard user={second} tab={tab} animOrder={1} />}
        {first  && <PodiumCard user={first}  tab={tab} isFirst animOrder={0} />}
        {third  && <PodiumCard user={third}  tab={tab} animOrder={2} />}
      </div>
      {/* Mobile: #1 then #2 | #3 */}
      <div className="md:hidden flex flex-col gap-3">
        {first  && <PodiumCard user={first}  tab={tab} isFirst animOrder={0} />}
        <div className="grid grid-cols-2 gap-3">
          {second && <PodiumCard user={second} tab={tab} animOrder={1} />}
          {third  && <PodiumCard user={third}  tab={tab} animOrder={2} />}
        </div>
      </div>
    </section>
  );
}
