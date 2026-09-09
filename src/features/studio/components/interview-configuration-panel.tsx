"use client";

import { Check, Loader2, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type {
  AnalyzeJobDescriptionResponse,
  PlanDetail,
  StudioSettings,
} from "@/features/studio/types/studio.types";
import type { StudioConfigDraft } from "@/features/studio/hooks/use-studio-config";
import { deriveLegacyQuestionTypes } from "@/features/studio/utils/ai-config-helpers";
import { QuestionDistributionEditor } from "@/features/studio/components/question-distribution-editor";
import { FocusAreasEditor } from "@/features/studio/components/focus-areas-editor";
import { QuestionStylesPicker } from "@/features/studio/components/question-styles-picker";
import { CodingTaskTypesPicker } from "@/features/studio/components/coding-task-types-picker";

interface Props {
  mode: "prePlan" | "planReview";
  settings: StudioSettings | null;
  draft: StudioConfigDraft | null;
  plan: PlanDetail | null;
  jdSummary: AnalyzeJobDescriptionResponse | null;
  locked?: boolean;
  isRecommending?: boolean;
  isApplyingRecommendation?: boolean;
  isApplyingConfig?: boolean;
  canApplyConfig?: boolean;
  isConfigValidForPlan?: boolean;
  isDirty?: boolean;
  onRecommend: () => Promise<void> | void;
  onApplyRecommendation: () => Promise<void> | void;
  onApplyConfig: () => Promise<void> | void;
  onDraftChange: (patch: Partial<StudioConfigDraft>) => void;
}

function SectionLabel({ text }: { text: string }) {
  return <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-300">{text}</p>;
}

export function InterviewConfigurationPanel({
  mode,
  settings,
  draft,
  plan,
  jdSummary,
  locked = false,
  isRecommending = false,
  isApplyingRecommendation = false,
  isApplyingConfig = false,
  canApplyConfig = false,
  isConfigValidForPlan = false,
  isDirty = false,
  onRecommend,
  onApplyRecommendation,
  onApplyConfig,
  onDraftChange,
}: Props) {
  const { t } = useLanguage();
  const s = t.studioPage.settings;
  const cfg = s.config;
  const ai = s.aiConfig;
  const rec = settings?.recommendedConfiguration;
  const hasJdProfile = Boolean(jdSummary?.position || jdSummary?.skills?.length);
  const canEdit = !locked && (!plan || plan.status === "AwaitingApproval" || plan.status === "Draft" || plan.status === "Rejected");
  const numberOfQuestions = draft?.numberOfQuestions ?? settings?.numberOfQuestions ?? 15;
  const distribution = draft?.questionDistribution ?? settings?.questionDistribution ?? [];
  const focusAreas = draft?.focusAreas ?? settings?.focusAreas ?? [];
  const questionStyles = draft?.questionStyles ?? settings?.questionStyles ?? [];
  const enabledTemplates = draft?.enabledCodeTemplates ?? settings?.enabledCodeTemplates ?? [];
  const codingRecommended = rec?.codingTasksRecommended;

  const badgeLabel = isDirty
    ? cfg.badgeHrCustomized
    : rec && isConfigValidForPlan
      ? cfg.badgeAiRecommended
      : cfg.badgeNotConfigured;

  return (
    <div className={cn(portalCard, "space-y-3 border border-violet-100/80 bg-violet-50/30 p-3 dark:border-violet-900/40 dark:bg-violet-950/20")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <div className="min-w-0">
            <p className={cn("text-xs font-semibold", portalHeading)}>
              {mode === "planReview" ? cfg.appliedConfigTitle : ai.title}
            </p>
            <p className={cn("text-[10px] leading-snug", portalSubtext)}>
              {mode === "planReview" ? cfg.appliedConfigSubtitle : ai.subtitle}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-semibold text-violet-700 dark:bg-gray-900/60 dark:text-violet-300">
          {badgeLabel}
        </span>
      </div>

      {mode === "prePlan" && (
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
          {rec && (
            <button
              type="button"
              disabled={locked || isApplyingRecommendation}
              onClick={() => void onApplyRecommendation()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-40 dark:border-violet-700 dark:bg-gray-900 dark:text-violet-300"
            >
              {isApplyingRecommendation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {isApplyingRecommendation ? ai.applying : ai.applyBtn}
            </button>
          )}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-gray-100 bg-white/90 p-2.5 dark:border-gray-800 dark:bg-gray-900/40">
        <SectionLabel text={s.distributionLabel} />
        <QuestionDistributionEditor
          distribution={distribution}
          numberOfQuestions={numberOfQuestions}
          disabled={!canEdit}
          onChange={(next) =>
            onDraftChange({
              questionDistribution: next,
              questionTypes: deriveLegacyQuestionTypes(next, questionStyles),
            })
          }
        />

        <SectionLabel text={s.focusAreasLabel} />
        <FocusAreasEditor
          focusAreas={focusAreas}
          disabled={!canEdit}
          onChange={(next) => onDraftChange({ focusAreas: next })}
        />

        <SectionLabel text={s.stylesLabel} />
        <QuestionStylesPicker
          selected={questionStyles}
          disabled={!canEdit}
          onChange={(next) =>
            onDraftChange({
              questionStyles: next,
              questionTypes: deriveLegacyQuestionTypes(distribution, next),
            })
          }
        />

        <SectionLabel text={cfg.codingSection} />
        <CodingTaskTypesPicker
          enabled={enabledTemplates ?? []}
          codingRecommended={codingRecommended}
          questionStyles={questionStyles}
          disabled={!canEdit}
          onChange={(next) => onDraftChange({ enabledCodeTemplates: next })}
        />
      </div>

      {!isConfigValidForPlan && (
        <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">{cfg.configInvalidHint}</p>
      )}

      {canEdit && (
        <button
          type="button"
          disabled={locked || isApplyingConfig || !canApplyConfig}
          onClick={() => void onApplyConfig()}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-primary-hover transition-colors"
        >
          {isApplyingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          {isApplyingConfig ? cfg.applyingConfig : cfg.applyConfig}
        </button>
      )}
    </div>
  );
}
