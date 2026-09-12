"use client";

import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import { SourceOriginBadge, type SourceOriginLabels, planSourceDisplayName } from "@/features/studio/components/source-origin-badge";

export interface PlanSummarySourceRow {
  name: string;
  scope?: string | null;
}

export interface PlanSummaryCoverageItem {
  skill: string;
  questionCount: number;
}

interface Labels {
  title: string;
  questions: string;
  duration: string;
  difficulty: string;
  focus: string;
  distribution: string;
  styles: string;
  stylesSelected: string;
  coverage: string;
  coverageSkills: string;
  sources: string;
  sourcesCount: string;
  ready: string;
  notReady: string;
  missingFocus: string;
  missingDist: string;
  missingConfig: string;
  unitQuestions: string;
  unitMin: string;
  sourceOriginJd: string;
}

interface Props {
  totalQuestions: number;
  interviewLengthMinutes: number;
  difficulty: string;
  focusSum: number;
  focusValid: boolean;
  distCountSum: number;
  distPctSum: number;
  distValid: boolean;
  styleCount: number;
  isConfigValidForPlan: boolean;
  coverageItems: PlanSummaryCoverageItem[];
  sourceRows: PlanSummarySourceRow[];
  originLabels: SourceOriginLabels;
  labels: Labels;
}

export function PlanSummarySidebar({
  totalQuestions,
  interviewLengthMinutes,
  difficulty,
  focusSum,
  focusValid,
  distCountSum,
  distPctSum,
  distValid,
  styleCount,
  isConfigValidForPlan,
  coverageItems,
  sourceRows,
  originLabels,
  labels,
}: Props) {
  const missing: string[] = [];
  if (!focusValid) missing.push(labels.missingFocus);
  if (!distValid) missing.push(labels.missingDist);
  if (!isConfigValidForPlan && focusValid && distValid) missing.push(labels.missingConfig);

  return (
    <aside className="space-y-3 rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-900/60">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        {labels.title}
      </p>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-gray-50 px-2 py-2 dark:bg-gray-800/50">
          <p className="text-lg font-semibold tabular-nums leading-none text-gray-900 dark:text-gray-50">
            {totalQuestions}
          </p>
          <p className="mt-1 text-[10px] text-gray-500">{labels.questions}</p>
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-2 dark:bg-gray-800/50">
          <p className="text-lg font-semibold tabular-nums leading-none text-gray-900 dark:text-gray-50">
            {interviewLengthMinutes}
          </p>
          <p className="mt-1 text-[10px] text-gray-500">
            {labels.duration} ({labels.unitMin})
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 px-2 py-2 dark:bg-gray-800/50">
          <p className="truncate text-sm font-semibold leading-tight text-gray-900 dark:text-gray-50">
            {difficulty}
          </p>
          <p className="mt-1 text-[10px] text-gray-500">{labels.difficulty}</p>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
        <StatusRow
          label={labels.focus}
          value={`${Math.round(focusSum)}%`}
          ok={focusValid}
        />
        <StatusRow
          label={labels.distribution}
          value={`${distCountSum}/${totalQuestions} · ${Math.round(distPctSum)}%`}
          ok={distValid}
        />
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-gray-500">{labels.styles}</span>
          <span className="font-medium tabular-nums text-gray-800 dark:text-gray-200">
            {labels.stylesSelected.replace("{{count}}", String(styleCount))}
          </span>
        </div>
      </div>

      <div
        className={cn(
          "rounded-lg px-2.5 py-2 text-[11px]",
          isConfigValidForPlan
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        )}
      >
        <p className="flex items-center gap-1.5 font-semibold">
          {isConfigValidForPlan ? (
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          )}
          {isConfigValidForPlan ? labels.ready : labels.notReady}
        </p>
        {!isConfigValidForPlan && missing.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 pl-5 text-[10px] opacity-90">
            {missing.map((m) => (
              <li key={m} className="list-disc">
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>

      {coverageItems.length > 0 && (
        <div className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {labels.coverage}
          </p>
          <p className="text-[10px] text-gray-500">
            {labels.coverageSkills.replace("{{count}}", String(coverageItems.length))}
          </p>
          <div className="flex flex-wrap gap-1">
            {coverageItems.map((item, idx) => {
              const skillIcon = getSkillIcon(item.skill);
              const SIcon = skillIcon?.icon;
              return (
                <span
                  key={`${item.skill}-${idx}`}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {SIcon ? (
                    <SIcon
                      aria-hidden
                      size={11}
                      className={cn("shrink-0", skillIcon!.className)}
                    />
                  ) : null}
                  {item.skill}
                  <span className="tabular-nums text-gray-400">· {item.questionCount}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {sourceRows.length > 0 && (
        <div className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {labels.sources}
          </p>
          <p className="text-[10px] text-gray-500">
            {labels.sourcesCount.replace("{{count}}", String(sourceRows.length))}
          </p>
          <div className="flex flex-wrap gap-1">
            {sourceRows.map((row, idx) => (
              <span
                key={`${row.name}-${idx}`}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <SourceOriginBadge scopeOrKb={row.scope} sourceFile={row.name} labels={originLabels} />
                <span className="truncate">
                  {planSourceDisplayName(row.name, labels.sourceOriginJd)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-gray-500">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 font-semibold tabular-nums",
          ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300"
        )}
      >
        {value}
        {ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <AlertTriangle className="h-3 w-3" />}
      </span>
    </div>
  );
}
