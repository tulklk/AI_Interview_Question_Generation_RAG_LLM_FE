/**
 * Band chất lượng điểm AI — nguồn chuẩn toàn hệ thống (HR + Candidate):
 * ≥90 Xuất sắc | ≥80 Tốt | ≥70 Khá | &lt;70 Cần cải thiện
 *
 * Ngưỡng badge label cũng nằm ở getScoreLevel trong pill.tsx — phải khớp SCORE_BAND.
 */
import { getScoreLevel, type ScoreLevelLabels } from "@/features/candidate/components/ui/pill";
import { cn } from "@/lib/cn";

export type ScoreBandId = "excellent" | "good" | "fair" | "needsWork";

/** Ngưỡng band — dùng chung mọi chỗ so sánh điểm. */
export const SCORE_BAND = {
  excellent: 90,
  good: 80,
  fair: 70,
} as const;

export function resolveScoreBandId(score: number): ScoreBandId {
  if (score >= SCORE_BAND.excellent) return "excellent";
  if (score >= SCORE_BAND.good) return "good";
  if (score >= SCORE_BAND.fair) return "fair";
  return "needsWork";
}

/** Hex cho chart / SVG ring — khớp màu getScoreLevel. */
export function getScoreBandHex(score: number): string {
  const id = resolveScoreBandId(score);
  if (id === "excellent") return "#10B981";
  if (id === "good") return "#8B5CF6";
  if (id === "fair") return "#F59E0B";
  return "#EF4444";
}

/** Style thanh skill / pill — khớp màu getScoreLevel. */
export function getScoreBandBarClass(score: number): {
  bar: string;
  text: string;
  bg: string;
  ring: string;
} {
  const id = resolveScoreBandId(score);
  if (id === "excellent") {
    return {
      bar: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      ring: "#10B981",
    };
  }
  if (id === "good") {
    return {
      bar: "bg-violet-500",
      text: "text-violet-700 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/40",
      ring: "#8B5CF6",
    };
  }
  if (id === "fair") {
    return {
      bar: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      ring: "#F59E0B",
    };
  }
  return {
    bar: "bg-red-500",
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    ring: "#EF4444",
  };
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

/**
 * Fallback insight khi BE không trả AI insight.
 * Chỉ có 3 câu copy: Xuất sắc / Tốt (gồm cả Khá) / Cần cải thiện.
 */
export function resolveScoreInsightKey(
  score: number,
): "excellent" | "good" | "needsWork" {
  if (score >= SCORE_BAND.excellent) return "excellent";
  if (score >= SCORE_BAND.fair) return "good";
  return "needsWork";
}
