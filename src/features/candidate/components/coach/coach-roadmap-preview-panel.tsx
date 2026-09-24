"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2, Map } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import type { CoachRoadmap } from "@/features/candidate/services/coach.service";
import {
  expandVariants,
  staggerContainer,
  staggerItem,
} from "@/features/candidate/components/coach/coach-motion";

interface CoachRoadmapPreviewPanelProps {
  roadmaps: CoachRoadmap[];
  busy?: boolean;
  accepting?: boolean;
  onToggleItem: (itemId: string, isIncluded: boolean) => void | Promise<void>;
  onAccept: () => void | Promise<void>;
}

function priorityLabel(
  priority: string,
  labels: { high: string; medium: string; low: string }
): string {
  const key = priority.toLowerCase();
  if (key === "high") return labels.high;
  if (key === "low") return labels.low;
  return labels.medium;
}

/** SCRUM-462: preview/toggle topic trước khi Accept lộ trình. */
export function CoachRoadmapPreviewPanel({
  roadmaps,
  busy = false,
  accepting = false,
  onToggleItem,
  onAccept,
}: CoachRoadmapPreviewPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const reduced = useReducedMotion();
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState<Record<string, boolean>>({});

  const draftRoadmaps = useMemo(
    () => roadmaps.filter((r) => r.status === "Suggested" && !r.acceptedAt),
    [roadmaps]
  );

  const defaultExpandedId = useMemo(() => {
    if (draftRoadmaps.length === 0) return null;
    let best = draftRoadmaps[0];
    for (const r of draftRoadmaps) {
      if (r.priorityScore > best.priorityScore) best = r;
    }
    return best.id;
  }, [draftRoadmaps]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const activeExpandedId = expandedId ?? defaultExpandedId;

  const summary = useMemo(() => {
    let skills = 0;
    let topics = 0;
    for (const r of draftRoadmaps) {
      const included = r.items.filter((i) => !i.isReassessmentGate && i.isIncluded !== false);
      if (included.length > 0) {
        skills += 1;
        topics += included.length;
      }
    }
    return { skills, topics };
  }, [draftRoadmaps]);

  if (draftRoadmaps.length === 0) return null;

  const canAccept = summary.skills >= 1 && !busy && !accepting;

  async function handleToggle(itemId: string, next: boolean) {
    setPendingItemId(itemId);
    try {
      await onToggleItem(itemId, next);
    } finally {
      setPendingItemId(null);
    }
  }

  const priorityLabels = {
    high: p.priorityHighLabel,
    medium: p.priorityMediumLabel,
    low: p.priorityLowLabel,
  };

  return (
    <div className="hr-glass-card relative">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50">
          <Map size={14} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.roadmapPreviewTitle}</p>
          <p className={cn("text-[11px]", portalSubtextAlt)}>{p.roadmapPreviewSubtitle}</p>
        </div>
      </div>

      <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
          {fillTemplate(p.roadmapPreviewSummary, {
            skills: String(summary.skills),
            topics: String(summary.topics),
          })}
        </p>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {draftRoadmaps.map((roadmap) => {
          const expanded = activeExpandedId === roadmap.id;
          const si = getSkillIcon(roadmap.skill);
          const SIcon = si?.icon;
          const outside = roadmap.skillSource === "outsideCv";
          const topics = roadmap.items
            .filter((i) => !i.isReassessmentGate)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          const topicCount = topics.filter((i) => i.isIncluded !== false).length;
          const desc = roadmap.explanation?.trim() || (outside ? roadmap.outsideCvReason : null);
          const showFullDesc = descExpanded[roadmap.id];
          const longDesc = Boolean(desc && desc.length > 120);

          return (
            <div key={roadmap.id}>
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : roadmap.id)}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50/80 dark:hover:bg-gray-900/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  {SIcon ? <SIcon size={16} className={si.className} /> : <Map size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-[14px] font-bold", portalHeadingAlt)}>{roadmap.skill}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        outside
                          ? "bg-amber-50 text-amber-700/80 dark:bg-amber-950/30 dark:text-amber-200/70"
                          : "bg-emerald-50 text-emerald-700/80 dark:bg-emerald-950/30 dark:text-emerald-200/70"
                      )}
                    >
                      {outside ? p.roadmapSkillOutsideCv : p.roadmapSkillFromCv}
                    </span>
                  </div>
                  <p className={cn("mt-0.5 text-[11px]", portalSubtextAlt)}>
                    {fillTemplate(p.roadmapPreviewTopicCount, { count: String(topicCount) })}
                    {" · "}
                    {fillTemplate(p.roadmapPreviewPriorityLine, {
                      priority: priorityLabel(roadmap.priority, priorityLabels),
                      score: roadmap.priorityScore.toFixed(1),
                    })}
                  </p>
                </div>
                {expanded ? (
                  <ChevronDown size={16} className="shrink-0 text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="shrink-0 text-gray-400" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    key="body"
                    className="overflow-hidden"
                    variants={expandVariants}
                    initial={reduced ? false : "collapsed"}
                    animate="expanded"
                    exit="exit"
                  >
                    <div className="space-y-3 px-5 pb-4 sm:pl-16">
                      {desc && (
                        <div>
                          <p
                            className={cn(
                              "text-[11px] leading-relaxed",
                              portalSubtextAlt,
                              !showFullDesc && longDesc && "line-clamp-2"
                            )}
                          >
                            {desc}
                          </p>
                          {longDesc && (
                            <button
                              type="button"
                              onClick={() =>
                                setDescExpanded((prev) => ({
                                  ...prev,
                                  [roadmap.id]: !prev[roadmap.id],
                                }))
                              }
                              className="mt-0.5 text-[11px] font-semibold text-primary hover:underline"
                            >
                              {showFullDesc ? p.roadmapShowLess : p.roadmapShowMore}
                            </button>
                          )}
                        </div>
                      )}

                      <motion.ul
                        className="space-y-1.5"
                        variants={staggerContainer}
                        initial={reduced ? false : "hidden"}
                        animate="visible"
                      >
                        {topics.map((item) => {
                          const checked = item.isIncluded !== false;
                          const toggling = pendingItemId === item.id;
                          return (
                            <motion.li
                              key={item.id}
                              variants={staggerItem}
                              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50/80 dark:hover:bg-gray-900/30"
                            >
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-primary focus:ring-primary/40"
                                checked={checked}
                                disabled={busy || accepting || toggling}
                                onChange={(e) => void handleToggle(item.id, e.target.checked)}
                                aria-label={item.topic}
                              />
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    "text-[12px] font-medium leading-snug",
                                    checked ? portalHeadingAlt : "text-gray-400 line-through"
                                  )}
                                >
                                  {item.topic}
                                </p>
                              </div>
                              {toggling && (
                                <Loader2
                                  size={12}
                                  className="mt-0.5 shrink-0 animate-spin text-primary"
                                />
                              )}
                            </motion.li>
                          );
                        })}
                      </motion.ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-[12px] font-semibold tabular-nums", portalHeadingAlt)}>
              {fillTemplate(p.roadmapAcceptBarSummary, {
                skills: String(summary.skills),
                topics: String(summary.topics),
              })}
            </p>
            {!canAccept && summary.skills === 0 && (
              <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                {p.roadmapAcceptMinOneSkill}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!canAccept}
            onClick={() => void onAccept()}
            className="shimmer-button hr-cta-btn inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {accepting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {p.roadmapAcceptCta}
          </button>
        </div>
      </div>
    </div>
  );
}
