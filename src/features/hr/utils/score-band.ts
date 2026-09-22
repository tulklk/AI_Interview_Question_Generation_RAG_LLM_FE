/**
 * Band chất lượng điểm AI (FE only) — ngưỡng thống nhất HR:
 * 90–100 Xuất sắc | 80–90 Tốt | 70–80 Khá | &lt;70 Cần cải thiện
 */
import { getScoreLevel, type ScoreLevelLabels } from "@/features/candidate/components/ui/pill";
import { cn } from "@/lib/cn";

export type ScoreBandId = "excellent" | "good" | "fair" | "needsWork";

export function resolveScoreBandId(score: number): ScoreBandId {
  if (score >= 90) return "excellent";
  if (score >= 80) return "good";
  if (score >= 70) return "fair";
  return "needsWork";
}

/** Style vòng/pill list — khớp màu getScoreLevel. */
export function getScoreBandRingClass(score: number): {
  ring: string;
  text: string;
  bg: string;
} {
  const id = resolveScoreBandId(score);
  if (id === "excellent") {
    return {
      ring: "ring-emerald-400 dark:ring-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    };
  }
  if (id === "good") {
    return {
      ring: "ring-violet-400 dark:ring-violet-500",
      text: "text-violet-700 dark:text-violet-300",
      bg: "bg-violet-50 dark:bg-violet-950/40",
    };
  }
  if (id === "fair") {
    return {
      ring: "ring-amber-400 dark:ring-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    };
  }
  return {
    ring: "ring-red-400 dark:ring-red-500",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
  };
}

export function getScoreBandLabel(score: number, labels: ScoreLevelLabels): string {
  return getScoreLevel(score, labels).label;
}

export function scoreBandTextClass(score: number): string {
  return getScoreBandRingClass(score).text;
}

export function scoreBandBadgeClassName(score: number, extra?: string): string {
  const { ring, bg, text } = getScoreBandRingClass(score);
  return cn(
    "inline-flex items-center justify-center shrink-0 rounded-full ring-2 px-2 h-10 min-w-14",
    ring,
    bg,
    text,
    extra,
  );
}
