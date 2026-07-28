"use client";

import { SelectField } from "@/shared/components/ui/select-field";
import { Toggle } from "@/shared/components/ui/toggle";
import { cn } from "@/lib/cn";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type { PlanDetail, StudioSettings } from "@/features/studio/types/studio.types";

const QUESTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "technical", label: "Technical" },
  { value: "system_design", label: "System Design" },
  { value: "problem_solving", label: "Problem Solving" },
  { value: "behavioral", label: "Behavioral" },
  { value: "situational", label: "Situational" },
];

interface Props {
  settings: StudioSettings | null;
  plan: PlanDetail | null;
  isApplying?: boolean;
  locked?: boolean;
  onChangeSetting: (patch: Partial<StudioSettings>) => Promise<void> | void;
  onApplyToPlan?: () => Promise<void> | void;
}

export function StudioSettingsPanel({ settings, plan, isApplying, locked = false, onChangeSetting, onApplyToPlan }: Props) {
  const planApproved = plan?.status === "Approved";
  const canEditQuickControls =
    !locked && (!plan || plan.status === "AwaitingApproval" || plan.status === "Draft" || plan.status === "Rejected");
  const showApply = Boolean(!locked && plan && plan.status === "AwaitingApproval" && onApplyToPlan);
  const selectedTypes = settings?.questionTypes?.length
    ? settings.questionTypes
    : ["technical", "system_design", "problem_solving", "behavioral"];

  const toggleType = (value: string) => {
    if (!canEditQuickControls || planApproved) return;
    const set = new Set(selectedTypes);
    if (set.has(value)) {
      if (set.size <= 1) return;
      set.delete(value);
    } else {
      set.add(value);
    }
    void onChangeSetting({ questionTypes: Array.from(set) });
  };

  return (
    <div className={cn(portalCard, "relative space-y-4 p-4", locked && "opacity-60")}>
      {locked && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed rounded-xl bg-gray-200/40 dark:bg-gray-950/50"
          title="Đã khóa — bấm Tạo bộ mới để chỉnh Studio"
          aria-hidden
        />
      )}
      <fieldset disabled={locked} className="min-w-0 space-y-4 border-0 p-0">
      <div className="flex items-center justify-between">
        <h3 className={cn("text-sm font-semibold", portalHeading)}>STUDIO</h3>
        {settings?.appliedPlanId && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700 dark:bg-green-900/40 dark:text-green-300">
            Plan applied
          </span>
        )}
      </div>

      {/* A. Quick controls — số câu / độ khó / loại / thời lượng */}
      <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <div>
          <p className={cn("text-xs font-semibold", portalHeading)}>Plan quick controls</p>
          <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>
            {planApproved
              ? "Theo plan đã duyệt — khóa chỉnh cấu trúc."
              : "Chỉnh nhanh không cần chat. Có plan rồi thì bấm Áp dụng vào plan."}
          </p>
        </div>

        <SelectField
          label="Interview length"
          value={String(settings?.interviewLengthMinutes || 60)}
          onChange={(value) => onChangeSetting({ interviewLengthMinutes: Number(value) })}
          options={[30, 45, 60, 75, 90].map((v) => ({ value: String(v), label: `${v} minutes` }))}
          disabled={!canEditQuickControls || planApproved}
        />
        <SelectField
          label="Number of questions"
          value={String(settings?.numberOfQuestions || 15)}
          onChange={(value) => onChangeSetting({ numberOfQuestions: Number(value) })}
          // SCRUM-376: tối đa 50 câu (khớp BE ApplySettings 5–50)
          options={[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((v) => ({ value: String(v), label: `${v} questions` }))}
          disabled={!canEditQuickControls || planApproved}
        />
        <SelectField
          label="Difficulty"
          value={settings?.difficulty ?? "Medium"}
          onChange={(value) => onChangeSetting({ difficulty: value as StudioSettings["difficulty"] })}
          options={["Easy", "Medium", "Hard"].map((v) => ({ value: v, label: v }))}
          disabled={!canEditQuickControls || planApproved}
        />

        <div>
          <p className={cn("mb-1.5 text-xs font-medium", portalHeading)}>Question types</p>
          <div className="flex flex-wrap gap-1.5">
            {QUESTION_TYPE_OPTIONS.map((opt) => {
              const active = selectedTypes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={!canEditQuickControls || planApproved}
                  onClick={() => toggleType(opt.value)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-50",
                    active
                      ? "border-[#6c47ff] bg-[#6c47ff]/10 text-[#6c47ff]"
                      : "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {showApply && (
          <button
            type="button"
            disabled={isApplying}
            onClick={() => void onApplyToPlan?.()}
            className="w-full rounded-md bg-[#6c47ff] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {isApplying ? "Đang áp dụng…" : "Áp dụng vào plan"}
          </button>
        )}
      </div>

      {/* B. Generate output */}
      <div className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <p className={cn("text-xs font-semibold", portalHeading)}>Generate output</p>
        <SelectField
          label="Question tone"
          value={settings?.questionTone ?? "Professional"}
          onChange={(value) => onChangeSetting({ questionTone: value })}
          options={["Professional", "Concise", "Friendly"].map((v) => ({ value: v, label: v }))}
        />
        <SelectField
          label="Output format"
          value={settings?.outputFormat ?? "StructuredInterviewKit"}
          onChange={(value) => onChangeSetting({ outputFormat: value })}
          options={["StructuredInterviewKit", "SimpleList", "TechnicalDeepDive"].map((v) => ({
            value: v,
            label: v,
          }))}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn("text-sm", portalHeading)}>Include sample answers</span>
            <Toggle
              checked={settings?.includeSampleAnswers ?? true}
              onChange={(checked) => onChangeSetting({ includeSampleAnswers: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className={cn("text-sm", portalHeading)}>Include scoring rubric</span>
            <Toggle
              checked={settings?.includeScoringRubric ?? true}
              onChange={(checked) => onChangeSetting({ includeScoringRubric: checked })}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-3 text-xs dark:border-gray-700">
        <p className={cn("font-semibold", portalHeading)}>Plan summary</p>
        <p className={cn("mt-1", portalSubtext)}>Estimated output: {plan?.totalQuestions ?? settings?.numberOfQuestions ?? 0} questions</p>
        <p className={cn(portalSubtext)}>Selected sources: {plan?.sourcesUsed?.length ?? 0} sources</p>
        <p className={cn(portalSubtext)}>
          Readiness: {settings?.readiness?.canGenerateQuestions ? "Ready to generate" : "Awaiting required inputs"}
        </p>
        <p className={cn("mt-2", portalSubtext)}>
          Chat giữa: yêu cầu phức tạp (focus skill, section mix). Form này: số câu / độ khó / loại câu.
        </p>
      </div>
      </fieldset>
    </div>
  );
}
