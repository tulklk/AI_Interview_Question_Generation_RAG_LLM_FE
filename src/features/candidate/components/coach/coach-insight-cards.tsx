"use client";

import { AlertTriangle, Gauge, Layers, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type { CoachAssessment, CoachContext } from "@/features/candidate/services/coach.service";
import { fadeUp, motionSafe } from "@/features/candidate/components/coach/coach-motion";

interface CoachInsightCardsProps {
  context: CoachContext | null;
  report: CoachAssessment | null;
}

function readinessTone(score: number) {
  if (score >= 80) {
    return {
      stroke: "#10B981",
      badge:
        "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
      track: "bg-emerald-500",
    };
  }
  if (score >= 60) {
    return {
      stroke: "#8B5CF6",
      badge:
        "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25",
      track: "bg-violet-500",
    };
  }
  if (score >= 40) {
    return {
      stroke: "#F59E0B",
      badge:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
      track: "bg-amber-500",
    };
  }
  return {
    stroke: "#F43F5E",
    badge:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/25",
    track: "bg-rose-500",
  };
}

function ReadinessRing({ score, color }: { score: number; color: string }) {
  const size = 52;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;
  const center = size / 2;

  return (
    <div className="relative h-13 w-13 shrink-0">
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-white/10"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-[13px] font-bold leading-none tabular-nums", portalHeadingAlt)}>
          {score}
        </span>
      </div>
    </div>
  );
}

export function CoachInsightCards({ context, report }: CoachInsightCardsProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const reduced = useReducedMotion();
  const safe = motionSafe(reduced);

  const mode = context?.resolutionMode;
  const hasCatalog = Boolean(context?.matchedFrameworkId);
  const isAdaptive = mode === "ADAPTIVE" && !hasCatalog;
  const isUnsupported = mode === "UNSUPPORTED" && !hasCatalog;

  const roleLabel =
    context?.matchedFrameworkRole ||
    context?.roleFamilyDisplay ||
    context?.targetRole ||
    null;
  const levelLabel = context?.matchedFrameworkLevel || context?.targetLevel || null;
  const techLabel = context?.matchedFrameworkTechnology || null;

  const readiness = report?.overallReadiness != null ? Math.round(report.overallReadiness) : null;
  const tone = readiness != null ? readinessTone(readiness) : null;

  return (
    <motion.div className="hr-glass-card overflow-hidden" variants={fadeUp} {...safe}>
      <div className="space-y-3 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-[11px] font-bold uppercase tracking-wide", portalSubtextAlt)}>
            {p.coachingProfileTitle}
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide shrink-0",
              isUnsupported
                ? "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300"
                : isAdaptive
                  ? "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/15 dark:text-violet-300"
                  : hasCatalog
                    ? "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300"
                    : "border-gray-200 bg-gray-100 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
            )}
          >
            {isAdaptive ? <Sparkles size={9} /> : isUnsupported ? <AlertTriangle size={9} /> : <Layers size={9} />}
            {isUnsupported
              ? p.frameworkUnsupportedBadge
              : isAdaptive
                ? p.frameworkAdaptiveBadge
                : hasCatalog
                  ? p.frameworkCatalogBadge
                  : "—"}
          </span>
        </div>

        {roleLabel || levelLabel ? (
          <div className="min-w-0">
            {roleLabel && (
              <p className={cn("text-[14px] font-semibold leading-snug", portalHeadingAlt)}>{roleLabel}</p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {levelLabel && (
                <span className="inline-flex items-center rounded-md border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:border-white/10 dark:bg-white/10 dark:text-violet-200">
                  {levelLabel}
                </span>
              )}
              {techLabel && (
                <span className="inline-flex items-center rounded-md border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                  {techLabel}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className={cn("text-[12px]", portalSubtextAlt)}>{p.frameworkEmpty}</p>
        )}

        <p className={cn("text-[11px] leading-snug", portalSubtextAlt)}>
          {isUnsupported
            ? p.frameworkUnsupportedHint
            : isAdaptive
              ? p.frameworkAdaptiveHint
              : hasCatalog
                ? p.frameworkCatalogHint
                : null}
        </p>

        <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="mb-2 flex items-center gap-1.5">
            <Gauge size={13} className="text-gray-400" />
            <p className={cn("text-[11px] font-bold uppercase tracking-wide", portalSubtextAlt)}>
              {p.readinessLabel}
            </p>
          </div>

          {readiness != null && tone ? (
            <div className="flex items-center gap-3">
              <ReadinessRing score={readiness} color={tone.stroke} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    tone.badge
                  )}
                >
                  {report?.readinessStatus || "—"}
                </span>
                <div className="h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", tone.track)}
                    style={{ width: `${Math.min(100, Math.max(0, readiness))}%` }}
                  />
                </div>
                {report?.achievedLevel && (
                  <p className={cn("truncate text-[10px]", portalSubtextAlt)}>
                    {p.achievedLevelLabel}:{" "}
                    <span className={cn("font-semibold", portalHeadingAlt)}>{report.achievedLevel}</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className={cn("text-[12px] leading-snug", portalSubtextAlt)}>{p.readinessEmpty}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
