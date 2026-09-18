"use client";

import { useState } from "react";
import { ArrowUpRight, BarChart3, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import type { CoachAssessment, CoachSkillResult } from "@/features/candidate/services/coach.service";

const BAND_STYLE: Record<string, { bar: string; badge: string; labelKey: "bandStrength" | "bandNeedsImprovement" | "bandCritical" }> = {
  strength: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
    labelKey: "bandStrength",
  },
  needs_improvement: {
    bar: "bg-amber-400",
    badge: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
    labelKey: "bandNeedsImprovement",
  },
  critical_gap: {
    bar: "bg-red-500",
    badge: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
    labelKey: "bandCritical",
  },
};

interface CoachReportPanelProps {
  report: CoachAssessment;
  promotingNextLevel?: boolean;
  onPromoteNextLevel?: () => Promise<void> | void;
}

export function CoachReportPanel({
  report,
  promotingNextLevel = false,
  onPromoteNextLevel,
}: CoachReportPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const strengths = report.skills.filter((s) => s.band === "strength");
  const critical = report.skills.filter((s) => s.band === "critical_gap");
  const readiness = report.overallReadiness != null ? Math.round(report.overallReadiness) : null;
  const delta = report.overallDelta;
  const nextLevel = report.suggestedNextLevel?.trim() || null;
  const showNextCta =
    report.targetReadinessStatus === "READY" && !!nextLevel && typeof onPromoteNextLevel === "function";

  async function confirmPromote() {
    if (!onPromoteNextLevel) return;
    await onPromoteNextLevel();
    setConfirmOpen(false);
  }

  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
          <BarChart3 size={14} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.reportTitle}</p>
          <p className={cn("text-[11px]", portalSubtextAlt)}>{p.reportSubtitle}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className={cn("text-[11px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
              {p.overallReadiness}
            </p>
            <p className={cn("text-[32px] font-extrabold leading-none mt-1 tabular-nums", portalHeadingAlt)}>
              {readiness ?? "—"}
              {readiness != null && <span className="text-[16px] font-medium opacity-50">%</span>}
            </p>
          </div>
          {report.readinessStatus && (
            <span className="inline-flex text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-primary/10 text-primary">
              {report.readinessStatus}
            </span>
          )}
          {delta != null && delta !== 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-md",
                delta > 0
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
              )}
            >
              {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {fillTemplate(p.overallDelta, { delta: delta > 0 ? `+${Math.round(delta)}` : String(Math.round(delta)) })}
            </span>
          )}
        </div>

        {(report.targetLevel || report.targetReadinessStatus || report.achievedLevel) && (
          <div className="rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2.5 space-y-1.5">
            <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
              {p.readinessTowardTarget}
              {report.targetLevel ? ` (${report.targetLevel})` : ""}
            </p>
            {report.achievedLevel && (
              <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
                {p.achievedLevelLabel}:{" "}
                <span className="text-primary">{report.achievedLevel}</span>
              </p>
            )}
            {report.targetReadinessStatus && (
              <p className={cn("text-[11px] font-semibold", portalSubtextAlt)}>
                {report.targetReadinessStatus === "READY" ? p.targetReadinessReady : p.targetReadinessNotReady}
                {report.readinessPercent != null ? ` · ${Math.round(report.readinessPercent)}%` : ""}
              </p>
            )}
            {report.estimatedBand && (
              <p className={cn("text-[11px]", portalSubtextAlt)}>
                {p.estimatedBandReference}: {report.estimatedBand}
              </p>
            )}
            {report.levelExplanation && (
              <p className={cn("text-[11px] leading-relaxed", portalSubtextAlt)}>{report.levelExplanation}</p>
            )}
          </div>
        )}

        {showNextCta && nextLevel && (
          <div className="rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-3 space-y-2">
            <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
              {fillTemplate(p.nextLevelTitle, {
                current: report.targetLevel || "—",
                next: nextLevel,
              })}
            </p>
            <p className={cn("text-[11px] leading-relaxed", portalSubtextAlt)}>
              {report.suggestedNextLevelMessage ||
                fillTemplate(p.nextLevelBody, {
                  current: report.targetLevel || "—",
                  next: nextLevel,
                })}
            </p>
            {confirmOpen ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <p className={cn("text-[11px] w-full", portalSubtextAlt)}>
                  {fillTemplate(p.nextLevelConfirm, { next: nextLevel })}
                </p>
                <button
                  type="button"
                  disabled={promotingNextLevel || !report.suggestedNextLevelAvailable}
                  onClick={() => void confirmPromote()}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-white hr-cta-btn disabled:opacity-50"
                >
                  {promotingNextLevel ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpRight size={13} />}
                  {p.nextLevelConfirmYes}
                </button>
                <button
                  type="button"
                  disabled={promotingNextLevel}
                  onClick={() => setConfirmOpen(false)}
                  className="inline-flex items-center h-8 px-3 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                >
                  {p.nextLevelConfirmNo}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={promotingNextLevel || !report.suggestedNextLevelAvailable}
                title={
                  report.suggestedNextLevelAvailable
                    ? undefined
                    : report.suggestedNextLevelMessage || p.nextLevelUnavailable
                }
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-white hr-cta-btn disabled:opacity-50"
              >
                <ArrowUpRight size={13} />
                {fillTemplate(p.nextLevelCta, { next: nextLevel })}
              </button>
            )}
            {!report.suggestedNextLevelAvailable && (
              <p className={cn("text-[11px]", portalSubtextAlt)}>
                {report.suggestedNextLevelMessage || p.nextLevelUnavailable}
              </p>
            )}
          </div>
        )}

        {report.previousOverallReadiness != null && report.overallReadiness != null && (
          <p className={cn("text-[11px]", portalSubtextAlt)}>
            {Math.round(report.previousOverallReadiness)} → {Math.round(report.overallReadiness)}
            {report.overallDelta != null
              ? ` (${report.overallDelta > 0 ? "+" : ""}${Math.round(report.overallDelta)})`
              : ""}
          </p>
        )}

        {report.skills.length >= 3 && (
          <SkillRadar skills={report.skills} currentLabel={p.radarCurrent} targetLabel={p.radarTarget} />
        )}

        <div className="space-y-3">
          {report.skills.map((skill) => {
            const style = BAND_STYLE[skill.band] ?? BAND_STYLE.needs_improvement;
            const pct = skill.targetScore > 0
              ? Math.min(100, Math.round((skill.skillScore / skill.targetScore) * 100))
              : 0;
            const si = getSkillIcon(skill.skill);
            const SIcon = si?.icon;

            return (
              <div key={skill.skill}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {SIcon && (
                      <span className="w-6 h-6 rounded-md bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <SIcon size={12} className={si.className} />
                      </span>
                    )}
                    <span className={cn("text-[13px] font-semibold truncate", portalHeadingAlt)}>
                      {skill.skill}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-[11px] tabular-nums", portalSubtextAlt)}>
                      {Math.round(skill.skillScore)}/{Math.round(skill.targetScore)}
                    </span>
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", style.badge)}>
                      {p[style.labelKey]}
                    </span>
                    {skill.demonstratedDifficulty && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                        {p.demonstratedLabel}: {skill.demonstratedDifficulty}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", style.bar)} style={{ width: `${pct}%` }} />
                </div>
                {skill.gap > 0 && (
                  <p className={cn("text-[10px] mt-0.5", portalSubtextAlt)}>
                    {fillTemplate(p.gapPoints, { points: String(Math.round(skill.gap)) })}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-2">
              {p.strengthsTitle}
            </p>
            {strengths.length === 0 ? (
              <p className={cn("text-[12px]", portalSubtextAlt)}>{p.noStrengths}</p>
            ) : (
              <ul className="space-y-1">
                {strengths.map((s) => (
                  <li key={s.skill} className="text-[12px] font-medium text-emerald-800 dark:text-emerald-200">
                    {s.skill}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-red-100 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-red-700 dark:text-red-400 mb-2">
              {p.criticalGapsTitle}
            </p>
            {critical.length === 0 ? (
              <p className={cn("text-[12px]", portalSubtextAlt)}>{p.noCriticalGaps}</p>
            ) : (
              <ul className="space-y-1">
                {critical.map((s) => (
                  <li key={s.skill} className="text-[12px] font-medium text-red-800 dark:text-red-200">
                    {s.skill}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {report.explanation && !looksLikeJson(report.explanation) && (
          <p className={cn("text-[12px] leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3", portalSubtextAlt)}>
            {report.explanation}
          </p>
        )}
      </div>
    </div>
  );
}

function looksLikeJson(text: string): boolean {
  const t = text.trim();
  return t.startsWith("{") || t.startsWith("[");
}

function SkillRadar({
  skills,
  currentLabel,
  targetLabel,
}: {
  skills: CoachSkillResult[];
  currentLabel: string;
  targetLabel: string;
}) {
  const slice = skills.slice(0, 6);
  const cx = 90;
  const cy = 90;
  const r = 70;
  const toPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / slice.length - Math.PI / 2;
    const radius = (Math.min(100, Math.max(0, value)) / 100) * r;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  };
  const current = slice.map((s, i) => toPoint(i, s.skillScore)).join(" ");
  const target = slice.map((s, i) => toPoint(i, s.targetScore)).join(" ");
  const grid = [0.25, 0.5, 0.75, 1].map((scale) =>
    slice.map((_, i) => toPoint(i, scale * 100)).join(" ")
  );

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <svg viewBox="0 0 180 180" className="w-40 h-40 shrink-0">
        {grid.map((pts) => (
          <polygon key={pts} points={pts} fill="none" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1" />
        ))}
        <polygon points={target} fill="rgba(99,102,241,0.12)" className="stroke-indigo-400" strokeWidth="1.5" />
        <polygon points={current} fill="rgba(16,185,129,0.18)" className="stroke-emerald-500" strokeWidth="1.5" />
      </svg>
      <ul className="text-[11px] space-y-1">
        {slice.map((s) => (
          <li key={s.skill}>
            {s.skill}: {Math.round(s.skillScore)} / {Math.round(s.targetScore)}
          </li>
        ))}
        <li className="text-emerald-600">{currentLabel}</li>
        <li className="text-indigo-500">{targetLabel}</li>
      </ul>
    </div>
  );
}
