"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, Flame, Loader2, Sparkles, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import type { CoachLevelCriteria, CoachWrapUp } from "@/features/candidate/services/coach.service";
import { CoachLevelCriteriaPanel } from "@/features/candidate/components/coach/coach-level-criteria";
import { localizeCoachLevel } from "@/features/candidate/components/coach/coach-labels";

interface CoachWrapUpPanelProps {
  wrapUp: CoachWrapUp;
  /** SCRUM-509: tiêu chí từ report mới nhất (wrap-up DTO không nhúng). */
  levelCriteria?: CoachLevelCriteria | null;
  promotingNextLevel?: boolean;
  onPromoteNextLevel?: () => void;
}

/** SCRUM-507: tổng kết sau khi mọi lộ trình Accepted đã reassessment. */
export function CoachWrapUpPanel({
  wrapUp,
  levelCriteria = null,
  promotingNextLevel = false,
  onPromoteNextLevel,
}: CoachWrapUpPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

  if (!wrapUp.available) {
    if (wrapUp.totalRoadmaps <= 0) return null;
    return (
      <div className="hr-glass-card space-y-3 px-5 py-4">
        <div className="space-y-2">
          <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.wrapUpTitle}</p>
          <p className={cn("text-[12px]", portalSubtextAlt)}>
            {fillTemplate(p.wrapUpProgress, {
              done: String(wrapUp.completedRoadmaps),
              total: String(wrapUp.totalRoadmaps),
            })}
          </p>
        </div>
        {levelCriteria ? <CoachLevelCriteriaPanel criteria={levelCriteria} compact /> : null}
      </div>
    );
  }

  const readiness =
    wrapUp.overallReadiness != null ? Math.round(wrapUp.overallReadiness) : null;
  const showNext =
    wrapUp.targetReadinessStatus === "READY" &&
    Boolean(wrapUp.suggestedNextLevel?.trim()) &&
    typeof onPromoteNextLevel === "function";

  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
          <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.wrapUpTitle}</p>
          <p className={cn("text-[11px]", portalSubtextAlt)}>{p.wrapUpSubtitle}</p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className={cn("text-[10px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
              {p.overallReadiness}
            </p>
            <p className={cn("mt-0.5 text-[26px] font-extrabold leading-none tabular-nums", portalHeadingAlt)}>
              {readiness ?? "—"}
              {readiness != null && <span className="text-[13px] font-medium opacity-50">%</span>}
            </p>
          </div>
          {wrapUp.achievedLevel && (
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
              {localizeCoachLevel(wrapUp.achievedLevel, p.coachLevels)}
            </span>
          )}
          {wrapUp.overallDelta != null && wrapUp.overallDelta !== 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold",
                wrapUp.overallDelta > 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
              )}
            >
              <TrendingUp size={12} />
              {fillTemplate(p.overallDelta, {
                delta:
                  wrapUp.overallDelta > 0
                    ? `+${Math.round(wrapUp.overallDelta)}`
                    : String(Math.round(wrapUp.overallDelta)),
              })}
            </span>
          )}
        </div>

        {levelCriteria ? <CoachLevelCriteriaPanel criteria={levelCriteria} compact /> : null}

        <Section
          icon={<TrendingUp size={13} className="text-emerald-600" />}
          title={p.wrapUpImprovedTitle}
          empty={p.wrapUpImprovedEmpty}
        >
          {wrapUp.improved.length > 0 ? (
            <ul className="space-y-1.5">
              {wrapUp.improved.map((row) => (
                <li
                  key={row.skill}
                  className="flex items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-[12px] dark:border-emerald-900/40 dark:bg-emerald-950/20"
                >
                  <span className={cn("font-semibold", portalHeadingAlt)}>{row.skill}</span>
                  <span className="tabular-nums text-emerald-700 dark:text-emerald-300">
                    {Math.round(row.baselineScore)} → {Math.round(row.currentScore)}{" "}
                    <span className="font-semibold">(+{Math.round(row.delta)})</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Section
            icon={<CheckCircle2 size={13} className="text-primary" />}
            title={p.wrapUpStrengthsTitle}
            empty={p.wrapUpStrengthsEmpty}
          >
            {wrapUp.strengths.length > 0 ? (
              <ul className="space-y-1.5">
                {wrapUp.strengths.map((row) => (
                  <li
                    key={row.skill}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-[12px] dark:border-gray-800"
                  >
                    <span className={cn("font-semibold", portalHeadingAlt)}>{row.skill}</span>
                    <span className={cn("tabular-nums", portalSubtextAlt)}>
                      {Math.round(row.currentScore)} / {Math.round(row.targetScore)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>

          <Section
            icon={<Flame size={13} className="text-amber-600" />}
            title={p.wrapUpWeakTitle}
            empty={p.wrapUpWeakEmpty}
          >
            {wrapUp.weakTopics.length > 0 ? (
              <ul className="space-y-1.5">
                {wrapUp.weakTopics.map((row) => (
                  <li
                    key={`${row.skill}-${row.topic}`}
                    className="rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2 text-[12px] dark:border-amber-900/40 dark:bg-amber-950/20"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("font-semibold", portalHeadingAlt)}>{row.topic}</span>
                      <span className="tabular-nums text-amber-800 dark:text-amber-200">
                        {Math.round(row.lowestScore)}
                      </span>
                    </div>
                    <p className={cn("mt-0.5 text-[11px]", portalSubtextAlt)}>
                      {row.skill}
                      {row.overcame ? ` · ${p.wrapUpWeakOvercame}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>
        </div>

        <Section
          icon={<Target size={13} className="text-violet-600" />}
          title={p.wrapUpNextTitle}
          empty={p.wrapUpNextEmpty}
        >
          {wrapUp.nextSkills.length > 0 ? (
            <ul className="space-y-1.5">
              {wrapUp.nextSkills.map((row) => (
                <li
                  key={row.skill}
                  className="flex items-center justify-between gap-2 rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2 text-[12px] dark:border-violet-900/40 dark:bg-violet-950/20"
                >
                  <div className="min-w-0">
                    <p className={cn("font-semibold", portalHeadingAlt)}>{row.skill}</p>
                    <p className={cn("text-[11px]", portalSubtextAlt)}>
                      {row.reason === "screening" ? p.wrapUpNextScreening : p.wrapUpNextGap}
                    </p>
                  </div>
                  {row.gap > 0 && (
                    <span className={cn("shrink-0 tabular-nums", portalSubtextAlt)}>
                      −{Math.round(row.gap)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        {showNext && wrapUp.suggestedNextLevel && (
          <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 px-3.5 py-3">
            <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
              {fillTemplate(p.nextLevelTitle, {
                current: "—",
                next: wrapUp.suggestedNextLevel,
              })}
            </p>
            <p className={cn("text-[11px] leading-snug", portalSubtextAlt)}>
              {wrapUp.suggestedNextLevelMessage ||
                fillTemplate(p.nextLevelBody, {
                  current: "—",
                  next: wrapUp.suggestedNextLevel,
                })}
            </p>
            <button
              type="button"
              disabled={promotingNextLevel || !wrapUp.suggestedNextLevelAvailable}
              onClick={() => onPromoteNextLevel?.()}
              className="hr-cta-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {promotingNextLevel ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ArrowUpRight size={13} />
              )}
              {fillTemplate(p.nextLevelCta, { next: wrapUp.suggestedNextLevel })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  empty,
  children,
}: {
  icon: ReactNode;
  title: string;
  empty: string;
  children: ReactNode | null;
}) {
  const hasBody = children != null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className={cn("text-[11px] font-bold uppercase tracking-wide", portalSubtextAlt)}>{title}</p>
      </div>
      {hasBody ? children : <p className={cn("text-[12px]", portalSubtextAlt)}>{empty}</p>}
    </div>
  );
}
