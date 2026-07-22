"use client";

import { TrendingUp, Award, Target } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { FeedbackRadarChart } from "@/features/candidate/components/feedback/feedback-radar-chart";
import type { SkillAnalytics } from "@/features/candidate/utils/dashboard-analytics";

interface SkillRadarPanelProps {
  skillAnalytics: SkillAnalytics;
}

export function SkillRadarPanel({ skillAnalytics }: SkillRadarPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerDashboardPage.skills;

  const radarData = skillAnalytics.skills.map((s) => ({ skill: s.skill, score: s.score }));

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center">
      <div className="w-full md:w-[52%] shrink-0">
        <FeedbackRadarChart data={radarData} />
      </div>

      <div className="w-full md:flex-1 flex flex-col gap-3">
        {skillAnalytics.strongest && (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
              <Award size={14} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-[700] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">{p.strongest}</p>
              <p className={cn("text-[13px] font-[600] truncate", portalHeadingAlt)}>{skillAnalytics.strongest.skill}</p>
            </div>
            <span className="text-[13px] font-[800] text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
              {skillAnalytics.strongest.score}%
            </span>
          </div>
        )}

        {skillAnalytics.weakest && (
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
              <Target size={14} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-[700] uppercase tracking-wide text-amber-600 dark:text-amber-400">{p.weakest}</p>
              <p className={cn("text-[13px] font-[600] truncate", portalHeadingAlt)}>{skillAnalytics.weakest.skill}</p>
            </div>
            <span className="text-[13px] font-[800] text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
              {skillAnalytics.weakest.score}%
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 px-3 py-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
            <TrendingUp size={14} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-[700] uppercase tracking-wide text-primary">{p.mostImproved}</p>
            <p className={cn("text-[13px] font-[600] truncate", portalHeadingAlt)}>
              {skillAnalytics.mostImproved ? skillAnalytics.mostImproved.skill : p.noImprovement}
            </p>
          </div>
          {skillAnalytics.mostImproved && (
            <span className="text-[13px] font-[800] text-primary tabular-nums shrink-0">
              +{skillAnalytics.mostImproved.deltaPct}%
            </span>
          )}
        </div>

        <p className={cn("text-[11px] leading-[16px] mt-1", portalSubtextAlt)}>{p.note}</p>
      </div>
    </div>
  );
}
