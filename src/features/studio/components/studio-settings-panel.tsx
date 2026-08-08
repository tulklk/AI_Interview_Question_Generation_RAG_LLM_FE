"use client";

import { useState } from "react";
import { Check, CheckCircle2, FileQuestion, Loader2, Sparkles } from "lucide-react";
import { SelectField } from "@/shared/components/ui/select-field";
import { Toggle } from "@/shared/components/ui/toggle";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type { PlanDetail, StudioSettings } from "@/features/studio/types/studio.types";
import {
  STUDIO_QUESTION_TEMPLATES,
  DEFAULT_ENABLED_CODE_TEMPLATES,
} from "@/features/studio/constants/question-templates";

const QUESTION_TYPE_OPTIONS: { value: string; label: string; shortLabel: string }[] = [
  { value: "technical",       label: "Technical",       shortLabel: "Tech" },
  { value: "system_design",   label: "System Design",   shortLabel: "Design" },
  { value: "problem_solving", label: "Problem Solving", shortLabel: "Problem" },
  { value: "behavioral",      label: "Behavioral",      shortLabel: "Behavior" },
  { value: "situational",     label: "Situational",     shortLabel: "Situation" },
];

interface Props {
  settings: StudioSettings | null;
  plan: PlanDetail | null;
  isApplying?: boolean;
  locked?: boolean;
  onChangeSetting: (patch: Partial<StudioSettings>) => Promise<void> | void;
  onApplyToPlan?: () => Promise<void> | void;
}

function SectionLabel({ text }: { text: string }) {
  return <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">{text}</p>;
}

function NumberInputField({
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
    const clamped = Math.min(max, Math.max(min, Math.round(n)));
    onChange(clamped);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-700 dark:text-gray-200">{label}</label>
      <div className={cn(
        "flex items-center rounded-xl border bg-white transition-all dark:bg-gray-900/80",
        focused
          ? "border-primary ring-1 ring-primary/20"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600",
        disabled && "pointer-events-none opacity-50"
      )}>
        <input
          type="number"
          value={focused ? draft : value}
          min={min}
          max={max}
          disabled={disabled}
          className="w-full rounded-xl bg-transparent px-3 py-2.5 text-sm font-medium text-gray-800 outline-none dark:text-gray-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          onFocus={(e) => { setDraft(String(value)); setFocused(true); e.target.select(); }}
          onBlur={() => commit()}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        />
        <span className="shrink-0 pr-3 text-sm text-gray-400 dark:text-gray-500">{unit}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            className={cn(
              "rounded-lg border px-2 py-0.5 text-[11px] font-medium transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-40",
              value === p
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200"
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StudioSettingsPanel({ settings, plan, isApplying, locked = false, onChangeSetting, onApplyToPlan }: Props) {
  const { t } = useLanguage();
  const s = t.studioPage;
  const planApproved = plan?.status === "Approved";
  const canEdit = !locked && (!plan || plan.status === "AwaitingApproval" || plan.status === "Draft" || plan.status === "Rejected");
  const showApply = Boolean(!locked && plan && plan.status === "AwaitingApproval" && onApplyToPlan);
  const selectedTypes = settings?.questionTypes?.length
    ? settings.questionTypes
    : ["technical", "system_design", "problem_solving", "behavioral"];
  const totalQ = settings?.numberOfQuestions ?? 15;
  const qPerType = selectedTypes.length > 0 ? Math.round(totalQ / selectedTypes.length) : 0;

  const toggleType = (value: string) => {
    if (!canEdit || planApproved) return;
    const set = new Set(selectedTypes);
    if (set.has(value)) {
      if (set.size <= 1) return;
      set.delete(value);
    } else {
      set.add(value);
    }
    void onChangeSetting({ questionTypes: Array.from(set) });
  };

  const isReady = settings?.readiness?.canGenerateQuestions;
  const sourcesCount = plan?.sourcesUsed?.length ?? 0;
  const enabledTemplates = settings?.enabledCodeTemplates?.length
    ? settings.enabledCodeTemplates
    : DEFAULT_ENABLED_CODE_TEMPLATES;

  return (
    <div className={cn(portalCard, "relative space-y-4 p-4", locked && "opacity-60")}>
      {locked && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed rounded-xl"
          title={s.settings.lockedTitle}
          aria-hidden
        />
      )}
      <fieldset disabled={locked} className="min-w-0 space-y-4 border-0 p-0">

        {/* Status line */}
        {isReady ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/30">
            <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" strokeWidth={3} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{s.settings.readyToGenerate}</p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                {plan ? `${plan.totalQuestions} ${s.settings.unitQuestions} · ${plan.interviewLengthMinutes} ${s.settings.unitMin} · ${s.settings.statSources}: ${sourcesCount}` : `${totalQ} ${s.settings.unitQuestions}`}
              </p>
            </div>
          </div>
        ) : plan ? (
          <div className="flex items-center gap-2 rounded-xl bg-primary/8 px-3 py-2.5 dark:bg-primary/15">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className={cn("text-xs font-semibold", portalHeading)}>
                {planApproved ? s.settings.planApproved : s.settings.planPending}
              </p>
              <p className={cn("text-[10px]", portalSubtext)}>
                {plan.totalQuestions} {s.settings.unitQuestions} · {plan.interviewLengthMinutes} {s.settings.unitMin} · {sourcesCount}
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Plan quick controls ── */}
        <section className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel text={s.settings.sectionPlan} />
            {planApproved && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">{s.settings.locked}</span>
            )}
          </div>

          <NumberInputField
            label={s.settings.duration}
            value={settings?.interviewLengthMinutes ?? 60}
            unit={s.settings.unitMin}
            min={15}
            max={180}
            presets={[30, 45, 60, 75, 90, 120]}
            disabled={!canEdit || planApproved}
            onChange={(v) => void onChangeSetting({ interviewLengthMinutes: v })}
          />
          <NumberInputField
            label={s.settings.questionCount}
            value={settings?.numberOfQuestions ?? 15}
            unit={s.settings.unitQuestions}
            min={5}
            max={50}
            presets={[5, 10, 15, 20, 25, 30]}
            disabled={!canEdit || planApproved}
            onChange={(v) => void onChangeSetting({ numberOfQuestions: v })}
          />
          <SelectField
            label={s.settings.difficulty}
            value={settings?.difficulty ?? "Medium"}
            onChange={(v) => void onChangeSetting({ difficulty: v as StudioSettings["difficulty"] })}
            options={[
              { value: "Easy",   label: s.settings.easyDesc },
              { value: "Medium", label: s.settings.mediumDesc },
              { value: "Hard",   label: s.settings.hardDesc },
            ]}
            disabled={!canEdit || planApproved}
          />

          {/* Question types */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className={cn("text-xs font-medium", portalHeading)}>{s.settings.questionTypes}</p>
              <span className={cn("text-[10px]", portalSubtext)}>
                {selectedTypes.length}/{QUESTION_TYPE_OPTIONS.length} · {s.settings.perType.replace("{{count}}", String(qPerType))}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUESTION_TYPE_OPTIONS.map((opt) => {
                const active = selectedTypes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!canEdit || planApproved}
                    onClick={() => toggleType(opt.value)}
                    title={opt.label}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
                    )}
                  >
                    {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                    {opt.shortLabel}
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
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-primary-hover transition-colors"
            >
              {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {isApplying ? s.settings.applying : s.settings.applyToPlan}
            </button>
          )}
        </section>

        {/* ── Generate output ── */}
        <section className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
          <SectionLabel text={s.settings.sectionOutput} />
          <SelectField
            label={s.settings.toneLabel}
            value={settings?.questionTone ?? "Professional"}
            onChange={(v) => void onChangeSetting({ questionTone: v })}
            options={[
              { value: "Professional", label: "Professional" },
              { value: "Concise",      label: "Concise" },
              { value: "Friendly",     label: "Friendly" },
            ]}
          />
          <SelectField
            label={s.settings.formatLabel}
            value={settings?.outputFormat ?? "StructuredInterviewKit"}
            onChange={(v) => void onChangeSetting({ outputFormat: v })}
            options={[
              { value: "StructuredInterviewKit", label: "Structured Interview Kit" },
              { value: "SimpleList",             label: "Simple List" },
              { value: "TechnicalDeepDive",      label: "Technical Deep Dive" },
            ]}
          />
          <SelectField
            label={s.settings.contentModeLabel}
            value={settings?.contentMode ?? "Mixed"}
            onChange={(v) => void onChangeSetting({ contentMode: v as StudioSettings["contentMode"] })}
            options={[
              { value: "TheoryOnly", label: s.settings.contentModeTheory },
              { value: "CodeOnly", label: s.settings.contentModeCode },
              { value: "Mixed", label: s.settings.contentModeMixed },
            ]}
          />
          <div className="space-y-2">
            <p className={cn("text-xs font-medium", portalHeading)}>{s.settings.codeTemplatesLabel}</p>
            <p className={cn("text-[10px]", portalSubtext)}>{s.settings.codeTemplatesHint}</p>
            <div className="flex flex-wrap gap-1.5">
              {STUDIO_QUESTION_TEMPLATES.map((tpl) => {
                const active = enabledTemplates.includes(tpl.id);
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      const current = new Set(enabledTemplates);
                      if (current.has(tpl.id)) {
                        if (current.size <= 1) return;
                        current.delete(tpl.id);
                      } else {
                        current.add(tpl.id);
                      }
                      void onChangeSetting({ enabledCodeTemplates: Array.from(current) as StudioSettings["enabledCodeTemplates"] });
                    }}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
                    )}
                  >
                    {active && <CheckCircle2 className="h-3 w-3" />}
                    {tpl.label}
                  </button>
                );
              })}
            </div>
          </div>
          <SelectField
            label={s.settings.languageLabel}
            value={settings?.outputLanguage ?? "Vietnamese"}
            onChange={(v) => void onChangeSetting({ outputLanguage: v })}
            options={[
              { value: "Vietnamese", label: "Tiếng Việt" },
              { value: "English",    label: "English" },
            ]}
          />
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-xs font-medium", portalHeading)}>{s.settings.sampleAnswers}</p>
                <p className={cn("text-[10px]", portalSubtext)}>{s.settings.sampleAnswersDesc}</p>
              </div>
              <Toggle
                checked={settings?.includeSampleAnswers ?? true}
                onChange={(checked) => void onChangeSetting({ includeSampleAnswers: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-xs font-medium", portalHeading)}>{s.settings.scoringRubric}</p>
                <p className={cn("text-[10px]", portalSubtext)}>{s.settings.scoringRubricDesc}</p>
              </div>
              <Toggle
                checked={settings?.includeScoringRubric ?? true}
                onChange={(checked) => void onChangeSetting({ includeScoringRubric: checked })}
              />
            </div>
          </div>
        </section>

        {/* ── Plan stats ── */}
        {plan && (
          <section className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="mb-2.5 flex items-center gap-1.5">
              <FileQuestion className="h-3.5 w-3.5 text-gray-400" />
              <SectionLabel text={s.settings.sectionStats} />
            </div>
            <dl className="space-y-1.5">
              {[
                { label: s.settings.statTotal,    value: String(plan.totalQuestions) },
                { label: s.settings.statDuration, value: `${plan.interviewLengthMinutes} ${s.settings.unitMin}` },
                { label: s.settings.statRevision, value: `Rev ${plan.revision}` },
                { label: s.settings.statSources,  value: String(sourcesCount) },
                {
                  label: s.settings.statDifficulty,
                  value: (() => {
                    const m = plan.difficultyMix ?? { easy: 0, medium: 0, hard: 0 };
                    const e = Math.round(m.easy * 100);
                    const med = Math.round(m.medium * 100);
                    const h = Math.round(m.hard * 100);
                    return `${e}E · ${med}M · ${h}H`;
                  })(),
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <dt className={cn("text-[11px]", portalSubtext)}>{label}</dt>
                  <dd className={cn("text-[11px] font-semibold", portalHeading)}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </fieldset>
    </div>
  );
}
