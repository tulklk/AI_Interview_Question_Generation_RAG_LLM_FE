"use client";

import { Lock, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { GamificationAchievement } from "@/features/gamification/types/gamification.types";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { getAchievementVisual, getAchievementLabel } from "./achievement-icons";

interface AchievementCardProps {
  achievement: GamificationAchievement;
  /** "sm" = compact 2-col sidebar card; "md" = full-width list row */
  size?: "sm" | "md";
  /** Highlight the most-recently unlocked achievement with a "Mới" chip */
  isNewlyUnlocked?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AchievementCard({
  achievement: ach,
  size = "md",
  isNewlyUnlocked = false,
}: AchievementCardProps) {
  const { lang, t } = useLanguage();
  const g = t.gamification;

  const { Icon, emoji, bgClass, colorClass, barClass, unlockedBg, unlockedBorder, gradientClass, animClass } =
    getAchievementVisual(ach.code);

  // Animation class is applied to the icon/emoji only for unlocked achievements.
  // Locked icons always stay static.
  const activeAnimClass = ach.unlocked ? animClass : "";

  // Use backend-supplied text when available; fall back to built-in labels.
  const fallback = getAchievementLabel(ach.code, lang);
  const displayName = ach.name || fallback.name;
  const displayDesc = ach.description || fallback.desc;

  // Only show progress bar for locked achievements with numeric progress data
  const hasProgress =
    !ach.unlocked &&
    ach.targetValue !== undefined &&
    ach.currentValue !== undefined;

  const progressPct = hasProgress
    ? Math.min(100, Math.round((ach.currentValue! / ach.targetValue!) * 100))
    : 0;

  const remaining =
    hasProgress && ach.targetValue! > ach.currentValue!
      ? ach.targetValue! - ach.currentValue!
      : null;

  const ariaLabel = ach.unlocked
    ? g.ariaAchievementUnlocked.replace("{{name}}", displayName)
    : g.ariaAchievementLocked
        .replace("{{name}}", displayName)
        .replace("{{current}}", String(ach.currentValue ?? 0))
        .replace("{{target}}", String(ach.targetValue ?? "?"));

  // ── Compact tile — 3-col icon grid in the profile sidebar ────────────────
  // Square tile with gradient background (unlocked) or dark muted (locked).
  // Shows only the icon + name; no description, progress bar, or footer.
  if (size === "sm") {
    return (
      <div
        aria-label={ariaLabel}
        className={cn(
          "group relative flex flex-col items-center justify-center gap-2",
          "w-full aspect-square rounded-2xl select-none cursor-default",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:shadow-lg",
          ach.unlocked
            // light: soft lavender; dark: deep indigo
            ? "bg-violet-50 border border-violet-100 dark:bg-[#161138] dark:border-transparent shadow-sm dark:shadow-md"
            // light: soft gray card; dark: dark gray
            : "bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/30"
        )}
      >
        {/* "Mới" chip — top-left */}
        {isNewlyUnlocked && ach.unlocked && (
          <span
            aria-label="Recently unlocked"
            className="absolute top-1.5 left-1.5 z-10 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-white/30 text-white backdrop-blur-sm leading-tight"
          >
            {g.achievementNewlyUnlocked}
          </span>
        )}

        {/* Lock indicator — top-right corner for locked tiles */}
        {!ach.unlocked && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <Lock size={8} className="text-gray-400 dark:text-gray-500" />
          </span>
        )}

        {/* Emoji icon — naturally colourful & filled; grayscale when locked.
            activeAnimClass is set only for unlocked achievements; the CSS in
            ACH_ANIM_CSS activates the matching @keyframes on .group:hover. */}
        <span
          aria-hidden
          className={cn(
            "text-3xl leading-none select-none",
            !ach.unlocked && "grayscale opacity-50",
            activeAnimClass,
          )}
        >
          {emoji}
        </span>

        {/* Name — centered: white on dark-purple unlocked tile, muted on locked */}
        <p
          className={cn(
            "text-[10px] font-semibold leading-tight text-center px-1.5",
            ach.unlocked
              ? "text-violet-900 dark:text-white/95"
              : "text-gray-500 dark:text-gray-500"
          )}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {displayName}
        </p>

        {/* ── Hover tooltip ────────────────────────────────────────────────── */}
        {/* Positions above the tile; z-50 floats over siblings */}
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-50",
            "w-52 rounded-2xl border shadow-2xl",
            "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800",
            // show on hover
            "opacity-0 invisible translate-y-1",
            "group-hover:opacity-100 group-hover:visible group-hover:translate-y-0",
            "transition-all duration-200 ease-out"
          )}
        >
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-white dark:border-t-gray-900" />

          <div className="p-3">
            {/* Achievement name + emoji */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg leading-none">{emoji}</span>
              <p className="text-[12px] font-bold text-gray-900 dark:text-white leading-tight">
                {displayName}
              </p>
            </div>

            {/* Description — how to earn it */}
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug mb-2.5">
              {displayDesc}
            </p>

            {/* Status: unlocked / in-progress / locked */}
            {ach.unlocked ? (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Check size={11} strokeWidth={2.5} />
                <span>
                  {g.achievementUnlockedStatus}
                  {ach.unlockedAt && (
                    <span className="font-normal text-gray-400 dark:text-gray-500 ml-1">
                      · {new Date(ach.unlockedAt).toLocaleDateString()}
                    </span>
                  )}
                </span>
              </div>
            ) : hasProgress ? (
              <>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                    {ach.currentValue} / {ach.targetValue}
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                    {progressPct}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", barClass)}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                {remaining !== null && (
                  <p className="text-[10px] mt-1.5 text-gray-400 dark:text-gray-500">
                    {g.achievementRemainingCount.replace("{{count}}", String(remaining))}
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                <Lock size={10} />
                <span>{g.achievementNoProgress}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Full / list row — settings page and full achievements list ────────────
  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "group flex items-start gap-3 p-3 rounded-xl border",
        "transition-transform duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-sm",
        ach.unlocked
          ? cn(unlockedBg, unlockedBorder)
          : "bg-gray-50/60 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800/40 opacity-75"
      )}
    >
      {/* Icon well — activeAnimClass makes it animate on .group:hover (unlocked only) */}
      <div
        className={cn(
          "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
          ach.unlocked ? bgClass : "bg-gray-100 dark:bg-gray-800/60",
          activeAnimClass,
        )}
      >
        <Icon
          size={17}
          className={
            ach.unlocked ? colorClass : "text-gray-400 dark:text-gray-600"
          }
        />
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          {/* Name + optional badges */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <p className={cn("text-[12px] font-bold leading-tight", portalHeadingAlt)}>
              {displayName}
            </p>
            {ach.xpReward !== undefined && ach.unlocked && (
              <span className="shrink-0 text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.5 rounded-full border border-violet-100 dark:border-violet-800/30">
                +{ach.xpReward} XP
              </span>
            )}
            {isNewlyUnlocked && ach.unlocked && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                {g.achievementNewlyUnlocked}
              </span>
            )}
          </div>
          {/* Status badge */}
          {ach.unlocked ? (
            <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center">
              <Check
                size={11}
                className="text-emerald-600 dark:text-emerald-400"
                strokeWidth={2.5}
              />
            </span>
          ) : (
            <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
              <Lock size={11} className="text-gray-400 dark:text-gray-600" />
            </span>
          )}
        </div>

        <p className={cn("text-[11px] leading-snug", portalSubtextAlt)}>
          {displayDesc}
        </p>

        {/* Progress bar (locked with numeric data) */}
        {hasProgress && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-600">
                {g.achievementProgress
                  .replace("{{current}}", String(ach.currentValue))
                  .replace("{{target}}", String(ach.targetValue))}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-600">
                {progressPct}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  barClass
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {remaining !== null && (
              <p className="text-[10px] mt-1 text-gray-400 dark:text-gray-600">
                {g.achievementRemainingCount.replace(
                  "{{count}}",
                  String(remaining)
                )}
              </p>
            )}
          </div>
        )}

        {/* Unlocked date */}
        {ach.unlocked && ach.unlockedAt && (
          <p className={cn("text-[10px] mt-1", portalSubtextAlt)}>
            {g.unlockedOn.replace(
              "{{date}}",
              new Date(ach.unlockedAt).toLocaleDateString()
            )}
          </p>
        )}
      </div>
    </div>
  );
}
