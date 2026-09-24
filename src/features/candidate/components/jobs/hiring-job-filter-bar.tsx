"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { Difficulty, QuestionSet } from "@/features/candidate/types/jobseeker";
import {
  type FilterChip,
  type HiringFacets,
  type HiringFilterLabels,
  type HiringJobFilters,
  type WorkplaceType,
  EMPTY_HIRING_FILTERS,
  countActiveFilters,
  hasActiveFilters,
  removeChip,
  toggleInList,
} from "@/features/candidate/components/jobs/hiring-job-filters";
import { HiringJobFilterDrawer } from "@/features/candidate/components/jobs/hiring-job-filter-drawer";

export type { HiringFilterLabels };

type Props = {
  filters: HiringJobFilters;
  onChange: (next: HiringJobFilters) => void;
  facets: HiringFacets;
  labels: HiringFilterLabels;
  catalog: QuestionSet[];
  keyword: string;
};

function useOutsideAndEscape(open: boolean, onClose: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, ref]);
}

function FilterPill({
  label,
  count,
  open,
  active,
  onClick,
  className,
}: {
  label: string;
  count?: number;
  open?: boolean;
  active?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold transition-colors duration-150",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200",
        open && !active && "border-primary/50 shadow-[0_0_0_3px_rgba(108,71,255,0.1)]",
        className
      )}
    >
      <span>
        {label}
        {count != null && count > 0 ? ` · ${count}` : ""}
      </span>
      <ChevronDown
        size={13}
        className={cn("text-current opacity-70 transition-transform duration-150", open && "rotate-180")}
      />
    </button>
  );
}

function CheckRow({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          checked
            ? "border-primary bg-primary text-white"
            : "border-gray-300 dark:border-gray-600"
        )}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      <span className={cn(checked ? "font-semibold text-primary" : portalHeadingAlt)}>{label}</span>
    </button>
  );
}

function DropdownPanel({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      className={cn(
        "absolute left-0 top-full z-50 mt-1.5 w-[min(100vw-2rem,300px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/40",
        className
      )}
      role="listbox"
    >
      {children}
    </div>
  );
}

function SearchableMulti({
  options,
  selected,
  onToggle,
  searchPlaceholder,
  emptyLabel,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.toLowerCase().includes(t));
  }, [options, q]);

  return (
    <div className="flex max-h-72 flex-col">
      <div className="border-b border-gray-100 p-2 dark:border-gray-800">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 w-full rounded-lg border border-gray-200 bg-transparent pl-8 pr-2 text-[12px] outline-none focus:border-primary/40 dark:border-gray-700"
          />
        </div>
      </div>
      <div className="overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <p className={cn("px-3 py-3 text-[12px]", portalSubtextAlt)}>{emptyLabel}</p>
        ) : (
          filtered.map((opt) => (
            <CheckRow
              key={opt}
              checked={selected.includes(opt)}
              label={opt}
              onToggle={() => onToggle(opt)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function workplaceLabel(w: WorkplaceType, labels: HiringFilterLabels): string {
  if (w === "AtOffice") return labels.workplaceAtOffice;
  if (w === "Hybrid") return labels.workplaceHybrid;
  return labels.workplaceRemote;
}

function difficultyLabel(d: Difficulty, labels: HiringFilterLabels): string {
  if (d === "Easy") return labels.difficultyEasy;
  if (d === "Medium") return labels.difficultyMedium;
  return labels.difficultyHard;
}

function formatMoney(n: number): string {
  return n.toLocaleString("vi-VN");
}

export function buildFilterChips(filters: HiringJobFilters, labels: HiringFilterLabels): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.urgentOnly) chips.push({ key: "urgent", label: labels.urgent });
  for (const w of filters.workplaceTypes) {
    chips.push({ key: "workplace", value: w, label: workplaceLabel(w, labels) });
  }
  if (filters.salaryMin != null || filters.salaryMax != null) {
    const lo = filters.salaryMin != null ? formatMoney(filters.salaryMin) : "…";
    const hi = filters.salaryMax != null ? formatMoney(filters.salaryMax) : "…";
    chips.push({ key: "salary", label: `${lo} – ${hi}` });
  }
  if (filters.numericSalaryOnly) {
    chips.push({ key: "numericSalary", label: labels.numericSalaryOnly });
  }
  for (const v of filters.expertises) chips.push({ key: "expertise", value: v, label: v });
  for (const v of filters.skills) chips.push({ key: "skill", value: v, label: v });
  for (const v of filters.domains) chips.push({ key: "domain", value: v, label: v });
  for (const v of filters.locations) chips.push({ key: "location", value: v, label: v });
  for (const v of filters.companies) chips.push({ key: "company", value: v, label: v });
  for (const v of filters.difficulties) {
    chips.push({ key: "difficulty", value: v, label: difficultyLabel(v, labels) });
  }
  if (filters.maxDurationMinutes != null) {
    chips.push({
      key: "duration",
      label: labels.durationMax.replace("{{min}}", String(filters.maxDurationMinutes)),
    });
  }
  return chips;
}

export function HiringJobFilterBar({
  filters,
  onChange,
  facets,
  labels,
  catalog,
  keyword,
}: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draftSalMin, setDraftSalMin] = useState(filters.salaryMin?.toString() ?? "");
  const [draftSalMax, setDraftSalMax] = useState(filters.salaryMax?.toString() ?? "");

  const workplaceRef = useRef<HTMLDivElement>(null);
  const salaryRef = useRef<HTMLDivElement>(null);
  const expertiseRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);

  useOutsideAndEscape(openKey === "workplace", () => setOpenKey(null), workplaceRef);
  useOutsideAndEscape(openKey === "salary", () => setOpenKey(null), salaryRef);
  useOutsideAndEscape(openKey === "expertise", () => setOpenKey(null), expertiseRef);
  useOutsideAndEscape(openKey === "skills", () => setOpenKey(null), skillsRef);

  useEffect(() => {
    if (openKey === "salary") {
      setDraftSalMin(filters.salaryMin?.toString() ?? "");
      setDraftSalMax(filters.salaryMax?.toString() ?? "");
    }
  }, [openKey, filters.salaryMin, filters.salaryMax]);

  const activeCount = countActiveFilters(filters);
  const chips = useMemo(() => buildFilterChips(filters, labels), [filters, labels]);
  const uid = useId();

  function toggleOpen(key: string) {
    setOpenKey((cur) => (cur === key ? null : key));
  }

  function applySalary() {
    const min = draftSalMin.trim() === "" ? undefined : Number(draftSalMin);
    const max = draftSalMax.trim() === "" ? undefined : Number(draftSalMax);
    onChange({
      ...filters,
      salaryMin: min != null && Number.isFinite(min) ? min : undefined,
      salaryMax: max != null && Number.isFinite(max) ? max : undefined,
    });
    setOpenKey(null);
  }

  function resetSalary() {
    setDraftSalMin("");
    setDraftSalMax("");
    onChange({ ...filters, salaryMin: undefined, salaryMax: undefined });
  }

  return (
    <div className="space-y-2.5">
      {/* Desktop / tablet toolbar */}
      <div className="hidden items-center gap-2 sm:flex">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...filters, urgentOnly: !filters.urgentOnly })}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold transition-colors",
              filters.urgentOnly
                ? "border-sky-400/50 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-300"
                : "border-gray-200 bg-white text-gray-700 hover:border-sky-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            )}
          >
            <Zap size={13} className={filters.urgentOnly ? "fill-current" : ""} />
            {labels.urgent}
          </button>

          {facets.workplaces.length > 0 && (
            <div ref={workplaceRef} className="relative">
              <FilterPill
                label={labels.workplace}
                count={filters.workplaceTypes.length}
                open={openKey === "workplace"}
                active={filters.workplaceTypes.length > 0}
                onClick={() => toggleOpen("workplace")}
              />
              <DropdownPanel open={openKey === "workplace"}>
                <div className="py-1">
                  {facets.workplaces.map((w) => (
                    <CheckRow
                      key={w}
                      checked={filters.workplaceTypes.includes(w)}
                      label={workplaceLabel(w, labels)}
                      onToggle={() =>
                        onChange({
                          ...filters,
                          workplaceTypes: toggleInList(filters.workplaceTypes, w),
                        })
                      }
                    />
                  ))}
                </div>
              </DropdownPanel>
            </div>
          )}

          <div ref={salaryRef} className="relative hidden md:block">
            <FilterPill
              label={labels.salary}
              count={filters.salaryMin != null || filters.salaryMax != null ? 1 : 0}
              open={openKey === "salary"}
              active={filters.salaryMin != null || filters.salaryMax != null}
              onClick={() => toggleOpen("salary")}
            />
            <DropdownPanel open={openKey === "salary"}>
              <div className="space-y-3 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className={cn("text-[11px] font-medium", portalSubtextAlt)}>{labels.salaryFrom}</span>
                    <input
                      id={`${uid}-sal-min`}
                      type="number"
                      inputMode="numeric"
                      value={draftSalMin}
                      onChange={(e) => setDraftSalMin(e.target.value)}
                      placeholder={String(facets.salaryBoundMin)}
                      className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-[13px] outline-none focus:border-primary/40 dark:border-gray-700"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className={cn("text-[11px] font-medium", portalSubtextAlt)}>{labels.salaryTo}</span>
                    <input
                      id={`${uid}-sal-max`}
                      type="number"
                      inputMode="numeric"
                      value={draftSalMax}
                      onChange={(e) => setDraftSalMax(e.target.value)}
                      placeholder={String(facets.salaryBoundMax)}
                      className="h-9 w-full rounded-lg border border-gray-200 bg-transparent px-2 text-[13px] outline-none focus:border-primary/40 dark:border-gray-700"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={resetSalary}
                    className={cn("text-[12px] font-semibold hover:text-primary", portalSubtextAlt)}
                  >
                    {labels.salaryReset}
                  </button>
                  <button
                    type="button"
                    onClick={applySalary}
                    className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-primary/90"
                  >
                    {labels.salaryApply}
                  </button>
                </div>
              </div>
            </DropdownPanel>
          </div>

          {facets.expertises.length > 0 && (
            <div ref={expertiseRef} className="relative hidden lg:block">
              <FilterPill
                label={labels.expertise}
                count={filters.expertises.length}
                open={openKey === "expertise"}
                active={filters.expertises.length > 0}
                onClick={() => toggleOpen("expertise")}
              />
              <DropdownPanel open={openKey === "expertise"}>
                <SearchableMulti
                  options={facets.expertises}
                  selected={filters.expertises}
                  onToggle={(v) =>
                    onChange({ ...filters, expertises: toggleInList(filters.expertises, v) })
                  }
                  searchPlaceholder={labels.searchExpertise}
                  emptyLabel={labels.noOptions}
                />
              </DropdownPanel>
            </div>
          )}

          {facets.skills.length > 0 && (
            <div ref={skillsRef} className="relative hidden md:block">
              <FilterPill
                label={labels.skills}
                count={filters.skills.length}
                open={openKey === "skills"}
                active={filters.skills.length > 0}
                onClick={() => toggleOpen("skills")}
              />
              <DropdownPanel open={openKey === "skills"}>
                <SearchableMulti
                  options={facets.skills}
                  selected={filters.skills}
                  onToggle={(v) =>
                    onChange({ ...filters, skills: toggleInList(filters.skills, v) })
                  }
                  searchPlaceholder={labels.searchSkills}
                  emptyLabel={labels.noOptions}
                />
              </DropdownPanel>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={cn(
            "ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold transition-colors",
            activeCount > 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-gray-200 bg-white text-gray-700 hover:border-primary/40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          )}
        >
          <SlidersHorizontal size={13} />
          {labels.advanced}
          {activeCount > 0 ? ` ${activeCount}` : ""}
        </button>
      </div>

      {/* Mobile: single advanced button */}
      <div className="flex sm:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={cn(
            "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-[13px] font-semibold",
            activeCount > 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
          )}
        >
          <SlidersHorizontal size={15} />
          {labels.advanced}
          {activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      {hasActiveFilters(filters) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("mr-1 text-[11px] font-medium", portalSubtextAlt)}>{labels.filtering}</span>
          {chips.map((chip) => (
            <button
              key={`${chip.key}-${"value" in chip ? chip.value : "x"}-${chip.label}`}
              type="button"
              onClick={() => onChange(removeChip(filters, chip))}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/35 bg-primary/10 px-2.5 text-[11px] font-semibold text-primary"
            >
              {chip.label}
              <X size={11} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_HIRING_FILTERS })}
            className="ml-1 text-[11px] font-semibold text-primary hover:underline"
          >
            {labels.clearAll}
          </button>
        </div>
      )}

      <HiringJobFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={onChange}
        facets={facets}
        labels={labels}
        catalog={catalog}
        keyword={keyword}
      />
    </div>
  );
}
