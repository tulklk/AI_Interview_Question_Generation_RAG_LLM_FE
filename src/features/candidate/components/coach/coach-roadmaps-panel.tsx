"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Map, Play, RefreshCw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import type { CoachJob, CoachRoadmap } from "@/features/candidate/services/coach.service";
import { jobDone } from "@/features/candidate/hooks/use-coach-workflow";
import {
  CoachJourneyPath,
  roadmapScoreProgress,
  roadmapTopicProgress,
} from "@/features/candidate/components/coach/coach-journey-path";
import { expandVariants } from "@/features/candidate/components/coach/coach-motion";

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  low: "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_BADGE: Record<string, string> = {
  Active: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Suggested: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

const ROADMAP_STATUS: Record<string, string> = {
  Suggested: "roadmapStatusSuggested",
  Active: "roadmapStatusActive",
  Completed: "roadmapStatusCompleted",
};

interface CoachRoadmapsPanelProps {
  roadmaps: CoachRoadmap[];
  isPremium: boolean;
  busy: boolean;
  /** Job reassessment vừa sinh xong — fallback CTA nếu gate chưa có drillQuestionSetId. */
  job?: CoachJob | null;
  onStart: (id: string) => void;
  onDrillItem: (roadmapId: string, itemId: string) => void;
  onReassessment: (roadmapId: string) => void;
  onUpgrade: () => void;
}

export function CoachRoadmapsPanel({
  roadmaps,
  isPremium,
  busy,
  job = null,
  onStart,
  onDrillItem,
  onReassessment,
  onUpgrade,
}: CoachRoadmapsPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const reduced = useReducedMotion();
  const [expandedId, setExpandedId] = useState<string | null>(
    roadmaps.find((r) => r.status === "Active")?.id ?? roadmaps[0]?.id ?? null
  );

  if (roadmaps.length === 0) return null;

  const reassessJobReady =
    jobDone(job) && (job?.purpose ?? "").toLowerCase().includes("reassess");
  const anyInferred = roadmaps.some((r) => (r.kbSource ?? "inferred") !== "system");

  const priorityLabels = {
    high: p.priorityHighLabel,
    medium: p.priorityMediumLabel,
    low: p.priorityLowLabel,
  };

  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50">
          <Map size={14} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.roadmapsTitle}</p>
          <p className={cn("text-[11px]", portalSubtextAlt)}>{p.roadmapsSubtitle}</p>
        </div>
      </div>

      {anyInferred && (
        <div className="mx-5 mt-3 rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-[11px] leading-snug text-violet-900 dark:border-violet-800/40 dark:bg-violet-950/20 dark:text-violet-100">
          {p.roadmapKbInferred}
        </div>
      )}

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {roadmaps.map((roadmap) => {
          const expanded = expandedId === roadmap.id;
          const si = getSkillIcon(roadmap.skill);
          const SIcon = si?.icon;
          const statusKey = ROADMAP_STATUS[roadmap.status];
          const gate = roadmap.items.find((i) => i.isReassessmentGate);
          const topicProg = roadmapTopicProgress(roadmap);
          const scoreProg = roadmapScoreProgress(roadmap);
          const kbSystem = (roadmap.kbSource ?? "inferred") === "system";
          const readyForReassessment = roadmap.items.some(
            (i) =>
              i.status === "ReadyForReassessment" ||
              (i.isReassessmentGate && i.status === "ReadyForReassessment")
          );
          const allItemsDone =
            roadmap.items.length > 0 &&
            roadmap.items.every(
              (i) => i.status === "Completed" || i.status === "ReadyForReassessment"
            );
          const gateSetId =
            gate?.drillQuestionSetId ||
            (reassessJobReady && gate?.status === "InProgress" ? job?.questionSetId : null) ||
            null;
          const gateReadyToTake = Boolean(gate && gate.status === "InProgress" && gateSetId);
          const priorityKey = roadmap.priority.toLowerCase();
          const showStatus =
            roadmap.status === "Active" ||
            roadmap.status === "Completed" ||
            (roadmap.status === "Suggested" && Boolean(roadmap.acceptedAt));

          return (
            <div key={roadmap.id} className="px-5 py-3.5">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : roadmap.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  {SIcon ? <SIcon size={16} className={si.className} /> : <Map size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className={cn("text-[14px] font-bold", portalHeadingAlt)}>{roadmap.skill}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        PRIORITY_STYLE[priorityKey] ?? PRIORITY_STYLE.medium
                      )}
                    >
                      {fillTemplate(p.roadmapPreviewPriorityLine, {
                        priority:
                          priorityKey === "high"
                            ? priorityLabels.high
                            : priorityKey === "low"
                              ? priorityLabels.low
                              : priorityLabels.medium,
                        score: roadmap.priorityScore.toFixed(1),
                      })}
                    </span>
                    {showStatus && statusKey && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          STATUS_BADGE[roadmap.status] ?? STATUS_BADGE.Suggested
                        )}
                      >
                        {statusKey === "roadmapStatusSuggested"
                          ? p.roadmapStatusSuggested
                          : statusKey === "roadmapStatusActive"
                            ? p.roadmapStatusActive
                            : p.roadmapStatusCompleted}
                      </span>
                    )}
                    {!kbSystem && (
                      <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {p.roadmapKbInferredBadge}
                      </span>
                    )}
                    {roadmap.kind === "advanced" && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {p.advancedRoadmapsTitle}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div
                      role="progressbar"
                      aria-valuenow={scoreProg}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          roadmap.status === "Completed" ? "bg-emerald-500" : "bg-violet-500"
                        )}
                        style={{ width: `${scoreProg}%` }}
                      />
                    </div>
                    <span className={cn("shrink-0 text-[10px] font-medium tabular-nums", portalSubtextAlt)}>
                      {fillTemplate(p.roadmapHeaderProgress, {
                        done: String(topicProg.done),
                        total: String(topicProg.total),
                      })}
                    </span>
                  </div>
                </div>
                {expanded ? (
                  <ChevronDown size={16} className="mt-0.5 shrink-0 text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="mt-0.5 shrink-0 text-gray-400" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    key="expanded"
                    className="overflow-hidden"
                    variants={expandVariants}
                    initial={reduced ? false : "collapsed"}
                    animate="expanded"
                    exit="exit"
                  >
                    <div className="mt-3 space-y-3 sm:ml-11">
                      {roadmap.explanation && !roadmap.explanation.trim().startsWith("{") && (
                        <p className={cn("text-[12px] leading-relaxed", portalSubtextAlt)}>
                          {roadmap.explanation}
                        </p>
                      )}

                      <p className={cn("text-[11px]", portalSubtextAlt)}>
                        {fillTemplate(p.roadmapScoreLine, {
                          current:
                            roadmap.currentScore != null
                              ? String(Math.round(roadmap.currentScore))
                              : "—",
                          target: String(Math.round(roadmap.targetScore)),
                          gap: String(Math.round(roadmap.gap)),
                        })}
                      </p>

                      {roadmap.status === "Suggested" && Boolean(roadmap.acceptedAt) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (!isPremium) {
                              onUpgrade();
                              return;
                            }
                            onStart(roadmap.id);
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 px-3 text-[12px] font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
                        >
                          <Play size={12} />
                          {p.startRoadmap}
                        </button>
                      )}
                      {roadmap.status === "Suggested" && !roadmap.acceptedAt ? null : (
                        <Link
                          href={`/candidate/coach/roadmaps/${roadmap.id}`}
                          className="inline-flex h-8 items-center px-0 text-[12px] font-semibold text-primary hover:underline"
                        >
                          {p.openRoadmapDetail} →
                        </Link>
                      )}

                      {(Boolean(roadmap.acceptedAt) ||
                        roadmap.status === "Active" ||
                        roadmap.status === "Completed") && (
                        <CoachJourneyPath
                          roadmap={{
                            ...roadmap,
                            items: roadmap.items.filter(
                              (i) => i.isReassessmentGate || i.isIncluded !== false
                            ),
                          }}
                          busy={busy}
                          isPremium={isPremium}
                          interactive
                          gateFallbackSetId={gateSetId}
                          onDrillItem={onDrillItem}
                          onReassessment={onReassessment}
                          onUpgrade={onUpgrade}
                        />
                      )}
                      {gateReadyToTake && roadmap.status === "Active" && gateSetId && (
                        <Link
                          href={`/candidate/practice/${gateSetId}?mode=coach`}
                          className="shimmer-button hr-cta-btn inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[12px] font-semibold text-white"
                        >
                          <Play size={13} />
                          {p.takeReassessment}
                        </Link>
                      )}

                      {!gateReadyToTake &&
                        (readyForReassessment || allItemsDone) &&
                        roadmap.status === "Active" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (!isPremium) {
                                onUpgrade();
                                return;
                              }
                              onReassessment(roadmap.id);
                            }}
                            className="shimmer-button hr-cta-btn inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[12px] font-semibold text-white disabled:opacity-50"
                          >
                            <RefreshCw size={13} />
                            {p.startReassessment}
                          </button>
                        )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
