"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Map, Play, RefreshCw } from "lucide-react";
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

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
  medium: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  low: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
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
  const [expandedId, setExpandedId] = useState<string | null>(
    roadmaps.find((r) => r.status === "Active")?.id ?? roadmaps[0]?.id ?? null
  );

  if (roadmaps.length === 0) return null;

  const reassessJobReady =
    jobDone(job) && (job?.purpose ?? "").toLowerCase().includes("reassess");
  const anyInferred = roadmaps.some((r) => (r.kbSource ?? "inferred") !== "system");

  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
          <Map size={14} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.roadmapsTitle}</p>
          <p className={cn("text-[11px]", portalSubtextAlt)}>{p.roadmapsSubtitle}</p>
        </div>
      </div>

      {anyInferred && (
        <div className="mx-5 mt-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/25 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-100">
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

          return (
            <div key={roadmap.id} className="px-5 py-4">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : roadmap.id)}
                className="w-full flex items-start gap-3 text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                  {SIcon ? <SIcon size={16} className={si.className} /> : <Map size={14} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-[14px] font-bold", portalHeadingAlt)}>{roadmap.skill}</p>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                        kbSystem
                          ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      )}
                    >
                      {kbSystem ? p.roadmapKbSystemBadge : p.roadmapKbInferredBadge}
                    </span>
                    {roadmap.kind === "advanced" && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {p.advancedRoadmapsTitle}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                        PRIORITY_STYLE[roadmap.priority] ?? PRIORITY_STYLE.medium
                      )}
                    >
                      {roadmap.priority} · {p.priorityScoreLabel} {roadmap.priorityScore.toFixed(1)}
                    </span>
                    {statusKey === "roadmapStatusSuggested" && (
                      <span className="text-[10px] font-semibold text-primary">
                        {p.roadmapStatusSuggested}
                      </span>
                    )}
                    {statusKey === "roadmapStatusActive" && (
                      <span className="text-[10px] font-semibold text-primary">
                        {p.roadmapStatusActive}
                      </span>
                    )}
                    {statusKey === "roadmapStatusCompleted" && (
                      <span className="text-[10px] font-semibold text-primary">
                        {p.roadmapStatusCompleted}
                      </span>
                    )}
                  </div>
                  <p className={cn("text-[12px] mt-0.5", portalSubtextAlt)}>
                    {fillTemplate(p.roadmapScoreLine, {
                      current:
                        roadmap.currentScore != null
                          ? String(Math.round(roadmap.currentScore))
                          : "—",
                      target: String(Math.round(roadmap.targetScore)),
                      gap: String(Math.round(roadmap.gap)),
                    })}
                  </p>
                  {/* SCRUM-460: thanh tiến độ skill (score + topic %) */}
                  <div className="mt-2 space-y-1.5">
                    <div
                      role="progressbar"
                      aria-valuenow={scoreProg}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          roadmap.status === "Completed" ? "bg-emerald-500" : "bg-primary"
                        )}
                        style={{ width: `${scoreProg}%` }}
                      />
                    </div>
                    <p className={cn("text-[10px] font-medium", portalSubtextAlt)}>
                      {fillTemplate(p.journeyProgress, {
                        done: String(topicProg.done),
                        total: String(topicProg.total),
                        percent: String(topicProg.percent),
                      })}
                    </p>
                  </div>
                </div>
                {expanded ? (
                  <ChevronDown size={16} className="shrink-0 mt-1" />
                ) : (
                  <ChevronRight size={16} className="shrink-0 mt-1" />
                )}
              </button>

              {expanded && (
                <div className="mt-3 ml-0 sm:ml-11 space-y-3">
                  {roadmap.explanation && !roadmap.explanation.trim().startsWith("{") && (
                    <p className={cn("text-[12px] leading-relaxed", portalSubtextAlt)}>
                      {roadmap.explanation}
                    </p>
                  )}

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
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50"
                    >
                      <Play size={12} />
                      {p.startRoadmap}
                    </button>
                  )}
                  {/* SCRUM-462: Suggested chưa Accept → không hiện CTA start/drill ở panel này */}
                  {roadmap.status === "Suggested" && !roadmap.acceptedAt ? null : (
                  <Link
                    href={`/candidate/coach/roadmaps/${roadmap.id}`}
                    className="inline-flex items-center h-8 px-3 text-[12px] font-semibold text-primary hover:underline"
                  >
                    {p.openRoadmapDetail} →
                  </Link>
                  )}

                  {(Boolean(roadmap.acceptedAt) || roadmap.status === "Active" || roadmap.status === "Completed") && (
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
                      className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-semibold text-white"
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
                        className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50"
                      >
                        <RefreshCw size={13} />
                        {p.startReassessment}
                      </button>
                    )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
