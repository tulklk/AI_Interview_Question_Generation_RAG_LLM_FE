"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, Info, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import type { CoachAssessment, CoachSkillResult } from "@/features/candidate/services/coach.service";
import {
  fadeIn,
  motionSafe,
  staggerContainer,
  staggerItem,
} from "@/features/candidate/components/coach/coach-motion";

const BAND_BAR: Record<string, string> = {
  strength: "bg-emerald-500",
  needs_improvement: "bg-primary/70",
  critical_gap: "bg-amber-500",
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
  const reduced = useReducedMotion();
  const safe = motionSafe(reduced);

  const readiness = report.overallReadiness != null ? Math.round(report.overallReadiness) : null;
  const delta = report.overallDelta;
  const nextLevel = report.suggestedNextLevel?.trim() || null;
  const showNextCta =
    report.targetReadinessStatus === "READY" && !!nextLevel && typeof onPromoteNextLevel === "function";

  const { atTarget, belowTarget, allZero } = useMemo(() => {
    const skills = report.skills;
    const at = skills.filter((s) => s.skillScore >= s.targetScore).length;
    return {
      atTarget: at,
      belowTarget: Math.max(0, skills.length - at),
      allZero: skills.length > 0 && skills.every((s) => s.skillScore <= 0),
    };
  }, [report.skills]);

  const shortExplanation = useMemo(() => {
    const raw = report.levelExplanation?.trim();
    if (!raw || looksLikeJson(raw)) return null;
    const sentences = raw.split(/(?<=[.!?。])\s+/).filter(Boolean);
    return sentences.slice(0, 2).join(" ");
  }, [report.levelExplanation]);

  async function confirmPromote() {
    if (!onPromoteNextLevel) return;
    await onPromoteNextLevel();
    setConfirmOpen(false);
  }

  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <BarChart3 size={14} className="text-primary" />
        </div>
        <div>
          <p className={cn("text-[14px] font-semibold", portalHeadingAlt)}>{p.reportTitle}</p>
          <p className={cn("text-[11px]", portalSubtextAlt)}>{p.reportSubtitle}</p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <p className={cn("text-[10px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                  {p.overallReadiness}
                </p>
                <p className={cn("mt-0.5 text-[28px] font-extrabold leading-none tabular-nums", portalHeadingAlt)}>
                  {readiness ?? "—"}
                  {readiness != null && <span className="text-[14px] font-medium opacity-50">%</span>}
                </p>
              </div>
              {report.readinessStatus && (
                <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                  {report.readinessStatus}
                </span>
              )}
              {delta != null && delta !== 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold",
                    delta > 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                  )}
                >
                  {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {fillTemplate(p.overallDelta, {
                    delta: delta > 0 ? `+${Math.round(delta)}` : String(Math.round(delta)),
                  })}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
                <p className={cn("text-[10px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                  {p.reportTargetLabel}
                </p>
                <p className={cn("mt-0.5 font-semibold", portalHeadingAlt)}>
                  {report.targetLevel || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
                <p className={cn("text-[10px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                  {p.reportSkillsSummaryLabel}
                </p>
                <p className={cn("mt-0.5 font-semibold tabular-nums", portalHeadingAlt)}>
                  {fillTemplate(p.reportSkillsAtTarget, {
                    at: String(atTarget),
                    total: String(report.skills.length),
                  })}
                </p>
                {belowTarget > 0 && (
                  <p className={cn("mt-0.5 text-[10px]", portalSubtextAlt)}>
                    {fillTemplate(p.reportSkillsBelow, { count: String(belowTarget) })}
                  </p>
                )}
              </div>
            </div>

            {report.achievedLevel && (
              <p className={cn("text-[12px]", portalSubtextAlt)}>
                {p.achievedLevelLabel}:{" "}
                <span className={cn("font-semibold", portalHeadingAlt)}>{report.achievedLevel}</span>
              </p>
            )}

            {shortExplanation && (
              <p className={cn("text-[12px] leading-snug", portalSubtextAlt)}>{shortExplanation}</p>
            )}

            {allZero && (
              <div className="flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[11px] leading-snug text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100">
                <Info size={14} className="mt-0.5 shrink-0" />
                <span>{p.reportAllZeroHint}</span>
              </div>
            )}
          </div>

          {report.skills.length >= 3 && (
            <motion.div
              className="flex justify-center lg:justify-end"
              variants={fadeIn}
              {...safe}
            >
              <SkillRadar
                skills={report.skills}
                currentLabel={p.radarCurrent}
                targetLabel={p.radarTarget}
              />
            </motion.div>
          )}
        </div>

        {showNextCta && nextLevel && (
          <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-3">
            <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
              {fillTemplate(p.nextLevelTitle, {
                current: report.targetLevel || "—",
                next: nextLevel,
              })}
            </p>
            <p className={cn("text-[11px] leading-snug", portalSubtextAlt)}>
              {report.suggestedNextLevelMessage ||
                fillTemplate(p.nextLevelBody, {
                  current: report.targetLevel || "—",
                  next: nextLevel,
                })}
            </p>
            {confirmOpen ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <p className={cn("w-full text-[11px]", portalSubtextAlt)}>
                  {fillTemplate(p.nextLevelConfirm, { next: nextLevel })}
                </p>
                <button
                  type="button"
                  disabled={promotingNextLevel || !report.suggestedNextLevelAvailable}
                  onClick={() => void confirmPromote()}
                  className="hr-cta-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  {promotingNextLevel ? <Loader2 size={13} className="animate-spin" /> : <ArrowUpRight size={13} />}
                  {p.nextLevelConfirmYes}
                </button>
                <button
                  type="button"
                  disabled={promotingNextLevel}
                  onClick={() => setConfirmOpen(false)}
                  className="inline-flex h-8 items-center rounded-lg border border-gray-200 px-3 text-[12px] font-semibold disabled:opacity-50 dark:border-gray-700"
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
                className="hr-cta-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                <ArrowUpRight size={13} />
                {fillTemplate(p.nextLevelCta, { next: nextLevel })}
              </button>
            )}
          </div>
        )}

        <div>
          <p className={cn("mb-2.5 text-[11px] font-bold uppercase tracking-wide", portalSubtextAlt)}>
            {p.reportSkillGapsTitle}
          </p>
          <motion.div
            className="space-y-2.5"
            variants={staggerContainer}
            {...safe}
          >
            {report.skills.map((skill) => (
              <motion.div key={skill.skill} variants={staggerItem}>
                <SkillProgressRow skill={skill} gapLabel={p.gapPoints} />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {report.explanation && !looksLikeJson(report.explanation) && (
          <p
            className={cn(
              "border-t border-gray-100 pt-3 text-[12px] leading-snug dark:border-gray-800",
              portalSubtextAlt
            )}
          >
            {report.explanation}
          </p>
        )}
      </div>
    </div>
  );
}

function SkillProgressRow({
  skill,
  gapLabel,
}: {
  skill: CoachSkillResult;
  gapLabel: string;
}) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const pct =
    skill.targetScore > 0
      ? Math.min(100, Math.round((skill.skillScore / skill.targetScore) * 100))
      : 0;
  const bar = BAND_BAR[skill.band] ?? BAND_BAR.needs_improvement;
  const si = getSkillIcon(skill.skill);
  const SIcon = si?.icon;
  const atTarget = skill.skillScore >= skill.targetScore;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {SIcon && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-50 dark:bg-gray-800">
              <SIcon size={12} className={si.className} />
            </span>
          )}
          <span className={cn("truncate text-[13px] font-semibold", portalHeadingAlt)}>{skill.skill}</span>
        </div>
        <span className={cn("shrink-0 text-[12px] tabular-nums font-medium", portalHeadingAlt)}>
          {Math.round(skill.skillScore)} / {Math.round(skill.targetScore)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn("h-full rounded-full transition-all duration-500", atTarget ? "bg-emerald-500" : bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {skill.gap > 0 && (
        <p className={cn("mt-0.5 text-[10px]", portalSubtextAlt)}>
          {fillTemplate(gapLabel, { points: String(Math.round(skill.gap)) })}
        </p>
      )}
      {/* keep band accessible as text without noisy badges */}
      <span className="sr-only">
        {skill.band === "strength"
          ? p.bandStrength
          : skill.band === "critical_gap"
            ? p.bandCritical
            : p.bandNeedsImprovement}
      </span>
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
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 180 180" className="h-36 w-36 shrink-0 sm:h-40 sm:w-40">
        {grid.map((pts) => (
          <polygon
            key={pts}
            points={pts}
            fill="none"
            className="stroke-gray-200 dark:stroke-gray-700"
            strokeWidth="1"
          />
        ))}
        <polygon points={target} fill="rgba(99,102,241,0.12)" className="stroke-indigo-400" strokeWidth="1.5" />
        <polygon points={current} fill="rgba(16,185,129,0.18)" className="stroke-emerald-500" strokeWidth="1.5" />
      </svg>
      <div className="flex gap-3 text-[10px]">
        <span className="text-emerald-600">{currentLabel}</span>
        <span className="text-indigo-500">{targetLabel}</span>
      </div>
    </div>
  );
}
