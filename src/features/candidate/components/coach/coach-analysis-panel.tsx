"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, ScanSearch, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import { COACH_SKILL_CATALOG } from "@/features/candidate/utils/coach-skill-catalog";
import type { CoachContext } from "@/features/candidate/services/coach.service";
import type { CvInfo } from "@/features/candidate/services/candidate-cv.service";
import { CoachStepHeader } from "@/features/candidate/components/coach/coach-step-header";

interface CoachAnalysisPanelProps {
  context: CoachContext | null;
  cv: CvInfo | null;
  savingSkills?: boolean;
  onContinue: (skills: string[]) => void | Promise<void>;
}

const MAX_SKILLS = 40;

const fieldCls = cn(
  "w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700",
  "bg-white dark:bg-gray-900 text-[13px]",
  "disabled:opacity-50"
);

/** SCRUM-501: chip công nghệ + dropdown catalog (giống Vị trí mục tiêu), bỏ free-text. */
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
  const [selected, setSelected] = useState("");
  const summary = context?.summary || cv?.summary;
  const years = context?.yearsOfExperience;

  useEffect(() => {
    const next = context?.skills?.length ? context.skills : cv?.skills ?? [];
    setSkills(next);
  }, [context?.skills, cv?.skills]);

  const catalogOptions = useMemo(() => {
    const taken = new Set(skills.map((s) => s.toLowerCase()));
    return COACH_SKILL_CATALOG.filter((name) => !taken.has(name.toLowerCase()));
  }, [skills]);

  function addFromCatalog() {
    const name = selected.trim();
    if (!name || skills.length >= MAX_SKILLS) return;
    if (skills.some((s) => s.toLowerCase() === name.toLowerCase())) {
      setSelected("");
      return;
    }
    setSkills((prev) => [...prev, name]);
    setSelected("");
  }

  function removeSkill(name: string) {
    setSkills((prev) => prev.filter((s) => s !== name));
  }

  const canContinue = skills.length >= 1 && !savingSkills;
  const canAdd =
    Boolean(selected) && !savingSkills && skills.length < MAX_SKILLS && catalogOptions.length > 0;

  return (
    <div className="hr-glass-card overflow-hidden">
      <CoachStepHeader
        icon={ScanSearch}
        title={p.cvAnalysisHint}
        subtitle={p.phaseAnalysisDesc}
        iconWrapClassName="bg-violet-100 dark:bg-violet-950/50"
        iconClassName="text-violet-600 dark:text-violet-400"
      />
      <div className="space-y-4 px-5 py-5">
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
            {skills.map((s) => {
              const si = getSkillIcon(s);
              const SIcon = si?.icon;
              return (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold pl-2 pr-1 py-1 rounded-full bg-primary/10 text-primary"
                >
                  {SIcon ? <SIcon size={11} className={cn("shrink-0", si.className)} /> : null}
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
              );
            })}
          </div>

          <label className="block space-y-1.5">
            <span className={cn("text-[11px] font-medium", portalHeadingAlt)}>
              {p.skillsAddPlaceholder}
            </span>
            <div className="flex gap-2">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                disabled={savingSkills || skills.length >= MAX_SKILLS || catalogOptions.length === 0}
                className={cn(fieldCls, "flex-1")}
                aria-label={p.skillsAddPlaceholder}
              >
                <option value="">
                  {catalogOptions.length === 0 ? p.skillsCatalogEmpty : p.skillsCatalogSelectHint}
                </option>
                {catalogOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!canAdd}
                onClick={addFromCatalog}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-[12px] font-semibold border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50"
              >
                <Plus size={14} />
                {p.skillsAddBtn}
              </button>
            </div>
            <p className={cn("text-[11px]", portalSubtextAlt)}>{p.skillsCatalogHint}</p>
          </label>

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
    </div>
  );
}
