"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { XpReward } from "@/features/gamification/types/gamification.types";
import { XpProgressBar } from "@/features/gamification/components/xp-progress-bar";
import { playXpGainSound, playLevelUpSound, playGoalSound } from "@/features/gamification/utils/xp-sound";

interface XpGainNotificationProps {
  xpReward: XpReward;
  /** Delay (ms) before the notification appears. Default: 1400 */
  delayMs?: number;
  /** Whether today's daily goal was just completed. */
  dailyGoalCompleted?: boolean;
  className?: string;
}

/** Animated counter that counts up from `from` to `to` over `durationMs`. */
function useCountUp(to: number, durationMs = 700, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active || to === 0) return;
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs, active]);
  return value;
}

export function XpGainNotification({
  xpReward,
  delayMs = 1400,
  dailyGoalCompleted = false,
  className,
}: XpGainNotificationProps) {
  const { t } = useLanguage();
  const g = t.gamification;

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const soundFired = useRef(false);

  const displayedXp = useCountUp(xpReward.totalEarned, 700, visible);

  // Show after delay
  useEffect(() => {
    if (xpReward.totalEarned <= 0) return;
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [xpReward.totalEarned, delayMs]);

  // Play sound once visible
  useEffect(() => {
    if (!visible || soundFired.current) return;
    soundFired.current = true;
    try {
      if (xpReward.levelUp) playLevelUpSound();
      else if (dailyGoalCompleted) playGoalSound();
      else playXpGainSound();
    } catch { /* blocked by browser policy — silent */ }
  }, [visible, xpReward.levelUp, dailyGoalCompleted]);

  // Auto-dismiss after 6 s
  const DISMISS_MS = 6000;
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setDismissed(true), DISMISS_MS);
    return () => clearTimeout(t);
  }, [visible]);

  if (xpReward.totalEarned <= 0) return null;

  return (
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-label={`+${xpReward.totalEarned} XP earned`}
          initial={{ opacity: 0, y: 72, scale: 0.82 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className={cn(
            "fixed bottom-6 right-6 z-50 w-[280px] rounded-2xl overflow-hidden select-none",
            "bg-white dark:bg-gray-900",
            "shadow-2xl shadow-violet-300/25 dark:shadow-violet-900/30",
            "border border-violet-100 dark:border-violet-800/40",
            className
          )}
        >
          {/* ── Header — violet gradient ────────────────────────────── */}
          <div className="relative bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-500 px-4 pt-4 pb-4 overflow-hidden">
            {/* Sparkle orbs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10 blur-xl" />
              <div className="absolute bottom-0 left-2 w-16 h-16 rounded-full bg-indigo-400/20 blur-lg" />
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>

            {/* Label */}
            <div className="flex items-center gap-1.5 mb-1">
              <Zap size={13} className="text-yellow-300 shrink-0" fill="currentColor" />
              <span className="text-white/80 text-[11px] font-semibold tracking-wide uppercase">
                {g.sessionSummaryTitle}
              </span>
            </div>

            {/* Big counter */}
            <motion.p
              className="text-white text-[40px] font-[900] leading-none tabular-nums"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 500, damping: 20 }}
            >
              +{displayedXp} XP
            </motion.p>
          </div>

          {/* ── Body ────────────────────────────────────────────────── */}
          <div className="px-4 py-3 space-y-3">
            {/* Level-up badge */}
            {xpReward.levelUp && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 400, damping: 20 }}
                className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 rounded-xl px-3 py-2"
              >
                <TrendingUp size={13} className="text-amber-500 shrink-0" />
                <span className="text-[12px] font-bold text-amber-700 dark:text-amber-400">
                  {g.sessionLevelUp.replace("{{level}}", String(xpReward.currentLevel))}
                </span>
              </motion.div>
            )}

            {/* Daily goal completed */}
            {dailyGoalCompleted && !xpReward.levelUp && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 rounded-xl px-3 py-2"
              >
                <span className="text-base leading-none">🎯</span>
                <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">
                  {g.dailyGoalCompleted}
                </span>
              </motion.div>
            )}

            {/* XP breakdown rows */}
            <div className="space-y-1">
              {xpReward.rewards.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.07 }}
                  className="flex items-center justify-between"
                >
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">{r.label}</span>
                  <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                    +{r.xp} XP
                  </span>
                </motion.div>
              ))}
            </div>

            {/* XP progress to next level */}
            {xpReward.progress && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
              >
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                  {g.levelLabel} {xpReward.progress.level}
                  {" · "}
                  {xpReward.progress.currentLevelXp.toLocaleString()}
                  {" / "}
                  {xpReward.progress.xpRequiredForNextLevel.toLocaleString()} XP
                </p>
                <XpProgressBar
                  level={xpReward.progress.level}
                  progressPercentage={xpReward.progress.progressPercentage}
                  currentLevelXp={xpReward.progress.currentLevelXp}
                  xpRequiredForNextLevel={xpReward.progress.xpRequiredForNextLevel}
                  showLabels={false}
                  height="xs"
                  animate
                />
              </motion.div>
            )}
          </div>

          {/* ── Auto-dismiss bar ─────────────────────────────────────── */}
          <div className="h-[3px] bg-gray-100 dark:bg-gray-800">
            <motion.div
              className="h-full rounded-full bg-violet-500"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: DISMISS_MS / 1000, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
