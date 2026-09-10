"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtext } from "@/shared/utils/portal-ui";
import type { PlanDetail, PlanFocusAreaItem, StudioFocusAreaItem, StudioSettings } from "@/features/studio/types/studio.types";
import type { StudioConfigDraft } from "@/features/studio/hooks/use-studio-config";
import { deriveLegacyQuestionTypes } from "@/features/studio/utils/ai-config-helpers";
import {
  sumFocusWeights,
  syncDistributionCounts,
  validateDistributionSum,
} from "@/features/studio/utils/distribution-math";
import { normalizeFocusAreasToJdSkills } from "@/features/studio/utils/focus-area-jd";
import { normalizeStudioDifficulty } from "@/features/studio/utils/normalize-studio-settings";
import { QuestionDistributionEditor } from "@/features/studio/components/question-distribution-editor";
import { FocusAreasEditor } from "@/features/studio/components/focus-areas-editor";
import { QuestionStylesPicker } from "@/features/studio/components/question-styles-picker";
import { CodingTaskTypesPicker } from "@/features/studio/components/coding-task-types-picker";
import {
  DEFAULT_ENABLED_CODE_TEMPLATES,
  type StudioCodeTemplateId,
} from "@/features/studio/constants/question-templates";

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

type PanelId = "difficulty" | "focus" | "distribution" | "styles" | "coding";

const ALL_OPEN: Record<PanelId, boolean> = {
  difficulty: true,
  focus: true,
  distribution: true,
  styles: true,
  coding: true,
};

const ALL_CLOSED: Record<PanelId, boolean> = {
  difficulty: false,
  focus: false,
  distribution: false,
  styles: false,
  coding: false,
};

function PlanReviewPanel({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/50">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
      >
        <span className="min-w-0 flex-1 text-[11px] font-semibold text-gray-800 dark:text-gray-100">
          {title}
        </span>
        {!open && summary ? (
          <span className="max-w-[45%] truncate text-[10px] text-gray-400">{summary}</span>
        ) : null}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-gray-100 px-2.5 pb-2.5 pt-2 dark:border-gray-800">
          {children}
        </div>
      ) : null}
    </div>
  );
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

  const [openPanels, setOpenPanels] = useState<Record<PanelId, boolean>>(ALL_OPEN);

  useEffect(() => {
    if (previewOpen) setOpenPanels(ALL_CLOSED);
  }, [previewOpen]);

  const togglePanel = (id: PanelId) => {
    setOpenPanels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  const showApply =
    editable &&
    isConfigValidForPlan &&
    (canApplyConfig || !previewOpen);

  const difficultyOptions = [
    { id: "Easy" as const, label: s.easyDesc },
    { id: "Medium" as const, label: s.mediumDesc },
    { id: "Hard" as const, label: s.hardDesc },
  ];

  const difficultySummary =
    difficultyOptions.find((d) => d.id.toLowerCase() === String(difficulty).toLowerCase())?.label
    ?? difficulty;

  const focusSum = Math.round(sumFocusWeights(focusAreas) * 10) / 10;
  const focusSummary = `${focusAreas.length} · ${focusSum}%`;

  const distValidation = validateDistributionSum(distribution, numberOfQuestions);
  const distSummary = `${Math.round(distValidation.pctSum)}%`;

  const stylesSummary = `${questionStyles.length}`;

  const styles = new Set(questionStyles.map((x) => x.toLowerCase()));
  const showCoding = codingRecommended ?? (styles.has("coding") || styles.has("problem_solving"));
  const codingSelected: StudioCodeTemplateId[] =
    enabledTemplates?.length
      ? enabledTemplates
      : DEFAULT_ENABLED_CODE_TEMPLATES.filter((id) => id !== "SYSTEM_DESIGN");
  const codingSummary = showCoding
    ? String(codingSelected.length)
    : cfg.codingNotRequired;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-900/40">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {cfg.planReviewTitle}
        </p>
        <p className={cn("mt-0.5 text-[10px]", portalSubtext)}>{cfg.planReviewSubtitle}</p>
      </div>

      <div className="space-y-2">
        <PlanReviewPanel
          title={s.difficulty}
          summary={difficultySummary}
          open={openPanels.difficulty}
          onToggle={() => togglePanel("difficulty")}
        >
          <div className="inline-flex w-full max-w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {difficultyOptions.map((d) => {
              const active = String(difficulty).toLowerCase() === d.id.toLowerCase();
              return (
                <button
                  key={d.id}
                  type="button"
                  disabled={!editable || isApplying}
                  onClick={() => {
                    if (active) return;
                    onDraftChange({ difficulty: d.id });
                  }}
                  className={cn(
                    "min-w-0 flex-1 px-2 py-1.5 text-center text-[10px] font-semibold leading-snug transition-colors disabled:opacity-40 sm:text-[11px]",
                    active
                      ? "bg-primary text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <p className={cn("text-[10px]", portalSubtext)}>{c.planDifficultyHint}</p>
        </PlanReviewPanel>

        <PlanReviewPanel
          title={s.focusAreasLabel}
          summary={focusSummary}
          open={openPanels.focus}
          onToggle={() => togglePanel("focus")}
        >
          <p className={cn("text-[10px]", portalSubtext)}>{cfg.focusFromSourcesHint}</p>
          <FocusAreasEditor
            focusAreas={focusAreas}
            allowedSkillNames={allowedSkillNames}
            disabled={!editable}
            onChange={(next) => onDraftChange({ focusAreas: next })}
          />
        </PlanReviewPanel>

        <PlanReviewPanel
          title={s.distributionLabel}
          summary={distSummary}
          open={openPanels.distribution}
          onToggle={() => togglePanel("distribution")}
        >
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
        </PlanReviewPanel>

        <PlanReviewPanel
          title={s.stylesLabel}
          summary={stylesSummary}
          open={openPanels.styles}
          onToggle={() => togglePanel("styles")}
        >
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
        </PlanReviewPanel>

        <PlanReviewPanel
          title={cfg.codingSection}
          summary={codingSummary}
          open={openPanels.coding}
          onToggle={() => togglePanel("coding")}
        >
          <CodingTaskTypesPicker
            enabled={enabledTemplates ?? []}
            codingRecommended={codingRecommended}
            questionStyles={questionStyles}
            disabled={!editable}
            onChange={(next) => onDraftChange({ enabledCodeTemplates: next })}
          />
        </PlanReviewPanel>
      </div>

      {!isConfigValidForPlan && editable && (
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {cfg.configInvalidHint}
        </p>
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
