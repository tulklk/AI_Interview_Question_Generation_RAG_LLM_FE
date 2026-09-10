"use client";

import { CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtext } from "@/shared/utils/portal-ui";
import {
  STUDIO_QUESTION_TEMPLATES,
  DEFAULT_ENABLED_CODE_TEMPLATES,
  type StudioCodeTemplateId,
} from "@/features/studio/constants/question-templates";

interface Props {
  enabled: StudioCodeTemplateId[];
  codingRecommended?: boolean;
  questionStyles?: string[];
  disabled?: boolean;
  onChange: (next: StudioCodeTemplateId[]) => void;
}

export function CodingTaskTypesPicker({
  enabled,
  codingRecommended,
  questionStyles = [],
  disabled,
  onChange,
}: Props) {
  const { t } = useLanguage();
  const cfg = t.studioPage.settings.config;
  const templates = STUDIO_QUESTION_TEMPLATES.filter((t) => t.id !== "SYSTEM_DESIGN");
  const selected = enabled?.length ? enabled : DEFAULT_ENABLED_CODE_TEMPLATES.filter((id) => id !== "SYSTEM_DESIGN");
  const styles = new Set(questionStyles.map((s) => s.toLowerCase()));
  const showCoding = codingRecommended ?? (styles.has("coding") || styles.has("problem_solving"));

  if (!showCoding) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 dark:border-gray-800 dark:bg-gray-900/40">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
        <p className={cn("text-[11px] leading-snug", portalSubtext)}>{cfg.codingNotRequired}</p>
      </div>
    );
  }

  const toggle = (id: StudioCodeTemplateId) => {
    if (disabled) return;
    const set = new Set(selected);
    if (set.has(id)) {
      if (set.size <= 1) return;
      set.delete(id);
    } else {
      set.add(id);
    }
    onChange(Array.from(set));
  };

  return (
    <div className="space-y-1.5">
      <p className={cn("text-[10px]", portalSubtext)}>{cfg.codingHint}</p>
      <div className="flex flex-wrap gap-1">
        {templates.map((tpl) => {
          const active = selected.includes(tpl.id);
          return (
            <button
              key={tpl.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(tpl.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              )}
            >
              {active && <CheckCircle2 className="h-3 w-3" />}
              {tpl.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
