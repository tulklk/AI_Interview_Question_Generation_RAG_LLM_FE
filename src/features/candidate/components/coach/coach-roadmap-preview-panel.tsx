"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Map } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import type { CoachRoadmap } from "@/features/candidate/services/coach.service";

interface CoachRoadmapPreviewPanelProps {
  roadmaps: CoachRoadmap[];
  busy?: boolean;
  accepting?: boolean;
  onToggleItem: (itemId: string, isIncluded: boolean) => void | Promise<void>;
  onAccept: () => void | Promise<void>;
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
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  const draftRoadmaps = useMemo(
    () =>
      roadmaps.filter(
        (r) => r.status === "Suggested" && !r.acceptedAt
      ),
    [roadmaps]
  );

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

  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
          <Map size={14} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>
            {p.roadmapPreviewTitle}
          </p>
          <p className={cn("text-[11px]", portalSubtextAlt)}>{p.roadmapPreviewSubtitle}</p>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
          {fillTemplate(p.roadmapPreviewSummary, {
            skills: String(summary.skills),
            topics: String(summary.topics),
          })}
        </p>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {draftRoadmaps.map((roadmap) => {
          const si = getSkillIcon(roadmap.skill);
          const SIcon = si?.icon;
          const outside = roadmap.skillSource === "outsideCv";
          const topics = roadmap.items
            .filter((i) => !i.isReassessmentGate)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          return (
            <div key={roadmap.id} className="px-5 py-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                  {SIcon ? <SIcon size={16} className={si.className} /> : <Map size={14} />}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-[14px] font-bold", portalHeadingAlt)}>{roadmap.skill}</p>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                        outside
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                      )}
                    >
                      {outside ? p.roadmapSkillOutsideCv : p.roadmapSkillFromCv}
                    </span>
                  </div>
                  {outside && roadmap.outsideCvReason && (
                    <p className={cn("text-[11px] leading-relaxed", portalSubtextAlt)}>
                      {roadmap.outsideCvReason}
                    </p>
                  )}
                  {roadmap.explanation && (
                    <p className={cn("text-[11px] leading-relaxed", portalSubtextAlt)}>
                      {roadmap.explanation}
                    </p>
                  )}
                </div>
              </div>

              <ul className="space-y-2 ml-0 sm:ml-11">
                {topics.map((item) => {
                  const checked = item.isIncluded !== false;
                  const toggling = pendingItemId === item.id;
                  return (
                    <li key={item.id} className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/40"
                        checked={checked}
                        disabled={busy || accepting || toggling}
                        onChange={(e) => void handleToggle(item.id, e.target.checked)}
                        aria-label={item.topic}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-[12px] font-medium",
                            checked ? portalHeadingAlt : "text-gray-400 line-through"
                          )}
                        >
                          {item.topic}
                        </p>
                        {item.topicReason && (
                          <p className={cn("text-[10px] mt-0.5", portalSubtextAlt)}>
                            {item.topicReason}
                          </p>
                        )}
                      </div>
                      {toggling && <Loader2 size={12} className="animate-spin text-primary mt-1" />}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        {!canAccept && summary.skills === 0 && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300">{p.roadmapAcceptMinOneSkill}</p>
        )}
        <button
          type="button"
          disabled={!canAccept}
          onClick={() => void onAccept()}
          className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {accepting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {p.roadmapAcceptCta}
        </button>
      </div>
    </div>
  );
}
