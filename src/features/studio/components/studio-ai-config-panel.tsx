"use client";

import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type {
  AnalyzeJobDescriptionResponse,
  RecommendedConfiguration,
  StudioSettings,
} from "@/features/studio/types/studio.types";
import { categoryLabel, styleLabel } from "@/features/studio/utils/ai-config-helpers";

interface Props {
  settings: StudioSettings | null;
  jdSummary: AnalyzeJobDescriptionResponse | null;
  locked?: boolean;
  isRecommending?: boolean;
  isApplying?: boolean;
  onRecommend: () => Promise<void> | void;
  onApplyRecommendation: () => Promise<void> | void;
}

function FocusAreaList({ items }: { items: RecommendedConfiguration["focusAreas"] }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.slice(0, 6).map((fa) => (
        <li
          key={`${fa.orderIndex}-${fa.name}`}
          className="rounded-lg border border-gray-100 bg-white px-2.5 py-2 dark:border-gray-800 dark:bg-gray-900/60"
        >
          <div className="flex items-center justify-between gap-2">
            <span className={cn("text-[11px] font-semibold", portalHeading)}>{fa.name}</span>
            <span className="text-[10px] font-medium text-primary">{fa.weight}%</span>
          </div>
          {fa.sourceReason && (
            <p className={cn("mt-0.5 text-[10px] leading-snug", portalSubtext)}>{fa.sourceReason}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function DistributionBar({
  items,
  locale,
}: {
  items: RecommendedConfiguration["questionDistribution"];
  locale: "vi" | "en";
}) {
  if (!items?.length) return null;
  return (
    <div className="space-y-1">
      {items.map((d) => (
        <div key={d.category} className="flex items-center gap-2 text-[10px]">
          <span className="w-20 shrink-0 font-medium text-gray-600 dark:text-gray-300">
            {categoryLabel(d.category, locale)}
          </span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-primary/80"
              style={{ width: `${Math.min(100, d.percentage)}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right tabular-nums text-gray-500">
            {d.questionCount} ({d.percentage}%)
          </span>
        </div>
      ))}
    </div>
  );
}

export function StudioAiConfigPanel({
  settings,
  jdSummary,
  locked = false,
  isRecommending = false,
  isApplying = false,
  onRecommend,
  onApplyRecommendation,
}: Props) {
  const { t, lang } = useLanguage();
  const ai = t.studioPage.settings.aiConfig;
  const locale = lang === "en" ? "en" : "vi";
  const draft = settings?.recommendedConfiguration;
  const hasJdProfile = Boolean(jdSummary?.position || jdSummary?.skills?.length);

  return (
    <div className={cn(portalCard, "space-y-3 border border-violet-100/80 bg-violet-50/30 p-3 dark:border-violet-900/40 dark:bg-violet-950/20")}>
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-semibold", portalHeading)}>{ai.title}</p>
          <p className={cn("text-[10px] leading-snug", portalSubtext)}>{ai.subtitle}</p>
        </div>
      </div>

      {hasJdProfile && (
        <div className="rounded-lg border border-gray-100 bg-white/80 px-2.5 py-2 dark:border-gray-800 dark:bg-gray-900/50">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">{ai.jobProfileTitle}</p>
          <p className={cn("mt-0.5 text-[11px] font-semibold", portalHeading)}>
            {jdSummary?.position || jdSummary?.jobTitle || ai.unknown}
          </p>
          {jdSummary?.summary && (
            <p className={cn("mt-1 text-[10px] leading-snug", portalSubtext)}>{jdSummary.summary}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={locked || isRecommending || !hasJdProfile}
          onClick={() => void onRecommend()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-40"
        >
          {isRecommending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          {isRecommending ? ai.recommending : ai.recommendBtn}
        </button>
        {draft && (
          <button
            type="button"
            disabled={locked || isApplying}
            onClick={() => void onApplyRecommendation()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-40 dark:border-violet-700 dark:bg-gray-900 dark:text-violet-300 dark:hover:bg-violet-950/40"
          >
            {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isApplying ? ai.applying : ai.applyBtn}
          </button>
        )}
      </div>

      {draft ? (
        <div className="space-y-2.5 rounded-xl border border-violet-100 bg-white/90 p-2.5 dark:border-violet-900/50 dark:bg-gray-900/40">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
            {ai.draftTitle}
          </p>
          <DistributionBar items={draft.questionDistribution} locale={locale} />
          {draft.questionStyles?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {draft.questionStyles.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {styleLabel(s)}
                </span>
              ))}
            </div>
          )}
          <FocusAreaList items={draft.focusAreas} />
          <p className={cn("text-[10px]", portalSubtext)}>{ai.applyHint}</p>
        </div>
      ) : (
        <p className={cn("text-[10px]", portalSubtext)}>{ai.emptyDraft}</p>
      )}
    </div>
  );
}
