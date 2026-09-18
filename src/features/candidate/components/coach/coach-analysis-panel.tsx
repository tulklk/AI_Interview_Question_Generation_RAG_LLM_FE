"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type { CoachContext } from "@/features/candidate/services/coach.service";
import type { CvInfo } from "@/features/candidate/services/candidate-cv.service";

interface CoachAnalysisPanelProps {
  context: CoachContext | null;
  cv: CvInfo | null;
  savingSkills?: boolean;
  onContinue: (skills: string[]) => void | Promise<void>;
}

const MAX_SKILLS = 40;

/** SCRUM-463: chip công nghệ có thể +/− trước Confirm Goal. */
export function CoachAnalysisPanel({
  context,
  cv,
  savingSkills = false,
  onContinue,
}: CoachAnalysisPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const initialSkills = context?.skills?.length ? context.skills : cv?.skills ?? [];
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [draft, setDraft] = useState("");
  const summary = context?.summary || cv?.summary;
  const years = context?.yearsOfExperience;

  useEffect(() => {
    const next = context?.skills?.length ? context.skills : cv?.skills ?? [];
    setSkills(next);
  }, [context?.skills, cv?.skills]);

  function addSkill() {
    const trimmed = draft.trim().slice(0, 80);
    if (!trimmed) return;
    if (skills.length >= MAX_SKILLS) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setDraft("");
  }

  function removeSkill(name: string) {
    setSkills((prev) => prev.filter((s) => s !== name));
  }

  const canContinue = skills.length >= 1 && !savingSkills;

  return (
    <div className="hr-glass-card px-5 py-6 space-y-4">
      <div>
        <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.cvAnalysisHint}</p>
        <p className={cn("text-[12px] mt-1", portalSubtextAlt)}>{p.phaseAnalysisDesc}</p>
      </div>

      <p
        className={cn(
          "text-[11px] rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2",
          "dark:border-amber-900/40 dark:bg-amber-950/25 text-amber-900 dark:text-amber-100"
        )}
      >
        {p.cvPrepDisclaimer}
      </p>

      {context?.suggestedRole && (
        <p className="text-[13px]">
          {p.suggestedRoleLabel}:{" "}
          <span className="font-semibold text-primary">{context.suggestedRole}</span>
        </p>
      )}

      {years != null && Number.isFinite(years) && (
        <p className={cn("text-[12px]", portalSubtextAlt)}>
          {p.yearsFromCvLabel}:{" "}
          <span className={cn("font-semibold", portalHeadingAlt)}>{years}</span>
        </p>
      )}

      {summary ? (
        <p className={cn("text-[13px] leading-relaxed", portalHeadingAlt)}>{summary}</p>
      ) : (
        <p className={cn("text-[12px]", portalSubtextAlt)}>{p.analysisEmpty}</p>
      )}

      <div className="space-y-2">
        <p className={cn("text-[11px] font-semibold", portalHeadingAlt)}>{p.skillsEditLabel}</p>
        <p className={cn("text-[11px]", portalSubtextAlt)}>{p.skillsEditHint}</p>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-[11px] font-semibold pl-2 pr-1 py-1 rounded-full bg-primary/10 text-primary"
            >
              {s}
              <button
                type="button"
                disabled={savingSkills}
                onClick={() => removeSkill(s)}
                className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center disabled:opacity-50"
                aria-label={`${p.skillsRemoveAria}: ${s}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            maxLength={80}
            disabled={savingSkills || skills.length >= MAX_SKILLS}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder={p.skillsAddPlaceholder}
            className="flex-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[13px]"
          />
          <button
            type="button"
            disabled={savingSkills || !draft.trim() || skills.length >= MAX_SKILLS}
            onClick={addSkill}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-[12px] font-semibold border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50"
          >
            <Plus size={14} />
            {p.skillsAddBtn}
          </button>
        </div>
        {skills.length === 0 && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300">{p.skillsMinOne}</p>
        )}
      </div>

      <button
        type="button"
        disabled={!canContinue}
        onClick={() => void onContinue(skills)}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12px] font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50"
      >
        {savingSkills ? <Loader2 size={14} className="animate-spin" /> : null}
        {p.continueToGoal} →
      </button>
    </div>
  );
}
