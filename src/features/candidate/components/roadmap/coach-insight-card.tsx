"use client";

import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { COACH_INSIGHT } from "@/features/candidate/data/roadmap-dummy";

type CoachInsightData = typeof COACH_INSIGHT;

interface CoachInsightCardProps {
  insight: CoachInsightData;
}

export function CoachInsightCard({ insight }: CoachInsightCardProps) {
  return (
    <div className="hr-glass-card p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles size={14} className="text-primary" />
        </div>
        <h2 className={cn("text-[15px] font-bold", portalHeadingAlt)}>
          AI Coach nhận xét
        </h2>
      </div>

      {/* Insight text */}
      <p className={cn("text-[13px] leading-[20px] mb-4", portalSubtextAlt)}>
        {insight.body}
      </p>

      {/* CTA */}
      <Link
        href="/candidate/coach"
        className="inline-flex items-center gap-1.5 text-[12px] font-[700] text-primary hover:text-primary-hover transition-colors"
      >
        Xem đề xuất từ AI Coach
        <ChevronRight size={13} />
      </Link>
    </div>
  );
}
