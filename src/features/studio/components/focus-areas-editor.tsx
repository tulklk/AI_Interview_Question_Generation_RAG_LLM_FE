"use client";

import { useEffect } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtext } from "@/shared/utils/portal-ui";
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

  const unusedSkills = catalog.filter(
    (s) => !focusAreas.some((fa) => fa.name.toLowerCase() === s.toLowerCase())
  );
  const allSkillsUsed = useCatalog && unusedSkills.length === 0;

  // Ép tên lệch catalog / trùng → skill JD (sau seed hoặc settings cũ từ RAG)
  useEffect(() => {
    if (!useCatalog || focusAreas.length === 0) return;
    const needs =
      hasDuplicateFocusNames(focusAreas) ||
      focusAreas.some(
        (fa) => !catalog.some((s) => s.toLowerCase() === fa.name.trim().toLowerCase())
      );
    if (!needs) return;
    onChange(normalizeFocusAreasToJdSkills(focusAreas, catalog));
    // Chỉ phụ thuộc tên + catalog — tránh scale lại khi HR đang kéo %
  }, [useCatalog, catalog.join("|"), focusAreas.map((f) => f.name).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateItem = (index: number, patch: Partial<StudioFocusAreaItem>) => {
    // Đổi % 1 skill → giữ giá trị đó, scale các skill còn lại sao cho tổng = 100
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
    // Thêm skill → chia đều lại 100% trên UI (phần dư vào skill đầu, skill cuối ít hơn/bằng)
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
        <p className={cn("text-[10px]", portalSubtext)}>{cfg.focusHint}</p>
        <span
          className={cn(
            "text-[10px] font-semibold tabular-nums",
            valid ? "text-emerald-600" : "text-amber-700"
          )}
        >
          {cfg.focusSum.replace("{{sum}}", String(sum))}
        </span>
      </div>
      <ul className="space-y-1.5">
        {focusAreas.map((fa, idx) => {
          const usedElsewhere = new Set(
            focusAreas
              .filter((_, i) => i !== idx)
              .map((x) => x.name.toLowerCase())
          );
          const selectValue = useCatalog
            ? resolveSelectValue(fa.name, catalog, usedElsewhere)
            : fa.name;

          return (
            <li
              key={`${fa.orderIndex}-${fa.name}-${idx}`}
              className="rounded-lg border border-gray-100 bg-white px-2 py-1.5 dark:border-gray-800 dark:bg-gray-900/50"
            >
              <div className="flex items-center gap-1.5">
                {useCatalog ? (
                  <select
                    disabled={disabled}
                    value={selectValue}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:[color-scheme:dark]"
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
                    className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                )}
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={disabled}
                  value={normalizeFocusWeight(fa.weight)}
                  onChange={(e) => updateItem(idx, { weight: Number(e.target.value) })}
                  className="w-12 rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] tabular-nums text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:[color-scheme:dark]"
                />
                <span className="text-[10px] text-gray-400">%</span>
                <button
                  type="button"
                  disabled={disabled || idx === 0}
                  onClick={() => move(idx, -1)}
                  className="p-0.5 text-gray-400 hover:text-primary disabled:opacity-30"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  disabled={disabled || idx === focusAreas.length - 1}
                  onClick={() => move(idx, 1)}
                  className="p-0.5 text-gray-400 hover:text-primary disabled:opacity-30"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  disabled={disabled || focusAreas.length <= 1}
                  onClick={() => remove(idx)}
                  className="p-0.5 text-gray-400 hover:text-red-500 disabled:opacity-30"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {fa.sourceReason && (
                <p className={cn("mt-0.5 text-[9px]", portalSubtext)} title={fa.sourceReason}>
                  {fa.sourceReason}
                </p>
              )}
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
        onClick={addArea}
        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-[10px] font-medium text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 dark:border-gray-600"
      >
        <Plus className="h-3 w-3" />
        {cfg.addFocus}
      </button>
    </div>
  );
}
