"use client";

import { Toggle } from "@/shared/components/ui/toggle";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type { StudioContentMode, StudioSettings } from "@/features/studio/types/studio.types";

interface Props {
  settings: StudioSettings | null;
  disabled?: boolean;
  onChange: (patch: Partial<StudioSettings>) => void;
}

/** Nút chọn hình thức câu hỏi — hiện đủ nhãn (không truncate như select hẹp). */
function ContentModePills({
  value,
  disabled,
  options,
  onChange,
}: {
  value: StudioContentMode;
  disabled?: boolean;
  options: { value: StudioContentMode; label: string }[];
  onChange: (v: StudioContentMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!active) onChange(opt.value);
            }}
            className={cn(
              "rounded-full border px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              "whitespace-normal break-words",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Luôn hiện nội dung — không thu gọn / accordion. */
export function AdvancedSettingsAccordion({ settings, disabled, onChange }: Props) {
  const { t } = useLanguage();
  const s = t.studioPage.settings;
  const contentMode = (settings?.contentMode ?? "Mixed") as StudioContentMode;

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/40 overflow-hidden">
      <div className="px-3 pt-2.5 pb-1">
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide">
          {s.config.advancedSection}
        </span>
      </div>
      <div className="space-y-3 px-3 pb-3">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.contentModeLabel}</p>
          <ContentModePills
            value={contentMode}
            disabled={disabled}
            options={[
              { value: "TheoryOnly", label: s.contentModeTheory },
              { value: "CodeOnly", label: s.contentModeCode },
              { value: "Mixed", label: s.contentModeMixed },
            ]}
            onChange={(v) => onChange({ contentMode: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("text-xs font-medium", portalHeading)}>{s.sampleAnswers}</p>
            <p className={cn("text-[10px]", portalSubtext)}>{s.sampleAnswersDesc}</p>
          </div>
          <Toggle
            checked={settings?.includeSampleAnswers ?? true}
            disabled={disabled}
            onChange={(checked) => onChange({ includeSampleAnswers: checked })}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("text-xs font-medium", portalHeading)}>{s.scoringRubric}</p>
            <p className={cn("text-[10px]", portalSubtext)}>{s.scoringRubricDesc}</p>
          </div>
          <Toggle
            checked={settings?.includeScoringRubric ?? true}
            disabled={disabled}
            onChange={(checked) => onChange({ includeScoringRubric: checked })}
          />
        </div>
      </div>
    </div>
  );
}
