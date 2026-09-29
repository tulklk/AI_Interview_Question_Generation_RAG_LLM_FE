"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, ScanSearch, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import {
  COACH_SKILL_MAX_LEN,
  isInSkillCatalog,
  resolveCatalogSkill,
  suggestCoachSkills,
  validateCoachSkillFormat,
  type CoachSkillFormatError,
} from "@/features/candidate/utils/coach-skill-catalog";
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

/** SCRUM-463 + SCRUM-491: chip công nghệ +/− với hybrid validate / autocomplete. */
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
  const [formatError, setFormatError] = useState<CoachSkillFormatError | null>(null);
  const [softWarn, setSoftWarn] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const summary = context?.summary || cv?.summary;
  const years = context?.yearsOfExperience;

  useEffect(() => {
    const next = context?.skills?.length ? context.skills : cv?.skills ?? [];
    setSkills(next);
  }, [context?.skills, cv?.skills]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!inputWrapRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const suggestions = useMemo(
    () => suggestCoachSkills(draft, skills, 8),
    [draft, skills]
  );

  function formatErrorMessage(code: CoachSkillFormatError): string {
    switch (code) {
      case "empty":
        return p.skillsFormatEmpty;
      case "too_short":
        return p.skillsFormatTooShort;
      case "too_long":
        return p.skillsFormatTooLong;
      case "invalid_chars":
        return p.skillsFormatInvalidChars;
      case "no_letter":
        return p.skillsFormatNoLetter;
      default:
        return p.skillsFormatInvalidChars;
    }
  }

  function commitSkill(raw: string) {
    const catalogHit = resolveCatalogSkill(raw);
    const trimmed = (catalogHit ?? raw.trim()).slice(0, COACH_SKILL_MAX_LEN);
    const err = validateCoachSkillFormat(trimmed);
    if (err) {
      setFormatError(err);
      setSoftWarn(false);
      return;
    }
    if (skills.length >= MAX_SKILLS) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      setFormatError(null);
      setSoftWarn(false);
      setShowSuggestions(false);
      return;
    }
    const fromCatalog = isInSkillCatalog(trimmed);
    setSkills((prev) => [...prev, trimmed]);
    setDraft("");
    setFormatError(null);
    setSoftWarn(!fromCatalog);
    setShowSuggestions(false);
  }

  function addSkill() {
    commitSkill(draft);
  }

  function removeSkill(name: string) {
    setSkills((prev) => prev.filter((s) => s !== name));
  }

  const canContinue = skills.length >= 1 && !savingSkills;

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
        <div className="relative space-y-1.5" ref={inputWrapRef}>
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              maxLength={COACH_SKILL_MAX_LEN}
              disabled={savingSkills || skills.length >= MAX_SKILLS}
              onChange={(e) => {
                setDraft(e.target.value);
                setFormatError(null);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (suggestions.length === 1) commitSkill(suggestions[0]);
                  else addSkill();
                } else if (e.key === "Escape") {
                  setShowSuggestions(false);
                }
              }}
              placeholder={p.skillsAddPlaceholder}
              className="flex-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[13px]"
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
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
          {showSuggestions && suggestions.length > 0 && (
            <ul
              className={cn(
                "absolute z-20 left-0 right-16 mt-0.5 max-h-48 overflow-auto rounded-lg border",
                "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md py-1"
              )}
              role="listbox"
            >
              {suggestions.map((item) => (
                <li key={item} role="option">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-primary/10 text-gray-800 dark:text-gray-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commitSkill(item)}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {formatError && (
          <p className="text-[11px] text-red-600 dark:text-red-400">
            {formatErrorMessage(formatError)}
          </p>
        )}
        {softWarn && !formatError && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300">{p.skillsCatalogSoftWarn}</p>
        )}
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
