"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Zap, Trophy, TrendingUp, Star, Target, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { animate } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalCard } from "@/shared/utils/portal-ui";
import type { RankedUser, LeaderboardTab } from "@/features/candidate/data/leaderboard-dummy";
import { LEADERBOARD_USERS } from "@/features/candidate/data/leaderboard-dummy";

const ME          = LEADERBOARD_USERS.find((u) => u.isCurrentUser)!;
const NEXT_RANK_XP = 5800;
const XP_GAP      = NEXT_RANK_XP - ME.totalXp;

// ── Count-up number ─────────────────────────────────────────────────────────
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ctrl = animate(0, to, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(v) {
        node.textContent = Math.round(v).toLocaleString("vi-VN") + suffix;
      },
    });
    return () => ctrl.stop();
  }, [to, suffix]);
  return <span ref={ref}>0</span>;
}

// ── Animated progress bar ───────────────────────────────────────────────────
function AnimatedBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
      <motion.div
        className={cn("h-full rounded-full", className ?? "bg-primary dark:bg-[#7C3AED]")}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}

// ── Current rank card ───────────────────────────────────────────────────────
interface CurrentRankCardProps {
  ranked: RankedUser[];
  tab: LeaderboardTab;
  displayName?: string;
}

export function CurrentRankCard({ ranked, tab }: CurrentRankCardProps) {
  const me       = ranked.find((u) => u.isCurrentUser);
  const myRank   = me?.rank ?? 12;
  const weeklyXp = ME.weeklyXp;
  const totalXp  = ME.totalXp;
  const progressPct = Math.min(100, Math.round((totalXp / NEXT_RANK_XP) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
      className={cn(portalCard, "p-5 shadow-sm")}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] dark:text-gray-500 mb-3">
        Thông tin của bạn
      </p>

      {/* Rank */}
      <div className="mb-1">
        <p className="text-xs text-[#6B7280] dark:text-gray-400">Hạng của bạn</p>
        <p className="text-3xl font-black text-primary dark:text-[#a78bff] leading-tight">
          #<CountUp to={myRank} />
        </p>
      </div>

      {/* Weekly XP */}
      <div className="flex items-center gap-1.5 mb-3">
        <Zap size={14} className="text-amber-400" />
        <span className="text-sm font-semibold text-[#111827] dark:text-gray-100">
          <CountUp to={weeklyXp} /> XP
        </span>
        <span className="text-xs text-[#9CA3AF] dark:text-gray-500">tuần này</span>
      </div>

      {/* Progress */}
      {tab === "totalXp" && (
        <div className="mb-4">
          <p className="text-xs text-[#6B7280] dark:text-gray-400 mb-1.5">
            Cần thêm{" "}
            <span className="font-semibold text-primary dark:text-[#a78bff]">
              {XP_GAP.toLocaleString("vi-VN")} XP
            </span>{" "}
            để vượt hạng #{myRank - 1}
          </p>
          <AnimatedBar pct={progressPct} />
        </div>
      )}

      {/* CTA */}
      <Link
        href="/candidate/practice"
        className={cn(
          "flex items-center justify-center w-full py-2 px-4 rounded-xl mb-0",
          "border border-gray-200 dark:border-gray-700",
          "text-sm font-medium text-[#6B7280] dark:text-gray-300",
          "hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-[#a78bff]",
          "transition-colors"
        )}
      >
        Xem chi tiết tiến độ
      </Link>

      {/* Divider + stats */}
      <div className="border-t border-gray-100 dark:border-gray-800 my-4" />
      <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] dark:text-gray-500 mb-3">
        Thành tích của bạn
      </p>
      <div className="flex flex-col gap-2.5">
        {[
          { label: "Tổng XP",          value: `${totalXp.toLocaleString("vi-VN")} XP` },
          { label: "Cấp độ hiện tại",  value: `Level ${ME.level}` },
          { label: "Hạng tuần này",    value: `#${myRank}` },
          { label: "XP tuần này",      value: `${weeklyXp.toLocaleString("vi-VN")} XP` },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-[#6B7280] dark:text-gray-400">{label}</span>
            <span className="text-sm font-semibold text-[#111827] dark:text-gray-100">{value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Achievement card ────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { icon: Trophy,     color: "text-amber-500",                   label: "Top 20%" },
  { icon: Zap,        color: "text-primary dark:text-[#a78bff]", label: "5.420 XP tích lũy" },
  { icon: Flame,      color: "text-orange-400",                  label: "Chuỗi 3 ngày" },
  { icon: Target,     color: "text-emerald-500",                 label: "53 phiên hoàn thành" },
  { icon: TrendingUp, color: "text-cyan-500",                    label: "+2 hạng tuần này" },
];

export function AchievementCard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.28, ease: "easeOut" }}
      className={cn(portalCard, "p-5 shadow-sm")}
    >
      <div className="flex items-center gap-2 mb-3">
        <Star size={14} className="text-amber-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] dark:text-gray-500">
          Thành tích nổi bật
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {ACHIEVEMENTS.map(({ icon: Icon, color, label }, i) => (
          <motion.li
            key={label}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.35 + i * 0.06 }}
            className="flex items-center gap-2.5"
          >
            <Icon size={15} className={cn("shrink-0", color)} />
            <span className="text-sm text-[#6B7280] dark:text-gray-300">{label}</span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
