"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { Difficulty } from "@/features/candidate/types/jobseeker";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import {
  type HiringFacets,
  type HiringFilterLabels,
  type HiringJobFilters,
  type WorkplaceType,
  EMPTY_HIRING_FILTERS,
  applyHiringFilters,
  toggleInList,
} from "@/features/candidate/components/jobs/hiring-job-filters";

type Props = {
  open: boolean;
  onClose: () => void;
  filters: HiringJobFilters;
  onChange: (next: HiringJobFilters) => void;
  facets: HiringFacets;
  labels: HiringFilterLabels;
  catalog: QuestionSet[];
  keyword: string;
};

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-b border-gray-100 pb-4 dark:border-gray-800">
      <h3 className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{title}</h3>
      {children}
    </section>
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
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-left text-[13px] hover:bg-gray-50 dark:hover:bg-gray-800/50"
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          checked ? "border-primary bg-primary text-white" : "border-gray-300 dark:border-gray-600"
        )}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      <span className={checked ? "font-semibold text-primary" : undefined}>{label}</span>
    </button>
  );
}

function SearchableList({
  options,
  selected,
  onToggle,
  placeholder,
  emptyLabel,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  placeholder: string;
  emptyLabel: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.toLowerCase().includes(t));
  }, [options, q]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-gray-200 bg-transparent pl-8 pr-2 text-[12px] outline-none focus:border-primary/40 dark:border-gray-700"
        />
      </div>
      <div className="max-h-40 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className={cn("py-2 text-[12px]", portalSubtextAlt)}>{emptyLabel}</p>
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

export function HiringJobFilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  facets,
  labels,
  catalog,
  keyword,
}: Props) {
  const [draft, setDraft] = useState(filters);
  const draftCount = useMemo(
    () => applyHiringFilters(catalog, draft, keyword).length,
    [catalog, draft, keyword]
  );

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function applyAndClose() {
    onChange(draft);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-80 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.advanced}
        className="relative z-81 flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:rounded-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h2 className={cn("text-[15px] font-semibold", portalHeadingAlt)}>{labels.advanced}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <Section title={labels.urgent}>
            <CheckRow
              checked={draft.urgentOnly}
              label={labels.urgent}
              onToggle={() => setDraft({ ...draft, urgentOnly: !draft.urgentOnly })}
            />
          </Section>

          {facets.workplaces.length > 0 && (
            <Section title={labels.workplace}>
              {facets.workplaces.map((w) => (
                <CheckRow
                  key={w}
                  checked={draft.workplaceTypes.includes(w)}
                  label={workplaceLabel(w, labels)}
                  onToggle={() =>
                    setDraft({ ...draft, workplaceTypes: toggleInList(draft.workplaceTypes, w) })
                  }
                />
              ))}
            </Section>
          )}

          <Section title={labels.salary}>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className={cn("text-[11px]", portalSubtextAlt)}>{labels.salaryFrom}</span>
                <input
                  type="number"
                  value={draft.salaryMin ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      salaryMin: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                  className="h-9 w-full rounded-lg border border-gray-200 px-2 text-[13px] outline-none focus:border-primary/40 dark:border-gray-700 dark:bg-transparent"
                />
              </label>
              <label className="space-y-1">
                <span className={cn("text-[11px]", portalSubtextAlt)}>{labels.salaryTo}</span>
                <input
                  type="number"
                  value={draft.salaryMax ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      salaryMax: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                  className="h-9 w-full rounded-lg border border-gray-200 px-2 text-[13px] outline-none focus:border-primary/40 dark:border-gray-700 dark:bg-transparent"
                />
              </label>
            </div>
            <CheckRow
              checked={draft.numericSalaryOnly}
              label={labels.numericSalaryOnly}
              onToggle={() => setDraft({ ...draft, numericSalaryOnly: !draft.numericSalaryOnly })}
            />
          </Section>

          {facets.expertises.length > 0 && (
            <Section title={labels.expertise}>
              <SearchableList
                options={facets.expertises}
                selected={draft.expertises}
                onToggle={(v) => setDraft({ ...draft, expertises: toggleInList(draft.expertises, v) })}
                placeholder={labels.searchExpertise}
                emptyLabel={labels.noOptions}
              />
            </Section>
          )}

          {facets.skills.length > 0 && (
            <Section title={labels.skills}>
              <SearchableList
                options={facets.skills}
                selected={draft.skills}
                onToggle={(v) => setDraft({ ...draft, skills: toggleInList(draft.skills, v) })}
                placeholder={labels.searchSkills}
                emptyLabel={labels.noOptions}
              />
            </Section>
          )}

          {facets.domains.length > 0 && (
            <Section title={labels.domain}>
              <SearchableList
                options={facets.domains}
                selected={draft.domains}
                onToggle={(v) => setDraft({ ...draft, domains: toggleInList(draft.domains, v) })}
                placeholder={labels.searchDomain}
                emptyLabel={labels.noOptions}
              />
            </Section>
          )}

          {facets.locations.length > 0 && (
            <Section title={labels.location}>
              <SearchableList
                options={facets.locations}
                selected={draft.locations}
                onToggle={(v) => setDraft({ ...draft, locations: toggleInList(draft.locations, v) })}
                placeholder={labels.searchLocation}
                emptyLabel={labels.noOptions}
              />
            </Section>
          )}

          {facets.companies.length > 0 && (
            <Section title={labels.company}>
              <SearchableList
                options={facets.companies}
                selected={draft.companies}
                onToggle={(v) => setDraft({ ...draft, companies: toggleInList(draft.companies, v) })}
                placeholder={labels.searchCompany}
                emptyLabel={labels.noOptions}
              />
            </Section>
          )}

          {facets.difficulties.length > 0 && (
            <Section title={labels.difficulty}>
              {facets.difficulties.map((d) => (
                <CheckRow
                  key={d}
                  checked={draft.difficulties.includes(d)}
                  label={difficultyLabel(d, labels)}
                  onToggle={() =>
                    setDraft({ ...draft, difficulties: toggleInList(draft.difficulties, d) })
                  }
                />
              ))}
            </Section>
          )}

          {facets.durationMax > 0 && (
            <Section title={labels.duration}>
              <label className="space-y-1">
                <span className={cn("text-[11px]", portalSubtextAlt)}>
                  {labels.durationMax.replace("{{min}}", String(draft.maxDurationMinutes ?? facets.durationMax))}
                </span>
                <input
                  type="range"
                  min={15}
                  max={Math.max(15, facets.durationMax)}
                  step={15}
                  value={draft.maxDurationMinutes ?? facets.durationMax}
                  onChange={(e) =>
                    setDraft({ ...draft, maxDurationMinutes: Number(e.target.value) })
                  }
                  className="w-full accent-primary"
                />
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, maxDurationMinutes: undefined })}
                  className={cn("text-[12px] font-semibold hover:text-primary", portalSubtextAlt)}
                >
                  {labels.durationAny}
                </button>
              </label>
            </Section>
          )}
        </div>

        <div className="flex gap-2 border-t border-gray-100 p-4 dark:border-gray-800">
          <button
            type="button"
            onClick={() => {
              setDraft({ ...EMPTY_HIRING_FILTERS });
              onChange({ ...EMPTY_HIRING_FILTERS });
            }}
            className="h-10 flex-1 rounded-xl border border-gray-200 text-[13px] font-semibold dark:border-gray-700"
          >
            {labels.clearAll}
          </button>
          <button
            type="button"
            onClick={applyAndClose}
            className="h-10 flex-[1.4] rounded-xl bg-primary text-[13px] font-semibold text-white hover:bg-primary/90"
          >
            {labels.viewResults.replace("{{count}}", String(draftCount))}
          </button>
        </div>
      </div>
    </div>
  );
}
