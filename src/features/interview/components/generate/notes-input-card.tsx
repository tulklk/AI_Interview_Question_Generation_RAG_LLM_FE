"use client";

import { StickyNote } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalCard, portalHeading, portalInput, portalSubtext } from "@/shared/utils/portal-ui";
import type { QuestionType } from "@/features/interview/types/generation-session";

const ALL_TYPES: QuestionType[] = ["Technical", "Behavioral", "Situational", "System-design", "Problem-solving"];

interface NotesInputCardProps {
  selectedTypes: QuestionType[];
  focusSkills: string;
  additionalNote: string;
  onTypesChange: (types: QuestionType[]) => void;
  onFocusSkillsChange: (value: string) => void;
  onAdditionalNoteChange: (value: string) => void;
}

export function NotesInputCard({
  selectedTypes,
  focusSkills,
  additionalNote,
  onTypesChange,
  onFocusSkillsChange,
  onAdditionalNoteChange,
}: NotesInputCardProps) {
  const { t } = useLanguage();
  const n = t.generationSessionPage.notes;

  function toggleType(type: QuestionType) {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  }

  return (
    <div className={cn(portalCard, "shadow-sm p-6 space-y-5")}>
      <div className="flex items-center gap-2">
        <StickyNote size={16} className="text-gray-400 dark:text-gray-500" />
        <h2 className={cn("text-base font-semibold", portalHeading)}>{n.title}</h2>
        <span className={cn("text-xs ml-1", portalSubtext)}>{n.subtitle}</span>
      </div>

      {/* Question Types */}
      <div className="space-y-2">
        <label className={cn("text-sm font-medium", portalHeading)}>
          {n.questionTypes}
          <span className={cn("text-xs font-normal ml-2", portalSubtext)}>
            {n.questionTypesHint}
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((type) => {
            const selected = selectedTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                  selected
                    ? "bg-[#6c47ff] text-white border-[#6c47ff]"
                    : cn(
                        "border-gray-200 dark:border-gray-700",
                        portalSubtext,
                        "hover:border-[#6c47ff] hover:text-[#6c47ff]"
                      )
                )}
              >
                {n.typeLabels[type]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Focus Skills */}
      <div className="space-y-1.5">
        <label className={cn("text-sm font-medium", portalHeading)}>{n.focusSkills}</label>
        <input
          type="text"
          value={focusSkills}
          onChange={(e) => onFocusSkillsChange(e.target.value)}
          placeholder={n.focusSkillsPlaceholder}
          className={cn(
            "w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
            portalInput
          )}
        />
      </div>

      {/* Additional Notes */}
      <div className="space-y-1.5">
        <label className={cn("text-sm font-medium", portalHeading)}>{n.additionalNote}</label>
        <textarea
          value={additionalNote}
          onChange={(e) => onAdditionalNoteChange(e.target.value)}
          placeholder={n.additionalNotePlaceholder}
          rows={3}
          className={cn(
            "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
            portalInput
          )}
        />
      </div>
    </div>
  );
}
