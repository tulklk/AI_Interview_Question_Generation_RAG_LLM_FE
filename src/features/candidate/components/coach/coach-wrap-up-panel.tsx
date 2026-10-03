"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, Flame, Loader2, Sparkles, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import type { CoachWrapUp } from "@/features/candidate/services/coach.service";
import { localizeCoachLevel } from "@/features/candidate/components/coach/coach-labels";

interface CoachWrapUpPanelProps {
  wrapUp: CoachWrapUp;
  promotingNextLevel?: boolean;
  onPromoteNextLevel?: () => void;
}

/** SCRUM-507 / SCRUM-514: tổng kết sau reassessment — skill + câu, không dump tiêu chí level. */
export function CoachWrapUpPanel({
  wrapUp,
  promotingNextLevel = false,
  onPromoteNextLevel,
}: CoachWrapUpPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

  if (!wrapUp.available) {
    if (wrapUp.totalRoadmaps <= 0) return null;
    return (
      <div className="hr-glass-card space-y-2 px-5 py-4">
        <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.wrapUpTitle}</p>
        <p className={cn("text-[12px]", portalSubtextAlt)}>
          {fillTemplate(p.wrapUpProgress, {
            done: String(wrapUp.completedRoadmaps),
            total: String(wrapUp.totalRoadmaps),
          })}
        </p>
      </div>
    );
  }

  const readiness =
    wrapUp.overallReadiness != null ? Math.round(wrapUp.overallReadiness) : null;
  const showNext =
    wrapUp.targetReadinessStatus === "READY" &&
    Boolean(wrapUp.suggestedNextLevel?.trim()) &&
    typeof onPromoteNextLevel === "function";
  const neitherWeakNorNext = wrapUp.weakTopics.length === 0 && wrapUp.nextSkills.length === 0;

  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
          <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.wrapUpTitle}</p>
          <p className={cn("text-[11px]", portalSubtextAlt)}>{p.wrapUpSubtitle}</p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {(readiness != null || wrapUp.achievedLevel || (wrapUp.overallDelta != null && wrapUp.overallDelta !== 0)) && (
          <p className={cn("text-[12px]", portalSubtextAlt)}>
            {readiness != null && (
              <span className={cn("font-semibold", portalHeadingAlt)}>
                {fillTemplate(p.wrapUpReadinessLine, { score: String(readiness) })}
              </span>
            )}
            {wrapUp.overallDelta != null && wrapUp.overallDelta !== 0 && (
              <span
                className={
                  wrapUp.overallDelta > 0 ? " text-emerald-600" : " text-red-600"
                }
              >
                {readiness != null ? " · " : ""}
                {fillTemplate(p.overallDelta, {
                  delta:
                    wrapUp.overallDelta > 0
                      ? `+${Math.round(wrapUp.overallDelta)}`
                      : String(Math.round(wrapUp.overallDelta)),
                })}
              </span>
            )}
            {wrapUp.achievedLevel && (
              <span className="ml-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                {localizeCoachLevel(wrapUp.achievedLevel, p.coachLevels)}
              </span>
            )}
          </p>
        )}

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

        <div className="space-y-3">
          <Section
            icon={<Flame size={13} className="text-amber-600" />}
            title={p.wrapUpWeakTitle}
            empty=""
          >
            {wrapUp.weakTopics.length > 0 ? (
              <ul className="space-y-1.5">
                {wrapUp.weakTopics.map((row) => (
                  <li
                    key={`${row.skill}-${row.topic}`}
                    className="rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2 text-[12px] dark:border-amber-900/40 dark:bg-amber-950/20"
                  >
                    <span className={cn("font-semibold", portalHeadingAlt)}>{row.topic}</span>
                    <p className={cn("mt-0.5 text-[11px]", portalSubtextAlt)}>
                      {row.skill}
                      {row.overcame ? ` · ${p.wrapUpWeakOvercame}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>

          <Section
            icon={<Target size={13} className="text-violet-600" />}
            title={p.wrapUpNextTitle}
            empty={neitherWeakNorNext ? p.wrapUpNextEmpty : ""}
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
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>
        </div>

        <Section
          icon={<CheckCircle2 size={13} className="text-sky-600" />}
          title={p.wrapUpAnswersTitle}
          empty={p.wrapUpAnswersEmpty}
          extra={
            wrapUp.answerTotalCount > 0
              ? fillTemplate(p.wrapUpAnswersSummary, {
                  passed: String(wrapUp.answerPassedCount),
                  total: String(wrapUp.answerTotalCount),
                })
              : undefined
          }
        >
          {wrapUp.answers.length > 0 ? (
            <ul className="space-y-1.5">
              {wrapUp.answers.map((row, index) => (
                <li
                  key={`${row.skill}-${index}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-[12px] dark:border-gray-800"
                >
                  <div className="min-w-0">
                    <p className={cn("leading-snug", portalHeadingAlt)}>{row.questionPreview}</p>
                    <p className={cn("mt-0.5 text-[11px]", portalSubtextAlt)}>
                      {row.skill}
                      {row.score != null ? ` · ${Math.round(row.score)}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      row.passed
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                    )}
                  >
                    {row.passed ? p.wrapUpAnswerPassed : p.wrapUpAnswerNotPassed}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

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
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
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
  extra,
  children,
}: {
  icon: ReactNode;
  title: string;
  empty: string;
  extra?: string;
  children: ReactNode | null;
}) {
  const hasBody = children != null;
  if (!hasBody && !empty) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <p className={cn("text-[11px] font-bold uppercase tracking-wide", portalSubtextAlt)}>{title}</p>
        </div>
        {extra ? <p className={cn("text-[11px] tabular-nums", portalSubtextAlt)}>{extra}</p> : null}
      </div>
      {hasBody ? children : <p className={cn("text-[12px]", portalSubtextAlt)}>{empty}</p>}
    </div>
  );
}
