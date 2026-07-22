"use client";

import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate, type CoachRecommendation } from "@/features/candidate/utils/dashboard-analytics";
import { Skeleton } from "@/shared/components/ui/skeleton";

const PRIORITY_CLASS: Record<CoachRecommendation["priority"], string> = {
  high: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400",
  medium: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  low: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
};

interface AiCoachPanelProps {
  recommendations: CoachRecommendation[];
  loading: boolean;
}

export function AiCoachPanel({ recommendations, loading }: AiCoachPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerDashboardPage.coach;

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="hr-quick-generate rounded-xl p-4 flex flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {recommendations.map((rec) => (
        <div key={rec.id} className="hr-quick-generate rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("text-[10px] font-[700] px-2 py-0.5 rounded-full", PRIORITY_CLASS[rec.priority])}>
              {p.priorityLabels[rec.priority]}
            </span>
            <span className={cn("flex items-center gap-1 text-[11px]", portalSubtextAlt)}>
              <Clock size={10} />
              {fillTemplate(p.estimatedMinutes, { minutes: String(rec.estimatedMinutes) })}
            </span>
          </div>
          <p className={cn("text-[13px] leading-[19px] mb-2.5", portalHeadingAlt)}>
            {fillTemplate((p.evidence as Record<string, string>)[rec.evidenceKey] ?? "", rec.tokens)}
          </p>
          <p className={cn("text-[12px] leading-[18px] mb-3", portalSubtextAlt)}>
            {fillTemplate((p.action as Record<string, string>)[rec.actionKey] ?? "", rec.tokens)}
          </p>
          <Link
            href={rec.ctaHref}
            className="inline-flex items-center gap-1.5 text-[12px] font-[600] text-primary hover:text-primary-hover transition-colors"
          >
            {p.ctaLabel}
            <ChevronRight size={12} />
          </Link>
        </div>
      ))}
    </div>
  );
}
