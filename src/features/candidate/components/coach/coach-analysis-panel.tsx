"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, ScanSearch, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import {
  COACH_SKILL_CATALOG,
  normalizeSkillKey,
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

const fieldCls = cn(
  "w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700",
  "bg-white dark:bg-gray-900 text-[13px]",
  "disabled:opacity-50"
);

/** Signature ổn định để sync props → state, tránh reset khi chỉ đổi reference mảng. */
function skillsSignature(list: string[]): string {
  return list
    .map((s) => normalizeSkillKey(s))
    .filter(Boolean)
    .sort()
    .join("|");
}

/** Dedup theo normalizeSkillKey, giữ casing phần tử đầu. */
function dedupeSkills(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const key = normalizeSkillKey(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(raw.trim());
  }
  return out;
}

function hasSkill(list: string[], name: string): boolean {
  const key = normalizeSkillKey(name);
  if (!key) return false;
  return list.some((s) => normalizeSkillKey(s) === key);
}

function resolveSourceSkills(context: CoachContext | null, cv: CvInfo | null): string[] {
  return dedupeSkills(context?.skills?.length ? context.skills : cv?.skills ?? []);
}

/**
 * SCRUM-501/502/504: chip + dropdown catalog.
 * - Chặn trùng (normalize) + báo rõ
 * - Không reset chip local khi context chỉ đổi reference mảng
 * - Không giới hạn số kỹ năng: đề chẩn đoán tự chọn 3–8 skill trọng tâm (SCRUM-504)
 */
export function CoachAnalysisPanel({
  context,
  cv,
  savingSkills = false,
  onContinue,
}: CoachAnalysisPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

  const sourceSkills = useMemo(
    () => resolveSourceSkills(context, cv),
    // Chỉ đổi khi nội dung skill thay đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skillsSignature(context?.skills ?? []), skillsSignature(cv?.skills ?? [])]
  );
  const sourceSig = skillsSignature(sourceSkills);

  const [skills, setSkills] = useState<string[]>(sourceSkills);
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState<"duplicate" | null>(null);
  const summary = context?.summary || cv?.summary;
  const years = context?.yearsOfExperience;

  // Sync từ CV/context chỉ khi nội dung skill phía server đổi — giữ chip vừa thêm local.
  useEffect(() => {
    setSkills(sourceSkills);
  }, [sourceSig, sourceSkills]);

  const catalogOptions = useMemo(() => {
    const taken = new Set(skills.map((s) => normalizeSkillKey(s)).filter(Boolean));
    return COACH_SKILL_CATALOG.filter((name) => !taken.has(normalizeSkillKey(name)));
  }, [skills]);

  function addFromCatalog(rawName?: string) {
    const name = (rawName ?? selected).trim();
    if (!name) return;

    if (hasSkill(skills, name)) {
      setFeedback("duplicate");
      setSelected("");
      return;
    }

    setSkills((prev) => (hasSkill(prev, name) ? prev : [...prev, name]));
    setSelected("");
    setFeedback(null);
  }

  function removeSkill(name: string) {
    const key = normalizeSkillKey(name);
    setSkills((prev) => prev.filter((s) => normalizeSkillKey(s) !== key));
    setFeedback(null);
  }

  const canContinue = skills.length >= 1 && !savingSkills;
  const catalogExhausted = catalogOptions.length === 0;
  const canAdd = Boolean(selected) && !savingSkills && !catalogExhausted;

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
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn("text-[11px] font-semibold", portalHeadingAlt)}>{p.skillsEditLabel}</p>
            <p className={cn("text-[11px] tabular-nums font-semibold", portalSubtextAlt)}>
              {p.skillsCountLabel.replace("{{count}}", String(skills.length))}
            </p>
          </div>
          <p className={cn("text-[11px]", portalSubtextAlt)}>{p.skillsEditHint}</p>

          {/* SCRUM-504: không chặn số lượng, chỉ giải thích vì sao danh sách dài vẫn an toàn */}
          <p className={cn("text-[11px] leading-relaxed", portalSubtextAlt)}>{p.skillsFocusNote}</p>

          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
            {skills.map((s) => {
              const si = getSkillIcon(s);
              const SIcon = si?.icon;
              return (
                <span
                  key={normalizeSkillKey(s) || s}
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
                onChange={(e) => {
                  const value = e.target.value;
                  setFeedback(null);
                  if (value) {
                    // Chọn xong thêm ngay — tránh kẹt vì quên bấm Thêm / selected lệch option
                    addFromCatalog(value);
                  } else {
                    setSelected("");
                  }
                }}
                disabled={savingSkills || catalogExhausted}
                className={cn(fieldCls, "flex-1")}
                aria-label={p.skillsAddPlaceholder}
              >
                <option value="">
                  {catalogExhausted ? p.skillsCatalogEmpty : p.skillsCatalogSelectHint}
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
                onClick={() => addFromCatalog()}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-[12px] font-semibold border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50"
              >
                <Plus size={14} />
                {p.skillsAddBtn}
              </button>
            </div>
            <p className={cn("text-[11px]", portalSubtextAlt)}>
              {`${p.skillsCatalogHint}${
                !catalogExhausted
                  ? ` · ${p.skillsCatalogRemaining.replace("{{count}}", String(catalogOptions.length))}`
                  : ""
              }`}
            </p>
          </label>

          {feedback === "duplicate" && (
            <p className="inline-flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
              {p.skillsDuplicate}
            </p>
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
