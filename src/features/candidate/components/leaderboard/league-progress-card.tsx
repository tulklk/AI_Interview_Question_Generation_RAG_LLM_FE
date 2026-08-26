"use client";

import { Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalCard } from "@/shared/utils/portal-ui";
import {
  LEAGUE_LEVELS,
  getCurrentLeagueIndex,
  LEADERBOARD_USERS,
} from "@/features/candidate/data/leaderboard-dummy";

const ME          = LEADERBOARD_USERS.find((u) => u.isCurrentUser)!;
const CURRENT_IDX = getCurrentLeagueIndex(ME.totalXp);

const LEAGUE_CFG = [
  { letter: "Đ",  bg: "bg-amber-700",  text: "text-white", name: "Đồng" },
  { letter: "B",  bg: "bg-slate-400",  text: "text-white", name: "Bạc" },
  { letter: "V",  bg: "bg-amber-400",  text: "text-white", name: "Vàng" },
  { letter: "Pt", bg: "bg-indigo-400", text: "text-white", name: "Bạch kim" },
  { letter: "KS", bg: "bg-cyan-400",   text: "text-white", name: "Kim cương" },
] as const;

const SILVER_USERS = LEADERBOARD_USERS
  .filter((u) => u.totalXp >= 3000 && u.totalXp < 6000)
  .sort((a, b) => b.totalXp - a.totalXp)
  .slice(0, 5)
  .map((u, i) => ({ ...u, leagueRank: i + 1 }));

// ── League dot ──────────────────────────────────────────────────────────────
function LeagueDot({ idx }: { idx: number }) {
  const cfg       = LEAGUE_CFG[idx];
  const isCurrent = idx === CURRENT_IDX;
  const isDone    = idx < CURRENT_IDX;

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 + idx * 0.08 }}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm",
          isCurrent
            ? cn(cfg.bg, cfg.text, "shadow-lg ring-4 ring-white dark:ring-gray-900 scale-110")
            : isDone
            ? cn(cfg.bg, cfg.text, "opacity-70")
            : "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600"
        )}
        aria-current={isCurrent ? "step" : undefined}
      >
        {cfg.letter}
      </motion.div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 + idx * 0.08 }}
        className={cn(
          "text-[10px] font-medium text-center leading-tight",
          isCurrent  ? "text-[#111827] dark:text-gray-100 font-semibold"
          : isDone   ? "text-[#6B7280] dark:text-gray-400"
          : "text-gray-300 dark:text-gray-600"
        )}
      >
        {cfg.name}
      </motion.span>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export function LeagueProgressCard() {
  const current = LEAGUE_LEVELS[CURRENT_IDX];
  const next    = LEAGUE_LEVELS[CURRENT_IDX + 1];
  const nextXp  = next?.minXp ?? Infinity;
  const pct     = next
    ? Math.min(100, Math.round(((ME.totalXp - current.minXp) / (nextXp - current.minXp)) * 100))
    : 100;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(portalCard, "overflow-hidden shadow-sm")}
    >
      {/* Header strip */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 280, damping: 16, delay: 0.1 }}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
            LEAGUE_CFG[CURRENT_IDX].bg,
            LEAGUE_CFG[CURRENT_IDX].text
          )}
        >
          {LEAGUE_CFG[CURRENT_IDX].letter}
        </motion.div>
        <div className="flex-1">
          <p className="text-sm font-bold text-[#111827] dark:text-gray-100 uppercase tracking-wide">
            Liên đoàn {LEAGUE_CFG[CURRENT_IDX].name}
          </p>
          <p className="text-xs text-[#6B7280] dark:text-gray-400">
            hạng #7 / 30 trong liên đoàn của bạn
          </p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* League steps */}
        <div className="relative">
          <div className="absolute top-6 left-[calc(10%+1.2rem)] right-[calc(10%+1.2rem)] h-0.5 bg-gray-100 dark:bg-gray-800" />
          <div className="flex items-start justify-between relative z-10">
            {LEAGUE_LEVELS.map((_, idx) => <LeagueDot key={idx} idx={idx} />)}
          </div>
        </div>

        {/* Progress to next league */}
        {next && (
          <div>
            <div className="flex justify-between text-xs text-[#6B7280] dark:text-gray-400 mb-1.5">
              <span>
                Top 5 tuần này sẽ thăng lên{" "}
                <strong className="text-indigo-400">{next.name}</strong>
              </span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", LEAGUE_CFG[CURRENT_IDX].bg)}
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
              />
            </div>
            <p className="text-[10px] text-[#9CA3AF] dark:text-gray-600 mt-1 text-right">
              {ME.totalXp.toLocaleString("vi-VN")} / {nextXp.toLocaleString("vi-VN")} XP
            </p>
          </div>
        )}

        {/* Mini leaderboard */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] dark:text-gray-500 mb-2">
            Top trong liên đoàn của bạn
          </p>
          <div className="flex flex-col gap-0.5">
            {SILVER_USERS.map((u, i) => {
              const isMe = u.isCurrentUser;
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.25, delay: 0.1 + i * 0.06 }}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-2 rounded-lg",
                    isMe
                      ? "bg-primary/5 dark:bg-primary/10"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    LEAGUE_CFG[CURRENT_IDX].bg, LEAGUE_CFG[CURRENT_IDX].text
                  )}>
                    {u.leagueRank}
                  </div>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    isMe
                      ? "bg-primary/15 text-primary dark:text-[#a78bff]"
                      : "bg-gray-100 dark:bg-gray-800 text-[#6B7280] dark:text-gray-300"
                  )}>
                    {u.initials}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isMe ? "text-primary dark:text-[#a78bff]" : "text-[#111827] dark:text-gray-100"
                    )}>
                      {u.name}
                    </span>
                    {isMe && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary dark:text-[#a78bff] leading-none">
                        Bạn
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Zap size={12} className="text-amber-400" />
                    <span className="text-sm font-semibold text-[#111827] dark:text-gray-100">
                      {u.totalXp.toLocaleString("vi-VN")}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
