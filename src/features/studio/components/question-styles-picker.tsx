"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtext } from "@/shared/utils/portal-ui";
import { styleLabel } from "@/features/studio/utils/ai-config-helpers";

export const CANONICAL_QUESTION_STYLES = [
  "system_design",
  "problem_solving",
  "debugging",
  "performance_analysis",
  "coding",
  "code_review",
  "theory",
] as const;

interface Props {
  selected: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
}

export function QuestionStylesPicker({ selected, disabled, onChange }: Props) {
  const { t } = useLanguage();
  const cfg = t.studioPage.settings.config;

  const toggle = (style: string) => {
    if (disabled) return;
    const set = new Set(selected);
    if (set.has(style)) {
      if (set.size <= 1) return;
      set.delete(style);
    } else {
      set.add(style);
    }
    onChange(Array.from(set));
  };

  return (
    <div className="space-y-1.5">
      <p className={cn("text-[10px]", portalSubtext)}>{cfg.stylesHint}</p>
      <div className="flex flex-wrap gap-1">
        {CANONICAL_QUESTION_STYLES.map((style) => {
          const active = selected.includes(style);
          return (
            <button
              key={style}
              type="button"
              disabled={disabled}
              onClick={() => toggle(style)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              )}
            >
              {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              {styleLabel(style)}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-[10px] text-amber-700 dark:text-amber-300">
          {cfg.stylesMinOne ?? "Select at least 1 style."}
        </p>
      )}
    </div>
  );
}
