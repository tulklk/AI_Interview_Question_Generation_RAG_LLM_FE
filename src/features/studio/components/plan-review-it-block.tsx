"use client";

import { useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtext } from "@/shared/utils/portal-ui";
import type { PlanDetail, PlanFocusAreaItem, StudioFocusAreaItem, StudioSettings } from "@/features/studio/types/studio.types";
import type { StudioConfigDraft } from "@/features/studio/hooks/use-studio-config";
import { deriveLegacyQuestionTypes } from "@/features/studio/utils/ai-config-helpers";
import { syncDistributionCounts } from "@/features/studio/utils/distribution-math";
import { normalizeFocusAreasToJdSkills } from "@/features/studio/utils/focus-area-jd";
import { normalizeStudioDifficulty } from "@/features/studio/utils/normalize-studio-settings";
import { QuestionDistributionEditor } from "@/features/studio/components/question-distribution-editor";
import { FocusAreasEditor } from "@/features/studio/components/focus-areas-editor";
import { QuestionStylesPicker } from "@/features/studio/components/question-styles-picker";
import { CodingTaskTypesPicker } from "@/features/studio/components/coding-task-types-picker";

interface Props {
  plan: PlanDetail;
  settings: StudioSettings | null;
  draft: StudioConfigDraft | null;
  allowedSkillNames?: string[];
  locked?: boolean;
  isDirty?: boolean;
  isConfigValidForPlan?: boolean;
  canApplyConfig?: boolean;
  isApplying?: boolean;
  /** Đã mở Live Preview — khi false vẫn hiện CTA dù chưa dirty */
  previewOpen?: boolean;
  onDraftChange: (patch: Partial<StudioConfigDraft>) => void;
  onApplyToPlan: () => Promise<void> | void;
}

/** SCRUM-433: Snap focus RAG → skill JD, merge/dedupe, scale 100%. */
function mapPlanFocus(
  areas: PlanFocusAreaItem[],
  jdSkills: string[]
): StudioFocusAreaItem[] {
  return normalizeFocusAreasToJdSkills(
    areas.map((a, i) => ({
      name: a.name,
      weight: a.weight,
      orderIndex: a.orderIndex ?? i,
      sourceReason: a.sourceFiles?.slice(0, 3).join(", ") ?? null,
    })),
    jdSkills
  );
}

/**
 * Bước 1 — sau khi có plan: HR chỉnh Focus / độ khó / phân bổ / styles / coding.
 * Live Preview outline nằm bước 2 (sau Áp dụng) — không render ở đây.
 */
export function PlanReviewItBlock({
  plan,
  settings,
  draft,
  allowedSkillNames = [],
  locked = false,
  isDirty: _isDirty = false,
  isConfigValidForPlan = false,
  canApplyConfig = false,
  isApplying = false,
  previewOpen = false,
  onDraftChange,
  onApplyToPlan,
}: Props) {
  const { t } = useLanguage();
  const s = t.studioPage.settings;
  const cfg = s.config;
  const c = t.studioPage.chat;
  const editable =
    !locked &&
    plan.status !== "Approved" &&
    plan.status !== "Superseded";

  const numberOfQuestions = draft?.numberOfQuestions ?? settings?.numberOfQuestions ?? plan.totalQuestions ?? 15;
  const difficulty = normalizeStudioDifficulty(
    draft?.difficulty ?? settings?.difficulty ?? "Medium"
  );
  const distribution = draft?.questionDistribution ?? settings?.questionDistribution ?? [];
  const questionStyles = draft?.questionStyles ?? settings?.questionStyles ?? [];
  const enabledTemplates = draft?.enabledCodeTemplates ?? settings?.enabledCodeTemplates ?? [];
  const codingRecommended = settings?.recommendedConfiguration?.codingTasksRecommended;

  const settingsFocus = draft?.focusAreas ?? settings?.focusAreas ?? [];
  const focusAreas =
    settingsFocus.length > 0
      ? settingsFocus
      : mapPlanFocus(plan.focusAreas ?? [], allowedSkillNames);

  useEffect(() => {
    if ((draft?.focusAreas?.length ?? 0) > 0) return;
    const fromPlan = mapPlanFocus(plan.focusAreas ?? [], allowedSkillNames);
    if (fromPlan.length === 0) return;
    onDraftChange({ focusAreas: fromPlan });
  }, [plan.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editable || distribution.length === 0) return;
    const synced = syncDistributionCounts(distribution, numberOfQuestions);
    const same = synced.every(
      (d, i) => d.questionCount === distribution[i]?.questionCount && d.percentage === distribution[i]?.percentage
    );
    if (!same) onDraftChange({ questionDistribution: synced });
  }, [numberOfQuestions, plan.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dirty → Áp dụng lại; chưa mở Preview → vẫn hiện CTA (Tiếp tục xem preview)
  const showApply =
    editable &&
    isConfigValidForPlan &&
    (canApplyConfig || !previewOpen);

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {cfg.planReviewTitle}
        </p>
        <p className={cn("mt-0.5 text-[10px]", portalSubtext)}>{cfg.planReviewSubtitle}</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-300">{s.difficulty}</p>
        <div className="flex flex-wrap gap-1.5">
          {(["Easy", "Medium", "Hard"] as const).map((d) => {
            const active = String(difficulty).toLowerCase() === d.toLowerCase();
            return (
              <button
                key={d}
                type="button"
                disabled={!editable || isApplying}
                onClick={() => {
                  if (active) return;
                  onDraftChange({ difficulty: d });
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40",
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 text-gray-600 hover:border-primary/40 dark:border-gray-700 dark:text-gray-300"
                )}
              >
                {d === "Easy" ? s.easyDesc : d === "Medium" ? s.mediumDesc : s.hardDesc}
              </button>
            );
          })}
        </div>
        <p className={cn("text-[10px]", portalSubtext)}>{c.planDifficultyHint}</p>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-300">{s.focusAreasLabel}</p>
        <p className={cn("text-[10px]", portalSubtext)}>{cfg.focusFromSourcesHint}</p>
        <FocusAreasEditor
          focusAreas={focusAreas}
          allowedSkillNames={allowedSkillNames}
          disabled={!editable}
          onChange={(next) => onDraftChange({ focusAreas: next })}
        />

        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-300">{s.distributionLabel}</p>
        <QuestionDistributionEditor
          distribution={distribution}
          numberOfQuestions={numberOfQuestions}
          disabled={!editable}
          onChange={(next) =>
            onDraftChange({
              questionDistribution: next,
              questionTypes: deriveLegacyQuestionTypes(next, questionStyles),
            })
          }
        />

        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-300">{s.stylesLabel}</p>
        <QuestionStylesPicker
          selected={questionStyles}
          disabled={!editable}
          onChange={(next) =>
            onDraftChange({
              questionStyles: next,
              questionTypes: deriveLegacyQuestionTypes(distribution, next),
            })
          }
        />

        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-300">{cfg.codingSection}</p>
        <CodingTaskTypesPicker
          enabled={enabledTemplates ?? []}
          codingRecommended={codingRecommended}
          questionStyles={questionStyles}
          disabled={!editable}
          onChange={(next) => onDraftChange({ enabledCodeTemplates: next })}
        />
      </div>

      {!isConfigValidForPlan && editable && (
        <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">{cfg.configInvalidHint}</p>
      )}

      {showApply && (
        <button
          type="button"
          disabled={isApplying}
          onClick={() => void onApplyToPlan()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {isApplying
            ? s.applying
            : canApplyConfig
              ? s.applyToPlan
              : cfg.continueToPreviewCta}
        </button>
      )}
    </div>
  );
}
