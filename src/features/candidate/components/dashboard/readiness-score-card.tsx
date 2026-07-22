"use client";

import { useEffect, useState } from "react";
import { animate } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { ReadinessResult } from "@/features/candidate/utils/dashboard-analytics";
import { useLanguage } from "@/shared/providers/language-context";

const LEVEL_COLOR: Record<string, string> = {
  needsWork: "#F43F5E",
  developing: "#F59E0B",
  ready: "#7C3AED",
  veryReady: "#10B981",
};

function Ring({ score, color }: { score: number; color: string }) {
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, score, { duration: 1, ease: "easeOut", onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [score]);

  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
      <svg width="112" height="112" className="-rotate-90">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth="9" />
        <circle
          cx="56" cy="56" r={radius} fill="none"
          stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-[26px] font-[800] leading-none tabular-nums", portalHeadingAlt)}>{display}</span>
        <span className={cn("text-[10px] font-[500]", portalSubtextAlt)}>/ 100</span>
      </div>
    </div>
  );
}

const FACTOR_LABEL_KEY: Record<string, "averageScore" | "consistency" | "stability" | "frequency"> = {
  averageScore: "averageScore",
  consistency: "consistency",
  stability: "stability",
  frequency: "frequency",
};

interface ReadinessScoreCardProps {
  readiness: ReadinessResult;
  loading: boolean;
}

export function ReadinessScoreCard({ readiness, loading }: ReadinessScoreCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerDashboardPage.readiness;

  if (loading) {
    return (
      <div className="hr-stat-card p-5 h-full flex items-center gap-4">
        <Skeleton className="w-28 h-28 rounded-full shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    );
  }

  if (readiness.score === null) {
    return (
      <div className="hr-stat-card p-5 h-full flex flex-col items-center justify-center text-center gap-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
          <Sparkles size={18} className="text-primary" />
        </div>
        <p className={cn("text-[13px] font-[700]", portalHeadingAlt)}>{p.title}</p>
        <p className={cn("text-[12px] leading-[17px]", portalSubtextAlt)}>{p.insufficientData}</p>
      </div>
    );
  }

  const color = LEVEL_COLOR[readiness.level];
  const levelLabel = p.levels[readiness.level as keyof typeof p.levels];

  return (
    <div className="hr-stat-card p-5 h-full flex flex-col">
      <div className="flex items-center gap-4">
        <Ring score={readiness.score} color={color} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-[12px] font-[600] mb-1", portalSubtextAlt)}>{p.title}</p>
          <p className="text-[15px] font-[800] mb-2" style={{ color }}>{levelLabel}</p>
          <p className={cn("text-[11px] leading-[16px]", portalSubtextAlt)}>{p.explainer}</p>
        </div>
      </div>

      {readiness.factors.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {readiness.factors.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-2">
              <span className={cn("text-[11px] truncate", portalSubtextAlt)}>{p.factors[FACTOR_LABEL_KEY[f.key]]}</span>
              <span className={cn("text-[11px] font-[700] tabular-nums shrink-0", portalHeadingAlt)}>{Math.round(f.value)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
