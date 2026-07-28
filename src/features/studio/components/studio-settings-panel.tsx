"use client";

import { useState } from "react";
import { Check, FileQuestion, Loader2, Sparkles } from "lucide-react";
import { SelectField } from "@/shared/components/ui/select-field";
import { Toggle } from "@/shared/components/ui/toggle";
import { cn } from "@/lib/cn";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type { PlanDetail, StudioSettings } from "@/features/studio/types/studio.types";

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

  return (
    <div className={cn(portalCard, "relative space-y-4 p-4", locked && "opacity-60")}>
      {locked && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed rounded-xl"
          title="Đã khóa — bấm Tạo bộ mới để chỉnh Studio"
          aria-hidden
        />
      )}
      <fieldset disabled={locked} className="min-w-0 space-y-4 border-0 p-0">

        {/* Status line */}
        {isReady ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/30">
            <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" strokeWidth={3} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Sẵn sàng sinh câu hỏi</p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                {plan ? `${plan.totalQuestions} câu · ${plan.interviewLengthMinutes} phút · ${sourcesCount} nguồn` : `${totalQ} câu`}
              </p>
            </div>
          </div>
        ) : plan ? (
          <div className="flex items-center gap-2 rounded-xl bg-primary/8 px-3 py-2.5 dark:bg-primary/15">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className={cn("text-xs font-semibold", portalHeading)}>
                {planApproved ? "Kế hoạch đã duyệt" : "Kế hoạch chờ duyệt"}
              </p>
              <p className={cn("text-[10px]", portalSubtext)}>
                {plan.totalQuestions} câu · {plan.interviewLengthMinutes} phút · {sourcesCount} nguồn
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Plan quick controls ── */}
        <section className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel text="Cấu hình kế hoạch" />
            {planApproved && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">Đã khóa</span>
            )}
          </div>

          <NumberInputField
            label="Thời lượng"
            value={settings?.interviewLengthMinutes ?? 60}
            unit="phút"
            min={15}
            max={180}
            presets={[30, 45, 60, 75, 90, 120]}
            disabled={!canEdit || planApproved}
            onChange={(v) => void onChangeSetting({ interviewLengthMinutes: v })}
          />
          <NumberInputField
            label="Số câu hỏi"
            value={settings?.numberOfQuestions ?? 15}
            unit="câu"
            min={5}
            max={50}
            presets={[5, 10, 15, 20, 25, 30]}
            disabled={!canEdit || planApproved}
            onChange={(v) => void onChangeSetting({ numberOfQuestions: v })}
          />
          <SelectField
            label="Độ khó"
            value={settings?.difficulty ?? "Medium"}
            onChange={(v) => void onChangeSetting({ difficulty: v as StudioSettings["difficulty"] })}
            options={[
              { value: "Easy",   label: "Easy — câu hỏi cơ bản" },
              { value: "Medium", label: "Medium — tiêu chuẩn" },
              { value: "Hard",   label: "Hard — thử thách cao" },
            ]}
            disabled={!canEdit || planApproved}
          />

          {/* Question types */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className={cn("text-xs font-medium", portalHeading)}>Loại câu hỏi</p>
              <span className={cn("text-[10px]", portalSubtext)}>
                {selectedTypes.length}/{QUESTION_TYPE_OPTIONS.length} loại · ~{qPerType} câu/loại
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
              {isApplying ? "Đang áp dụng…" : "Áp dụng vào kế hoạch"}
            </button>
          )}
        </section>

        {/* ── Generate output ── */}
        <section className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
          <SectionLabel text="Tùy chọn output" />
          <SelectField
            label="Văn phong câu hỏi"
            value={settings?.questionTone ?? "Professional"}
            onChange={(v) => void onChangeSetting({ questionTone: v })}
            options={[
              { value: "Professional", label: "Professional — trang trọng" },
              { value: "Concise",      label: "Concise — ngắn gọn" },
              { value: "Friendly",     label: "Friendly — thân thiện" },
            ]}
          />
          <SelectField
            label="Định dạng output"
            value={settings?.outputFormat ?? "StructuredInterviewKit"}
            onChange={(v) => void onChangeSetting({ outputFormat: v })}
            options={[
              { value: "StructuredInterviewKit", label: "Structured Interview Kit" },
              { value: "SimpleList",             label: "Simple List" },
              { value: "TechnicalDeepDive",      label: "Technical Deep Dive" },
            ]}
          />
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-xs font-medium", portalHeading)}>Sample answers</p>
                <p className={cn("text-[10px]", portalSubtext)}>Gợi ý câu trả lời mẫu</p>
              </div>
              <Toggle
                checked={settings?.includeSampleAnswers ?? true}
                onChange={(checked) => void onChangeSetting({ includeSampleAnswers: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-xs font-medium", portalHeading)}>Scoring rubric</p>
                <p className={cn("text-[10px]", portalSubtext)}>Tiêu chí đánh giá câu trả lời</p>
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
              <SectionLabel text="Thống kê kế hoạch" />
            </div>
            <dl className="space-y-1.5">
              {[
                { label: "Tổng số câu", value: String(plan.totalQuestions) },
                { label: "Thời lượng",  value: `${plan.interviewLengthMinutes} phút` },
                { label: "Phiên bản",   value: `Rev ${plan.revision}` },
                { label: "Nguồn RAG",   value: `${sourcesCount} nguồn` },
                {
                  label: "Độ khó",
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
