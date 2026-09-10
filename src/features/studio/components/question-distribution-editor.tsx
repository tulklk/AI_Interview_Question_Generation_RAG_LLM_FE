"use client";

import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtext } from "@/shared/utils/portal-ui";
import type { QuestionDistributionItem } from "@/features/studio/types/studio.types";
import { categoryLabel } from "@/features/studio/utils/ai-config-helpers";
import {
  recountFromPercentages,
  redistributePercentages,
  syncDistributionPercentages,
  validateDistributionSum,
} from "@/features/studio/utils/distribution-math";

const CATEGORIES = ["technical", "behavioral", "situational"] as const;

interface Props {
  distribution: QuestionDistributionItem[];
  numberOfQuestions: number;
  disabled?: boolean;
  onChange: (next: QuestionDistributionItem[]) => void;
}

export function QuestionDistributionEditor({
  distribution,
  numberOfQuestions,
  disabled,
  onChange,
}: Props) {
  const { t, lang } = useLanguage();
  const cfg = t.studioPage.settings.config;
  const locale = lang === "en" ? "en" : "vi";
  const items = distribution.length
    ? distribution
    : CATEGORIES.map((category) => ({ category, percentage: 0, questionCount: 0 }));
  const validation = validateDistributionSum(items, numberOfQuestions);

  const updatePct = (index: number, pct: number) => {
    const pcts = redistributePercentages(
      items.map((d) => d.percentage ?? 0),
      index,
      pct
    );
    const counts = recountFromPercentages(numberOfQuestions, pcts);
    onChange(
      items.map((d, i) => ({
        ...d,
        category: d.category || CATEGORIES[i] || "technical",
        percentage: pcts[i],
        questionCount: counts[i],
      }))
    );
  };

  const updateCount = (index: number, count: number) => {
    const clamped = Math.min(numberOfQuestions, Math.max(0, Math.round(count)));
    const next = items.map((d, i) =>
      i === index ? { ...d, questionCount: clamped } : { ...d }
    );
    onChange(syncDistributionPercentages(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-[10px]", portalSubtext)}>{cfg.distributionHint}</p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold tabular-nums",
            validation.valid
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-700 dark:text-amber-300"
          )}
        >
          {Math.round(validation.pctSum)}%
          {validation.valid ? (
            <Check className="h-3 w-3" strokeWidth={3} />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
        </span>
      </div>

      {validation.valid ? (
        <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
          {(cfg.distributionValid ?? "Valid · {{count}}/{{total}} · {{pct}}%")
            .replace("{{count}}", String(validation.countSum))
            .replace("{{total}}", String(numberOfQuestions))
            .replace("{{pct}}", String(Math.round(validation.pctSum)))}
        </p>
      ) : (
        <div className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">
            {(cfg.distributionInvalidTitle ?? "Distribution incomplete")}
          </p>
          <p className="mt-0.5 opacity-90">
            {cfg.distributionInvalid
              .replace("{{count}}", String(validation.countSum))
              .replace("{{total}}", String(numberOfQuestions))
              .replace("{{pct}}", String(Math.round(validation.pctSum)))}
          </p>
        </div>
      )}

      {items.map((d, idx) => (
        <div key={d.category} className="flex items-center gap-2 text-[11px]">
          <span className="w-16 shrink-0 font-medium text-gray-600 dark:text-gray-300">
            {categoryLabel(d.category, locale)}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            disabled={disabled}
            value={d.percentage ?? 0}
            onChange={(e) => updatePct(idx, Number(e.target.value))}
            className="min-w-0 flex-1 accent-primary disabled:opacity-50"
          />
          <span className="w-9 shrink-0 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-200">
            {d.percentage ?? 0}%
          </span>
          <input
            type="number"
            min={0}
            max={numberOfQuestions}
            disabled={disabled}
            value={d.questionCount ?? 0}
            onChange={(e) => updateCount(idx, Number(e.target.value))}
            className="w-10 rounded border border-gray-200 bg-white px-1 py-0.5 text-center tabular-nums dark:border-gray-700 dark:bg-gray-900"
            aria-label="Question count"
          />
          <span className="w-7 shrink-0 text-[10px] text-gray-400">
            {t.studioPage.settings.unitQuestions}
          </span>
        </div>
      ))}
    </div>
  );
}
