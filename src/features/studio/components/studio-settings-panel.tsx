"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, FileQuestion, Sparkles } from "lucide-react";
import { SelectField } from "@/shared/components/ui/select-field";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type { PlanDetail, StudioSettings } from "@/features/studio/types/studio.types";
import {
  planSourceDisplayName,
  resolvePlanSourceRows,
  SourceOriginBadge,
} from "@/features/studio/components/source-origin-badge";
import { formatDifficultyMixLabel } from "@/features/studio/utils/difficulty-mix";
import { AdvancedSettingsAccordion } from "@/features/studio/components/advanced-settings-accordion";

interface Props {
  settings: StudioSettings | null;
  plan: PlanDetail | null;
  locked?: boolean;
  /** true khi draft chưa flush lên server */
  configDirty?: boolean;
  onChangeSetting: (patch: Partial<StudioSettings>) => void;
}

function SectionLabel({ text }: { text: string }) {
  return <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-300">{text}</p>;
}

function AccordionSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/40 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide">{label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-gray-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
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
          focused ? "border-primary ring-1 ring-primary/20" : "border-gray-200 dark:border-gray-700",
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
 * Cột phải (pre-plan): Time, Số câu, Language, Sample, Rubric.
 * Độ khó chỉnh trên plan (cột giữa) — không đặt ở đây.
 */
export function StudioSettingsPanel({ settings, plan, locked = false, configDirty = false, onChangeSetting }: Props) {
  const { t } = useLanguage();
  const s = t.studioPage;
  const planApproved = plan?.status === "Approved";
  const canEdit = !locked && (!plan || plan.status === "AwaitingApproval" || plan.status === "Draft" || plan.status === "Rejected");
  const prefsDisabled = !canEdit || planApproved;
  const totalQ = settings?.numberOfQuestions ?? 15;
  const minutes = settings?.interviewLengthMinutes ?? 60;

  const [openBasic, setOpenBasic] = useState(true);
  const [openFrame, setOpenFrame] = useState(true);

  const isReady = settings?.readiness?.canGenerateQuestions;
  const srcLabels = s.sources;
  const originLabels = useMemo(
    () => ({
      hr: srcLabels.sourceOriginHr,
      admin: srcLabels.sourceOriginAdmin,
      jd: srcLabels.sourceOriginJd,
      llm: srcLabels.sourceOriginLlm,
    }),
    [srcLabels.sourceOriginHr, srcLabels.sourceOriginAdmin, srcLabels.sourceOriginJd, srcLabels.sourceOriginLlm]
  );
  const sourceRows = useMemo(
    () => resolvePlanSourceRows(plan?.sourcesUsed, plan?.sourceDetails),
    [plan?.sourcesUsed, plan?.sourceDetails]
  );
  const sourcesCount = sourceRows.length;
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <div className={cn(portalCard, "relative space-y-3 p-4")}>
      {locked && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed rounded-xl"
          title={s.settings.lockedTitle}
          aria-hidden
        />
      )}
      <fieldset
        disabled={locked}
        className={cn(
          "min-w-0 space-y-3 border-0 p-0",
          locked && "pointer-events-none opacity-50",
          "disabled:[&_input]:opacity-60 disabled:[&_select]:opacity-60 disabled:[&_button]:opacity-60 disabled:[&_textarea]:opacity-60"
        )}
      >
        {isReady ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/30">
            <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" strokeWidth={3} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{s.settings.readyToGenerate}</p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                {plan
                  ? `${plan.totalQuestions} ${s.settings.unitQuestions} · ${plan.interviewLengthMinutes} ${s.settings.unitMin} · ${s.settings.statSources}: ${sourcesCount}`
                  : `${totalQ} ${s.settings.unitQuestions} · ${minutes} ${s.settings.unitMin}`}
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

        <AccordionSection
          label={s.settings.config.frameSection}
          open={openFrame}
          onToggle={() => setOpenFrame((v) => !v)}
        >
          <div className="grid grid-cols-1 gap-2.5">
            <CompactNumberField
              label={s.settings.questionCount}
              value={totalQ}
              unit={s.settings.unitQuestions}
              min={5}
              max={50}
              presets={[5, 10, 15, 20, 25, 30]}
              disabled={prefsDisabled}
              onChange={(v) => onChangeSetting({ numberOfQuestions: v })}
            />
            <CompactNumberField
              label={s.settings.duration}
              value={minutes}
              unit={s.settings.unitMin}
              min={15}
              max={180}
              presets={[30, 45, 60, 75, 90, 120]}
              disabled={prefsDisabled}
              onChange={(v) => onChangeSetting({ interviewLengthMinutes: v })}
            />
          </div>
        </AccordionSection>

        <AccordionSection
          label={s.settings.sectionLanguagePrefs}
          open={openBasic}
          onToggle={() => setOpenBasic((v) => !v)}
        >
          <SelectField
            label={s.settings.languageLabel}
            value={settings?.outputLanguage ?? "Vietnamese"}
            onChange={(v) => onChangeSetting({ outputLanguage: v })}
            options={[
              { value: "Vietnamese", label: "Tiếng Việt" },
              { value: "English", label: "English" },
            ]}
            disabled={prefsDisabled}
          />
        </AccordionSection>

        <AdvancedSettingsAccordion
          settings={settings}
          disabled={prefsDisabled}
          onChange={(patch) => onChangeSetting(patch)}
        />

        {plan && (
          <section className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="mb-2.5 flex items-center gap-1.5">
              <FileQuestion className="h-3.5 w-3.5 text-gray-400" />
              <SectionLabel text={s.settings.sectionStats} />
            </div>
            <dl className="space-y-1.5">
              {[
                { label: s.settings.statTotal, value: String(plan.totalQuestions) },
                { label: s.settings.statDuration, value: `${plan.interviewLengthMinutes} ${s.settings.unitMin}` },
                { label: s.settings.statRevision, value: `Rev ${plan.revision}` },
                {
                  label: s.settings.statDifficulty,
                  value: (() => {
                    const m = plan.difficultyMix ?? { easy: 0, medium: 0, hard: 0 };
                    return formatDifficultyMixLabel(m, plan.totalQuestions);
                  })(),
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <dt className={cn("text-[11px]", portalSubtext)}>{label}</dt>
                  <dd className={cn("text-[11px] font-semibold", portalHeading)}>{value}</dd>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <dt className={cn("text-[11px]", portalSubtext)}>{s.settings.statSources}</dt>
                  <dd className="flex items-center gap-1">
                    <span className={cn("text-[11px] font-semibold", portalHeading)}>{sourcesCount}</span>
                    {sourcesCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setSourcesOpen((v) => !v)}
                        className="ml-0.5 text-gray-400 hover:text-primary transition-colors"
                        title={sourcesOpen ? s.settings.sourcesCollapse : s.settings.sourcesExpand}
                      >
                        <ChevronRight className={cn("h-3 w-3 transition-transform duration-150", sourcesOpen && "rotate-90")} />
                      </button>
                    )}
                  </dd>
                </div>
                {sourcesOpen && sourceRows.length > 0 && (
                  <ul className="mt-0.5 space-y-1 pl-1">
                    {sourceRows.map((row) => (
                      <li
                        key={row.name}
                        className={cn(
                          "flex items-center gap-1.5 truncate rounded px-1.5 py-0.5",
                          "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        <SourceOriginBadge scopeOrKb={row.scope} sourceFile={row.name} labels={originLabels} />
                        <span className="truncate text-[10px]">
                          {planSourceDisplayName(row.name, srcLabels.sourceOriginJd)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </dl>
          </section>
        )}
      </fieldset>
    </div>
  );
}
