"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus, Trash2 } from "lucide-react";
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
  matchTechSkill,
  normalizeFocusAreasToTechSkills,
  suggestJdTechSkills,
  type TechSkillCatalogItem,
} from "@/features/studio/utils/focus-area-jd";
import { useTechSkillCatalog } from "@/features/studio/hooks/use-tech-skill-catalog";

const PAGE_SIZE = 5;

interface Props {
  focusAreas: StudioFocusAreaItem[];
  disabled?: boolean;
  /** Giữ tương thích: skill JD để gợi ý khi chưa truyền jdSkills. */
  allowedSkillNames?: string[];
  /** Skill phát hiện trên JD — hiện tag thêm nhanh nếu khớp TechSkill. */
  jdSkills?: string[];
  onChange: (next: StudioFocusAreaItem[]) => void;
}

function resolveSelectValue(
  currentName: string,
  catalog: TechSkillCatalogItem[],
  usedElsewhere: Set<string>
): string {
  const matched = matchTechSkill(currentName, catalog);
  if (matched) return matched;
  const unused = catalog.find((item) => !usedElsewhere.has(item.label.toLowerCase()));
  return unused?.label ?? catalog[0]?.label ?? currentName;
}

/** Nhóm gợi ý JD lên đầu dropdown; skill đó không lặp lại trong Languages/Backend… */
function buildSelectGroups(
  catalog: TechSkillCatalogItem[],
  suggestedLabels: string[],
  suggestGroupLabel: string
): Array<[string, TechSkillCatalogItem[]]> {
  const suggestedSet = new Set(suggestedLabels.map((label) => label.toLowerCase()));
  const suggestedItems = suggestedLabels
    .map((label) => catalog.find((item) => item.label.toLowerCase() === label.toLowerCase()))
    .filter((item): item is TechSkillCatalogItem => Boolean(item));

  const rest = new Map<string, TechSkillCatalogItem[]>();
  for (const item of catalog) {
    if (suggestedSet.has(item.label.toLowerCase())) continue;
    const list = rest.get(item.group) ?? [];
    list.push(item);
    rest.set(item.group, list);
  }

  const groups: Array<[string, TechSkillCatalogItem[]]> = [];
  if (suggestedItems.length > 0) groups.push([suggestGroupLabel, suggestedItems]);
  for (const entry of rest.entries()) groups.push(entry);
  return groups;
}

function optionLabel(item: TechSkillCatalogItem, isSuggested: boolean, suggestSuffix: string): string {
  return isSuggested ? `${item.label} · ${suggestSuffix}` : item.label;
}

export function FocusAreasEditor({
  focusAreas,
  disabled,
  allowedSkillNames,
  jdSkills,
  onChange,
}: Props) {
  const { t } = useLanguage();
  const cfg = t.studioPage.settings.config;
  const techCatalog = useTechSkillCatalog();
  const catalog = techCatalog;
  const useCatalog = catalog.length > 0;
  const suggestionSource = jdSkills ?? allowedSkillNames ?? [];
  const suggestions = suggestJdTechSkills(
    suggestionSource,
    catalog,
    focusAreas.map((area) => area.name)
  );
  const sum = Math.round(sumFocusWeights(focusAreas) * 10) / 10;
  const valid = focusAreas.length === 0 || Math.abs(sum - 100) <= 0.5;
  const barPct = Math.min(100, Math.max(0, sum));

  const usedNames = new Set(focusAreas.map((area) => area.name.trim().toLowerCase()));
  const unusedSkills = catalog.filter((item) => !usedNames.has(item.label.toLowerCase()));
  const allSkillsUsed = useCatalog && unusedSkills.length === 0;
  /** Skill JD còn trống — đưa lên đầu dropdown Thêm focus. */
  const unusedSuggestions = suggestions.filter((label) => !usedNames.has(label.toLowerCase()));
  const addSelectGroups = useMemo(
    () => buildSelectGroups(unusedSkills, unusedSuggestions, cfg.focusSuggest),
    [unusedSkills, unusedSuggestions, cfg.focusSuggest]
  );

  const totalPages = Math.max(1, Math.ceil(focusAreas.length / PAGE_SIZE));
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return focusAreas.slice(start, start + PAGE_SIZE).map((fa, localIdx) => ({
      fa,
      idx: start + localIdx,
    }));
  }, [focusAreas, page]);

  useEffect(() => {
    if (!useCatalog || focusAreas.length === 0) return;
    const needs =
      hasDuplicateFocusNames(focusAreas) ||
      focusAreas.some((fa) => matchTechSkill(fa.name, catalog) !== fa.name.trim());
    if (!needs) return;
    const next = normalizeFocusAreasToTechSkills(focusAreas, catalog);
    if (next.length === 0) return;
    onChange(next);
  }, [useCatalog, catalog.map((item) => item.label).join("|"), focusAreas.map((f) => f.name).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const addNamed = (name: string) => {
    const label = name.trim();
    if (!label) return;
    if (focusAreas.some((area) => area.name.trim().toLowerCase() === label.toLowerCase())) return;
    const next = equalSplitFocusWeightsTo100([
      ...focusAreas,
      { name: label, weight: 0, orderIndex: focusAreas.length },
    ]);
    onChange(next);
    setPage(Math.floor((next.length - 1) / PAGE_SIZE));
  };

  const addArea = () => {
    const unused = unusedSkills[0]?.label;
    if (useCatalog) {
      if (!unused) return;
      addNamed(unused);
      return;
    }
    addNamed(cfg.newFocusName);
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
        {pageItems.map(({ fa, idx }) => {
          const usedElsewhere = new Set(
            focusAreas
              .filter((_, i) => i !== idx)
              .map((x) => x.name.toLowerCase())
          );
          const selectValue = useCatalog
            ? resolveSelectValue(fa.name, catalog, usedElsewhere)
            : fa.name;
          // Gợi ý JD vẫn hiện ở đầu kể cả skill đang chọn của dòng này.
          const rowSuggestions = suggestJdTechSkills(
            suggestionSource,
            catalog,
            [...usedElsewhere]
          );
          const rowGroups = buildSelectGroups(catalog, rowSuggestions, cfg.focusSuggest);
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
                    {rowGroups.map(([group, items]) => {
                      const isSuggestGroup = group === cfg.focusSuggest;
                      return (
                        <optgroup key={group} label={group}>
                          {items.map((item) => {
                            const taken = usedElsewhere.has(item.label.toLowerCase());
                            return (
                              <option
                                key={item.name}
                                value={item.label}
                                disabled={taken}
                                className={cn(
                                  "bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100",
                                  taken && "text-gray-400 dark:text-gray-500"
                                )}
                              >
                                {optionLabel(item, isSuggestGroup, cfg.focusSuggestShort)}
                              </option>
                            );
                          })}
                        </optgroup>
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
                  aria-label={t.reviewPage.questionActions.moveUp}
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  disabled={disabled || idx === focusAreas.length - 1}
                  onClick={() => move(idx, 1)}
                  className="rounded p-0.5 text-gray-400 hover:text-primary disabled:opacity-30"
                  aria-label={t.reviewPage.questionActions.moveDown}
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

      {focusAreas.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className={cn("text-[10px] tabular-nums", portalSubtext)}>
            {page + 1}/{totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {!valid && focusAreas.length > 0 && (
        <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">{cfg.focusInvalid}</p>
      )}
      {allSkillsUsed && (
        <p className={cn("text-[10px]", portalSubtext)}>{cfg.focusAllSkillsUsed}</p>
      )}
      <div className="flex items-center gap-1">
        {useCatalog && (
          <AddSkillSelect
            groups={addSelectGroups}
            suggestedLabels={unusedSuggestions}
            suggestSuffix={cfg.focusSuggestShort}
            suggestGroupLabel={cfg.focusSuggest}
            disabled={disabled || allSkillsUsed}
            onAdd={addNamed}
            addLabel={cfg.addFocus}
          />
        )}
        {!useCatalog && (
          <button
            type="button"
            disabled={disabled}
            onClick={addArea}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <Plus className="h-3 w-3" />
            {cfg.addFocus}
          </button>
        )}
      </div>
    </div>
  );
}

function AddSkillSelect({
  groups,
  suggestedLabels,
  suggestSuffix,
  suggestGroupLabel,
  disabled,
  onAdd,
  addLabel,
}: {
  groups: Array<[string, TechSkillCatalogItem[]]>;
  suggestedLabels: string[];
  suggestSuffix: string;
  suggestGroupLabel: string;
  disabled?: boolean;
  onAdd: (label: string) => void;
  addLabel: string;
}) {
  const flat = groups.flatMap(([, items]) => items);
  const preferred = suggestedLabels[0] ?? flat[0]?.label ?? "";
  const [value, setValue] = useState(preferred);

  useEffect(() => {
    if (flat.some((item) => item.label === value)) return;
    setValue(preferred);
  }, [preferred, flat, value]);

  return (
    <>
      <select
        disabled={disabled || flat.length === 0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        {groups.map(([group, items]) => {
          const isSuggestGroup = group === suggestGroupLabel;
          return (
            <optgroup key={group} label={group}>
              {items.map((item) => (
                <option key={item.name} value={item.label}>
                  {optionLabel(item, isSuggestGroup, suggestSuffix)}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <button
        type="button"
        disabled={disabled || !value}
        onClick={() => onAdd(value)}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
      >
        <Plus className="h-3 w-3" />
        {addLabel}
      </button>
    </>
  );
}
