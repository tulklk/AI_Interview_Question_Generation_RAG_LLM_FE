"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  Circle,
  Flag,
  Loader2,
  Lock,
  Play,
  RefreshCw,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import type { CoachRoadmap, CoachRoadmapItem } from "@/features/candidate/services/coach.service";
import {
  motionSafe,
  staggerContainer,
  staggerItem,
} from "@/features/candidate/components/coach/coach-motion";

export type JourneyNodeVisual = "completed" | "current" | "locked" | "upcoming" | "gate";

export function resolveJourneyNode(
  item: CoachRoadmapItem,
  index: number,
  items: CoachRoadmapItem[]
): JourneyNodeVisual {
  if (item.isReassessmentGate) return "gate";
  if (item.status === "Completed") return "completed";
  if (item.status === "InProgress" || item.status === "ReadyForReassessment") return "current";

  // Pending: khóa nếu topic trước (không tính gate) chưa Completed.
  const prevTopics = items.slice(0, index).filter((x) => !x.isReassessmentGate);
  const prevDone =
    prevTopics.length === 0 ||
    prevTopics.every((x) => x.status === "Completed");
  if (item.status === "Pending" && !prevDone) return "locked";
  return "upcoming";
}

export function roadmapTopicProgress(roadmap: CoachRoadmap): {
  done: number;
  total: number;
  percent: number;
} {
  const topics = roadmap.items.filter(
    (i) => !i.isReassessmentGate && i.isIncluded !== false
  );
  const total = topics.length;
  const done = topics.filter((i) => i.status === "Completed").length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

export function roadmapScoreProgress(roadmap: CoachRoadmap): number {
  if (roadmap.targetScore <= 0) return 0;
  const current = roadmap.currentScore ?? 0;
  return Math.min(100, Math.max(0, Math.round((current / roadmap.targetScore) * 100)));
}

interface CoachJourneyPathProps {
  roadmap: CoachRoadmap;
  busy?: boolean;
  isPremium?: boolean;
  /** Cho phép CTA drill/reassess (panel chính). Trang chi tiết có thể tắt. */
  interactive?: boolean;
  /** Fallback questionSetId khi gate InProgress chưa hydrate drillQuestionSetId. */
  gateFallbackSetId?: string | null;
  onDrillItem?: (roadmapId: string, itemId: string) => void;
  onReassessment?: (roadmapId: string) => void;
  onUpgrade?: () => void;
}

export function CoachJourneyPath({
  roadmap,
  busy = false,
  isPremium = true,
  interactive = true,
  gateFallbackSetId = null,
  onDrillItem,
  onReassessment,
  onUpgrade,
}: CoachJourneyPathProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const reduced = useReducedMotion();
  const safe = motionSafe(reduced);
  const suggested = roadmap.status === "Suggested";
  const items = [...roadmap.items].sort((a, b) => a.sortOrder - b.sortOrder);

  function requirePremium(action: () => void) {
    if (!isPremium) {
      onUpgrade?.();
      return;
    }
    action();
  }

  return (
    <motion.ol
      className="relative list-none space-y-0 pl-0"
      variants={staggerContainer}
      {...safe}
    >
      {items.map((item, idx) => {
        const visual = resolveJourneyNode(item, idx, items);
        const isLast = idx === items.length - 1;
        const itemSetId =
          item.isReassessmentGate && item.status === "InProgress"
            ? item.drillQuestionSetId || gateFallbackSetId
            : item.drillQuestionSetId;

        const nodeCfg = nodeStyle(visual);
        const lineDone = visual === "completed";

        return (
          <motion.li key={item.id} className="flex gap-3 sm:gap-4" variants={staggerItem}>
            {/* Spine */}
            <div className="flex w-7 shrink-0 flex-col items-center">
              <div
                className={cn(
                  "z-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                  nodeCfg.dotClass
                )}
                aria-hidden
              >
                {nodeCfg.icon}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "my-1 min-h-7 w-0.5 flex-1 rounded-full",
                    lineDone
                      ? "bg-emerald-300 dark:bg-emerald-800"
                      : "bg-gray-200 dark:bg-gray-700"
                  )}
                />
              )}
            </div>

            {/* Card */}
            <div
              className={cn(
                "mb-3 min-w-0 flex-1 rounded-xl border px-3.5 py-3 transition-colors",
                nodeCfg.cardClass,
                visual === "current" && "shadow-sm shadow-primary/10"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
                        nodeCfg.badgeClass
                      )}
                    >
                      {item.isReassessmentGate
                        ? p.gateNode
                        : visual === "completed"
                          ? p.roadmapStatusCompleted
                          : visual === "current"
                            ? p.journeyCurrentBadge
                            : visual === "locked"
                              ? p.gateLocked
                              : p.roadmapStatusSuggested}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-[13px] font-semibold leading-snug",
                      visual === "locked" ? "text-gray-400 dark:text-gray-500" : portalHeadingAlt
                    )}
                  >
                    {item.topic}
                  </p>
                  {item.subtopic && (
                    <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{item.subtopic}</p>
                  )}
                  {item.drillScore != null && (
                    <p className={cn("text-[11px] mt-1", portalSubtextAlt)}>
                      {fillTemplate(p.itemDrillScore, { score: String(Math.round(item.drillScore)) })}
                    </p>
                  )}
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      {item.sourceTitle || p.sourceLink}
                    </a>
                  )}
                </div>

                {interactive && !suggested && (
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {!item.isReassessmentGate && item.status !== "Completed" && visual !== "locked" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          requirePremium(() => onDrillItem?.(roadmap.id, item.id))
                        }
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold border border-primary/25 text-primary disabled:opacity-50 hover:bg-primary/5"
                      >
                        {busy ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                        {p.drillItem}
                      </button>
                    )}
                    {item.isReassessmentGate && item.status === "ReadyForReassessment" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => requirePremium(() => onReassessment?.(roadmap.id))}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold border border-primary/25 text-primary disabled:opacity-50 hover:bg-primary/5"
                      >
                        {busy ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                        {p.startReassessment}
                      </button>
                    )}
                    {item.isReassessmentGate && item.status === "InProgress" && itemSetId && (
                      <Link
                        href={`/candidate/practice/${itemSetId}?mode=coach`}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        {p.takeReassessment}
                      </Link>
                    )}
                    {!item.isReassessmentGate &&
                      item.drillQuestionSetId &&
                      item.status === "Completed" && (
                        <a
                          href={`/candidate/sets/${item.drillQuestionSetId}`}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          {p.openSet}
                        </a>
                      )}
                  </div>
                )}

                {!interactive && item.drillQuestionSetId && (
                  <a
                    href={`/candidate/sets/${item.drillQuestionSetId}`}
                    className="shrink-0 text-[11px] font-semibold text-primary hover:underline"
                  >
                    {p.openSet}
                  </a>
                )}
              </div>
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}

function nodeStyle(visual: JourneyNodeVisual): {
  dotClass: string;
  badgeClass: string;
  cardClass: string;
  icon: ReactNode;
} {
  switch (visual) {
    case "completed":
      return {
        dotClass: "bg-emerald-500 border-emerald-500",
        badgeClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
        cardClass: "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10",
        icon: <Check size={12} className="text-white" />,
      };
    case "current":
      return {
        dotClass: "bg-violet-600 border-violet-600 ring-4 ring-violet-500/25",
        badgeClass: "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
        cardClass:
          "border-2 border-violet-400 dark:border-violet-500 bg-violet-50/50 dark:bg-violet-950/20",
        icon: <span className="w-2 h-2 rounded-full bg-white block" />,
      };
    case "gate":
      return {
        dotClass: "bg-amber-500 border-amber-500",
        badgeClass: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300",
        cardClass: "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20",
        icon: <Flag size={11} className="text-white" />,
      };
    case "locked":
      return {
        dotClass: "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
        badgeClass: "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500",
        cardClass: "border-gray-100 dark:border-gray-800 opacity-55",
        icon: <Lock size={11} className="text-gray-400 dark:text-gray-500" />,
      };
    default:
      return {
        dotClass: "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600",
        badgeClass: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
        cardClass: "border-gray-100 dark:border-gray-800",
        icon: <Circle size={10} className="text-gray-300 dark:text-gray-600" />,
      };
  }
}
