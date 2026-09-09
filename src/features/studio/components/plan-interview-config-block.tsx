"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { SelectField } from "@/shared/components/ui/select-field";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtext } from "@/shared/utils/portal-ui";
import type { PlanDetail, StudioSettings } from "@/features/studio/types/studio.types";
import type { StudioConfigDraft } from "@/features/studio/hooks/use-studio-config";
import { deriveLegacyQuestionTypes } from "@/features/studio/utils/ai-config-helpers";
import { QuestionDistributionEditor } from "@/features/studio/components/question-distribution-editor";
import { FocusAreasEditor } from "@/features/studio/components/focus-areas-editor";
import { QuestionStylesPicker } from "@/features/studio/components/question-styles-picker";
import { CodingTaskTypesPicker } from "@/features/studio/components/coding-task-types-picker";

interface Props {
  plan: PlanDetail;
  settings: StudioSettings | null;
  draft: StudioConfigDraft | null;
  locked?: boolean;
  isDirty?: boolean;
  isConfigValidForPlan?: boolean;
  canApplyConfig?: boolean;
  isApplying?: boolean;
  onDraftChange: (patch: Partial<StudioConfigDraft>) => void;
  onApplyToPlan: () => Promise<void> | void;
}

function CompactNumberField({
  label,
  value,
  unit,
  min,
  max,
  presets,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  presets: number[];
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  const commit = () => {
    const n = Number(draft);
    setFocused(false);
    if (!Number.isFinite(n) || draft.trim() === "") return;
    onChange(Math.min(max, Math.max(min, Math.round(n))));
  };

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-gray-700 dark:text-gray-200">{label}</label>
      <div
        className={cn(
          "flex items-center rounded-lg border bg-white transition-all dark:bg-gray-900/80",
          focused
            ? "border-primary ring-1 ring-primary/20"
            : "border-gray-200 dark:border-gray-700",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <input
          type="number"
          value={focused ? draft : value}
          min={min}
          max={max}
          disabled={disabled}
          className="w-full rounded-lg bg-transparent px-2.5 py-1.5 text-sm font-medium text-gray-800 outline-none dark:text-gray-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          onFocus={(e) => {
            setDraft(String(value));
            setFocused(true);
            e.target.select();
          }}
          onBlur={() => commit()}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <span className="shrink-0 pr-2.5 text-[11px] text-gray-400">{unit}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] font-medium transition-all disabled:opacity-40",
              value === p
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * SCRUM-422/423: Cấu hình tương tác trên Plan — gồm khung phỏng vấn (số câu / phút / độ khó)
 * + distribution / focus / styles. CTA Áp dụng ghi settings rồi apply vào plan.
 */
export function PlanInterviewConfigBlock({
  plan,
  settings,
  draft,
  locked = false,
  isDirty: _isDirty = false,
  isConfigValidForPlan = false,
  canApplyConfig = false,
  isApplying = false,
  onDraftChange,
  onApplyToPlan,
}: Props) {
  const { t } = useLanguage();
  const s = t.studioPage.settings;
  const cfg = s.config;
  const editable =
    !locked &&
    plan.status !== "Approved" &&
    plan.status !== "Superseded";

  const numberOfQuestions = draft?.numberOfQuestions ?? settings?.numberOfQuestions ?? plan.totalQuestions ?? 15;
  const interviewLengthMinutes =
    draft?.interviewLengthMinutes ?? settings?.interviewLengthMinutes ?? plan.interviewLengthMinutes ?? 60;
  const difficulty = draft?.difficulty ?? settings?.difficulty ?? "Medium";
  const distribution = draft?.questionDistribution ?? settings?.questionDistribution ?? [];
  const focusAreas = draft?.focusAreas ?? settings?.focusAreas ?? [];
  const questionStyles = draft?.questionStyles ?? settings?.questionStyles ?? [];
  const enabledTemplates = draft?.enabledCodeTemplates ?? settings?.enabledCodeTemplates ?? [];
  const codingRecommended = settings?.recommendedConfiguration?.codingTasksRecommended;

  const showApply = editable && canApplyConfig && isConfigValidForPlan;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {cfg.planConfigTitle}
          </p>
          <p className={cn("mt-0.5 text-[10px]", portalSubtext)}>{cfg.planConfigSubtitle}</p>
        </div>
      </div>

      {/* SCRUM-423: khung phỏng vấn chỉnh trên Plan */}
      <div className="space-y-2.5 rounded-lg border border-gray-100 bg-gray-50/50 p-2.5 dark:border-gray-800 dark:bg-gray-900/30">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-300">{cfg.frameSection}</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <CompactNumberField
            label={s.questionCount}
            value={numberOfQuestions}
            unit={s.unitQuestions}
            min={5}
            max={50}
            presets={[5, 10, 15, 20, 25, 30]}
            disabled={!editable}
            onChange={(v) => onDraftChange({ numberOfQuestions: v })}
          />
          <CompactNumberField
            label={s.duration}
            value={interviewLengthMinutes}
            unit={s.unitMin}
            min={15}
            max={180}
            presets={[30, 45, 60, 75, 90, 120]}
            disabled={!editable}
            onChange={(v) => onDraftChange({ interviewLengthMinutes: v })}
          />
        </div>
        <SelectField
          label={s.difficulty}
          value={difficulty}
          onChange={(v) => onDraftChange({ difficulty: v as StudioSettings["difficulty"] })}
          options={[
            { value: "Easy", label: s.easyDesc },
            { value: "Medium", label: s.mediumDesc },
            { value: "Hard", label: s.hardDesc },
          ]}
          disabled={!editable}
        />
      </div>

      <div className="space-y-3">
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

        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-300">{s.focusAreasLabel}</p>
        <FocusAreasEditor
          focusAreas={focusAreas}
          disabled={!editable}
          onChange={(next) => onDraftChange({ focusAreas: next })}
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
          {isApplying ? s.applying : s.applyToPlan}
        </button>
      )}
    </div>
  );
}
