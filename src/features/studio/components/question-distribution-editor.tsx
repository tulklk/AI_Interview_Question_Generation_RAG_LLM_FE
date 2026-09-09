"use client";

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
      <p className={cn("text-[10px]", portalSubtext)}>{cfg.distributionHint}</p>
      {items.map((d, idx) => (
        <div key={d.category} className="flex items-center gap-2 text-[10px]">
          <span className="min-w-[4.5rem] shrink-0 whitespace-normal font-medium text-gray-600 dark:text-gray-300">
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
          <input
            type="number"
            min={0}
            max={numberOfQuestions}
            disabled={disabled}
            value={d.questionCount ?? 0}
            onChange={(e) => updateCount(idx, Number(e.target.value))}
            className="w-10 rounded border border-gray-200 bg-white px-1 py-0.5 text-center tabular-nums dark:border-gray-700 dark:bg-gray-900"
          />
          <span className="w-8 shrink-0 text-right tabular-nums text-gray-500">{d.percentage ?? 0}%</span>
        </div>
      ))}
      {!validation.valid && (
        <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
          {cfg.distributionInvalid
            .replace("{{count}}", String(validation.countSum))
            .replace("{{total}}", String(numberOfQuestions))
            .replace("{{pct}}", String(Math.round(validation.pctSum)))}
        </p>
      )}
    </div>
  );
}
