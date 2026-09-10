"use client";

import { useEffect } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtext } from "@/shared/utils/portal-ui";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import type { StudioFocusAreaItem } from "@/features/studio/types/studio.types";
import {
  equalSplitFocusWeightsTo100,
  normalizeFocusWeight,
  redistributeFocusWeightsTo100,
  redistributePercentages,
  sumFocusWeights,
} from "@/features/studio/utils/distribution-math";
import {
  hasDuplicateFocusNames,
  matchJdSkill,
  normalizeFocusAreasToJdSkills,
} from "@/features/studio/utils/focus-area-jd";

interface Props {
  focusAreas: StudioFocusAreaItem[];
  disabled?: boolean;
  /** Nếu có: chỉ chọn skill JD — không gõ focus tự do. */
  allowedSkillNames?: string[];
  onChange: (next: StudioFocusAreaItem[]) => void;
}

function resolveSelectValue(
  currentName: string,
  catalog: string[],
  usedElsewhere: Set<string>
): string {
  const matched = matchJdSkill(currentName, catalog);
  if (matched) return matched;
  const unused = catalog.find((s) => !usedElsewhere.has(s.toLowerCase()));
  return unused ?? catalog[0] ?? currentName;
}

export function FocusAreasEditor({ focusAreas, disabled, allowedSkillNames, onChange }: Props) {
  const { t } = useLanguage();
  const cfg = t.studioPage.settings.config;
  const catalog = (allowedSkillNames ?? []).map((s) => s.trim()).filter(Boolean);
  const useCatalog = catalog.length > 0;
  const sum = Math.round(sumFocusWeights(focusAreas) * 10) / 10;
  const valid = focusAreas.length === 0 || Math.abs(sum - 100) <= 0.5;
  const barPct = Math.min(100, Math.max(0, sum));

  const unusedSkills = catalog.filter(
    (s) => !focusAreas.some((fa) => fa.name.toLowerCase() === s.toLowerCase())
  );
  const allSkillsUsed = useCatalog && unusedSkills.length === 0;

  useEffect(() => {
    if (!useCatalog || focusAreas.length === 0) return;
    const needs =
      hasDuplicateFocusNames(focusAreas) ||
      focusAreas.some(
        (fa) => !catalog.some((s) => s.toLowerCase() === fa.name.trim().toLowerCase())
      );
    if (!needs) return;
    onChange(normalizeFocusAreasToJdSkills(focusAreas, catalog));
  }, [useCatalog, catalog.join("|"), focusAreas.map((f) => f.name).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateItem = (index: number, patch: Partial<StudioFocusAreaItem>) => {
    if (patch.weight !== undefined) {
      const pcts = redistributePercentages(
        focusAreas.map((fa) => normalizeFocusWeight(fa.weight)),
        index,
        Number(patch.weight)
      );
      onChange(
        focusAreas.map((fa, i) => ({
          ...fa,
          weight: pcts[i] ?? 0,
          orderIndex: i,
        }))
      );
      return;
    }
    onChange(focusAreas.map((fa, i) => (i === index ? { ...fa, ...patch } : fa)));
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...focusAreas];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((fa, i) => ({ ...fa, orderIndex: i })));
  };

  const addArea = () => {
    if (useCatalog) {
      const unused = unusedSkills[0];
      if (!unused) return;
      onChange(
        equalSplitFocusWeightsTo100([
          ...focusAreas,
          { name: unused, weight: 0, orderIndex: focusAreas.length },
        ])
      );
      return;
    }
    onChange(
      equalSplitFocusWeightsTo100([
        ...focusAreas,
        {
          name: cfg.newFocusName,
          weight: 0,
          orderIndex: focusAreas.length,
        },
      ])
    );
  };

  const remove = (index: number) => {
    onChange(redistributeFocusWeightsTo100(focusAreas.filter((_, i) => i !== index)));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-[10px] leading-snug", portalSubtext)}>{cfg.focusHint}</p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold tabular-nums",
            valid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300"
          )}
        >
          {cfg.focusSum.replace("{{sum}}", String(sum))}
          {valid ? <Check className="h-3 w-3" strokeWidth={3} /> : <AlertTriangle className="h-3 w-3" />}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn("h-full rounded-full transition-all", valid ? "bg-emerald-500" : "bg-amber-500")}
          style={{ width: `${barPct}%` }}
        />
      </div>

      <ul className="space-y-1">
        {focusAreas.map((fa, idx) => {
          const usedElsewhere = new Set(
            focusAreas
              .filter((_, i) => i !== idx)
              .map((x) => x.name.toLowerCase())
          );
          const selectValue = useCatalog
            ? resolveSelectValue(fa.name, catalog, usedElsewhere)
            : fa.name;
          const skillIcon = getSkillIcon(selectValue);
          const SIcon = skillIcon?.icon;

          return (
            <li
              key={`${fa.orderIndex}-${fa.name}-${idx}`}
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-100 bg-white px-2 py-1 dark:border-gray-800 dark:bg-gray-900/50"
            >
              {SIcon ? (
                <SIcon
                  aria-hidden
                  size={14}
                  className={cn("shrink-0", skillIcon!.className)}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                {useCatalog ? (
                  <select
                    disabled={disabled}
                    value={selectValue}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    className="w-full min-w-0 truncate rounded border-0 bg-transparent py-0.5 text-[11px] font-semibold text-gray-900 outline-none dark:text-gray-100 dark:[color-scheme:dark]"
                  >
                    {catalog.map((s) => {
                      const taken = usedElsewhere.has(s.toLowerCase());
                      return (
                        <option
                          key={s}
                          value={s}
                          disabled={taken}
                          className={cn(
                            "bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100",
                            taken && "text-gray-400 dark:text-gray-500"
                          )}
                        >
                          {s}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled={disabled}
                    value={fa.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    className="w-full min-w-0 rounded border-0 bg-transparent py-0.5 text-[11px] font-semibold text-gray-900 outline-none dark:text-gray-100"
                  />
                )}
                {fa.sourceReason ? (
                  <p className="truncate text-[9px] leading-tight text-gray-400" title={fa.sourceReason}>
                    {fa.sourceReason}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={disabled}
                  value={normalizeFocusWeight(fa.weight)}
                  onChange={(e) => updateItem(idx, { weight: Number(e.target.value) })}
                  className="w-11 rounded border border-gray-200 bg-white px-1 py-0.5 text-center text-[10px] tabular-nums text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:[color-scheme:dark]"
                />
                <span className="text-[10px] text-gray-400">%</span>
                <button
                  type="button"
                  disabled={disabled || idx === 0}
                  onClick={() => move(idx, -1)}
                  className="rounded p-0.5 text-gray-400 hover:text-primary disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  disabled={disabled || idx === focusAreas.length - 1}
                  onClick={() => move(idx, 1)}
                  className="rounded p-0.5 text-gray-400 hover:text-primary disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  disabled={disabled || focusAreas.length <= 1}
                  onClick={() => remove(idx)}
                  className="rounded p-0.5 text-gray-400 hover:text-red-500 disabled:opacity-30"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {!valid && focusAreas.length > 0 && (
        <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">{cfg.focusInvalid}</p>
      )}
      {allSkillsUsed && (
        <p className={cn("text-[10px]", portalSubtext)}>{cfg.focusAllSkillsUsed}</p>
      )}
      <button
        type="button"
        disabled={disabled || (useCatalog && allSkillsUsed)}
        title={allSkillsUsed ? cfg.focusAllSkillsUsed : undefined}
        onClick={addArea}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
      >
        <Plus className="h-3 w-3" />
        {cfg.addFocus}
      </button>
    </div>
  );
}
