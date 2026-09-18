"use client";

import { AlertTriangle, Gauge, Layers, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type { CoachAssessment, CoachContext } from "@/features/candidate/services/coach.service";

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
      glow: "from-emerald-500/15 via-emerald-500/5 to-transparent",
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    };
  }
  if (score >= 60) {
    return {
      stroke: "#8B5CF6",
      badge:
        "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25",
      track: "bg-violet-500",
      glow: "from-violet-500/15 via-violet-500/5 to-transparent",
      icon: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
    };
  }
  if (score >= 40) {
    return {
      stroke: "#F59E0B",
      badge:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25",
      track: "bg-amber-500",
      glow: "from-amber-500/15 via-amber-500/5 to-transparent",
      icon: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    };
  }
  return {
    stroke: "#F43F5E",
    badge:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/25",
    track: "bg-rose-500",
    glow: "from-rose-500/15 via-rose-500/5 to-transparent",
    icon: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  };
}

function ReadinessRing({ score, color }: { score: number; color: string }) {
  const size = 88;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;
  const center = size / 2;

  return (
    <div className="relative w-[88px] h-[88px] shrink-0">
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
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-[22px] font-extrabold leading-none tabular-nums", portalHeadingAlt)}>
          {score}
        </span>
        <span className={cn("text-[9px] font-semibold uppercase tracking-wide mt-0.5", portalSubtextAlt)}>
          / 100
        </span>
      </div>
    </div>
  );
}

export function CoachInsightCards({ context, report }: CoachInsightCardsProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

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
    <>
      <div className="hr-glass-card relative overflow-hidden">
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
            isUnsupported
              ? "from-amber-500/10 via-transparent to-transparent"
              : "from-violet-500/15 via-sky-500/5 to-transparent"
          )}
        />
        <div className="relative px-4 pt-3.5 pb-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400 flex items-center justify-center shrink-0">
                <Layers size={14} />
              </span>
              <p className={cn("text-[11px] font-bold uppercase tracking-wide", portalSubtextAlt)}>
                {p.frameworkSidebarTitle}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0",
                isUnsupported
                  ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/25"
                  : isAdaptive
                    ? "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/25"
                    : hasCatalog
                      ? "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/25"
                      : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10"
              )}
            >
              {isAdaptive ? <Sparkles size={9} /> : isUnsupported ? <AlertTriangle size={9} /> : null}
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
            <div className="flex flex-wrap gap-1.5">
              {roleLabel && (
                <span className={cn("text-[13px] font-semibold leading-snug", portalHeadingAlt)}>
                  {roleLabel}
                </span>
              )}
              {levelLabel && (
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 dark:bg-white/10 dark:text-violet-200 dark:border-white/10">
                  {levelLabel}
                </span>
              )}
              {techLabel && (
                <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 border border-gray-100 dark:bg-white/5 dark:text-gray-300 dark:border-white/10">
                  {techLabel}
                </span>
              )}
            </div>
          ) : null}

          <p className={cn("text-[11px] leading-relaxed", portalSubtextAlt)}>
            {isUnsupported
              ? p.frameworkUnsupportedHint
              : isAdaptive
                ? p.frameworkAdaptiveHint
                : hasCatalog
                  ? p.frameworkCatalogHint
                  : p.frameworkEmpty}
          </p>
        </div>
      </div>

      <div className="hr-glass-card relative overflow-hidden">
        {tone && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
              tone.glow
            )}
          />
        )}
        <div className="relative px-4 pt-3.5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                tone?.icon ?? "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
              )}
            >
              <Gauge size={14} />
            </span>
            <p className={cn("text-[11px] font-bold uppercase tracking-wide", portalSubtextAlt)}>
              {p.readinessLabel}
            </p>
          </div>

          {readiness != null && tone ? (
            <div className="flex items-center gap-3">
              <ReadinessRing score={readiness} color={tone.stroke} />
              <div className="min-w-0 flex-1 space-y-2">
                <span
                  className={cn(
                    "inline-flex text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border",
                    tone.badge
                  )}
                >
                  {report?.readinessStatus || "—"}
                </span>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", tone.track)}
                    style={{ width: `${Math.min(100, Math.max(0, readiness))}%` }}
                  />
                </div>
                {report?.achievedLevel && (
                  <p className={cn("text-[10px] truncate", portalSubtextAlt)}>
                    {p.achievedLevelLabel}:{" "}
                    <span className={cn("font-semibold", portalHeadingAlt)}>{report.achievedLevel}</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className={cn("text-[12px] leading-relaxed", portalSubtextAlt)}>{p.readinessEmpty}</p>
          )}
        </div>
      </div>
    </>
  );
}
