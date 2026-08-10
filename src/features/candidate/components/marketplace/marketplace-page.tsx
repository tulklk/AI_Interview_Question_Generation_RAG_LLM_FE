"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Sparkles, AlertCircle, RefreshCw,
  ChevronDown, Check, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { listQuestionSets, getBookmarkedSetIds } from "@/features/candidate/services/question-set.service";
import { listCompanies, type Company } from "@/features/admin/services/admin-company.service";
import { getCompanyInitials, getCompanyColor } from "@/features/candidate/utils/company-visual";
import { QuestionSetCard } from "./question-set-card";
import { useLanguage } from "@/shared/providers/language-context";
import type { Difficulty, QuestionSet } from "@/features/candidate/types/jobseeker";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import {
  portalCard,
  portalHeadingAlt,
  portalInput,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

const DIFFICULTIES: Array<"All" | Difficulty> = ["All", "Easy", "Medium", "Hard"];
const PAGE_SIZE = 9;
// BE only reliably filters by CompanyId. Difficulty, Skills, SortBy, and Keyword
// are applied client-side on a large fetched batch so every filter actually works.
const FETCH_SIZE = 200;

function applyClientFilters(
  items: QuestionSet[],
  term: string,
  diff: "All" | Difficulty,
  skills: string[],
  sort: "featured" | "newest" | "most_practiced" | "highest_rated",
): QuestionSet[] {
  let result = items;
  if (term) {
    const q = term.toLowerCase();
    result = result.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q) ||
        s.skills.some((sk) => sk.toLowerCase().includes(q)),
    );
  }
  if (diff !== "All") {
    result = result.filter((s) => s.difficulty === diff);
  }
  if (skills.length > 0) {
    result = result.filter((s) =>
      skills.some((sk) =>
        s.skills.some((sk2) => sk2.toLowerCase() === sk.toLowerCase()),
      ),
    );
  }
  result = [...result].sort((a, b) => {
    if (sort === "most_practiced") return (b.attempts ?? 0) - (a.attempts ?? 0);
    if (sort === "highest_rated") return (b.rating ?? 0) - (a.rating ?? 0);
    // featured / newest: pinned first, then trending
    const pinDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
    if (pinDiff !== 0) return pinDiff;
    return (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0);
  });
  return result;
}

function difficultyColor(d: "All" | Difficulty) {
  if (d === "Easy")   return "text-emerald-600 dark:text-emerald-400";
  if (d === "Medium") return "text-amber-500 dark:text-amber-400";
  if (d === "Hard")   return "text-red-500 dark:text-red-400";
  return "";
}

function getPageNums(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  const nums: (number | "…")[] = [1];
  if (left > 2) nums.push("…");
  for (let i = left; i <= right; i++) nums.push(i);
  if (right < total - 1) nums.push("…");
  nums.push(total);
  return nums;
}

// ── SortDropdown — custom dropdown replacing native <select> ─────────────────
// Native <select> uses OS-level popup that ignores app dark/light theme.
type SortValue = "featured" | "newest" | "most_practiced" | "highest_rated";

function SortDropdown({
  value, onChange, label, options, fullWidth = false,
}: {
  value: SortValue;
  onChange: (v: SortValue) => void;
  label: string;
  options: { value: SortValue; label: string }[];
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn("relative", fullWidth ? "w-full sm:w-auto" : "shrink-0")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 items-center gap-2 rounded-lg pl-3.5 pr-3 transition-all text-left",
          "border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-gray-900",
          "hover:border-primary dark:hover:border-primary",
          open && "border-primary shadow-[0_0_0_3px_rgba(108,71,255,0.12)]",
          fullWidth && "w-full sm:w-auto"
        )}
      >
        <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 sm:block">
          {label}
        </span>
        <span className="text-[13px] font-semibold text-charcoal dark:text-gray-100">
          {current?.label}
        </span>
        <ChevronDown
          size={13}
          className={cn(
            "text-gray-400 transition-transform duration-200 shrink-0",
            fullWidth && "ml-auto sm:ml-0",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className={cn(
          "absolute right-0 top-full z-50 mt-1.5 min-w-45 rounded-xl overflow-hidden",
          "border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-gray-900",
          "shadow-lg dark:shadow-black/40",
          "py-1"
        )}>
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-[13px] transition-colors",
                  isActive
                    ? "bg-violet-50 dark:bg-violet-950/40 text-primary font-semibold"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
                )}
              >
                {opt.label}
                {isActive && <Check size={13} className="shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FilterBarLabels {
  searchPlaceholder: string;
  allDifficulties: string;
  easy: string;
  medium: string;
  hard: string;
  difficultyLabel: string;
  skillsDropdownLabel: string;
  allSkills: string;
  skillsSelected: string;
  skillsSearchPlaceholder: string;
  clearAll: string;
  companyDropdownLabel: string;
  allCompanies: string;
  companySearchPlaceholder: string;
  sortLabel: string;
  sortFeatured: string;
  sortNewest: string;
  sortMostPracticed: string;
  sortHighestRated: string;
}

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchPlaceholder: string;
  difficulty: "All" | Difficulty;
  onDifficultyChange: (d: "All" | Difficulty) => void;
  availableSkills: string[];
  selectedSkills: string[];
  onToggleSkill: (s: string) => void;
  onClearSkills: () => void;
  companies: Company[];
  selectedCompanyId: string | null;
  onSelectCompany: (id: string | null) => void;
  sortBy: "featured" | "newest" | "most_practiced" | "highest_rated";
  onSortByChange: (v: "featured" | "newest" | "most_practiced" | "highest_rated") => void;
  labels: FilterBarLabels;
}

function FilterBar({
  search, onSearchChange, searchInputRef, searchPlaceholder,
  difficulty, onDifficultyChange,
  availableSkills, selectedSkills, onToggleSkill, onClearSkills,
  companies, selectedCompanyId, onSelectCompany,
  sortBy, onSortByChange,
  labels: p,
}: FilterBarProps) {
  const [diffOpen, setDiffOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState("");

  const diffRef = useRef<HTMLDivElement>(null);
  const skillRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (diffRef.current && !diffRef.current.contains(e.target as Node)) setDiffOpen(false);
      if (skillRef.current && !skillRef.current.contains(e.target as Node)) setSkillOpen(false);
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) setCompanyOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredCompanies = companySearch.trim()
    ? companies.filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase()))
    : companies;
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) ?? null;

  const filteredSkills = skillSearch.trim()
    ? availableSkills.filter((s) => s.toLowerCase().includes(skillSearch.toLowerCase()))
    : availableSkills;

  const diffLabel =
    difficulty === "All" ? p.allDifficulties
    : difficulty === "Easy"   ? p.easy
    : difficulty === "Medium" ? p.medium
    : p.hard;

  const dropdownBase = cn(
    "absolute top-full mt-1.5 z-50 rounded-xl border shadow-lg overflow-hidden",
    "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
  );
  const optionBase = "flex items-center gap-2.5 w-full px-3 py-2 text-[13px] transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer";

  return (
    <div className="hr-glass-card p-3 mb-6">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        {/* Search */}
        <div className={cn(
          "col-span-2 flex items-center gap-2 rounded-lg px-3 h-10 sm:flex-1 sm:max-w-sm",
          "focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(108,71,255,0.1)] transition-all",
          portalInput
        )}>
          <Search size={15} className="text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 text-[13px] bg-transparent outline-none"
          />
          {search && (
            <button type="button" onClick={() => onSearchChange("")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Difficulty dropdown */}
        <div ref={diffRef} className="relative sm:shrink-0 sm:ml-auto">
          <button
            type="button"
            onClick={() => { setDiffOpen((v) => !v); setSkillOpen(false); }}
            className={cn(
              "w-full sm:w-auto flex items-center gap-2 h-10 px-3.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap",
              portalInput,
              diffOpen ? "border-primary shadow-[0_0_0_3px_rgba(108,71,255,0.1)]" : "",
            )}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 hidden sm:block">
              {p.difficultyLabel}
            </span>
            <span className={cn("font-semibold truncate", difficultyColor(difficulty), difficulty === "All" && portalSubtextAlt)}>
              {diffLabel}
            </span>
            {difficulty !== "All" && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            )}
            <ChevronDown size={13} className={cn("text-gray-400 transition-transform shrink-0 ml-auto sm:ml-0", diffOpen && "rotate-180")} />
          </button>

          {diffOpen && (
            <div className={cn(dropdownBase, "right-0 w-44 py-1")}>
              {DIFFICULTIES.map((d) => {
                const label = d === "All" ? p.allDifficulties : d === "Easy" ? p.easy : d === "Medium" ? p.medium : p.hard;
                const active = difficulty === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { onDifficultyChange(d); setDiffOpen(false); }}
                    className={cn(optionBase, active ? "bg-primary/5 dark:bg-primary/10" : "")}
                  >
                    <span className={cn("flex-1 text-left", active ? "font-semibold text-primary" : portalSubtextAlt, d !== "All" && difficultyColor(d))}>
                      {label}
                    </span>
                    {active && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Company single-select dropdown */}
        {companies.length > 0 && (
          <div ref={companyRef} className="relative sm:shrink-0">
            <button
              type="button"
              onClick={() => { setCompanyOpen((v) => !v); setDiffOpen(false); setSkillOpen(false); }}
              className={cn(
                "w-full sm:w-auto flex items-center gap-2 h-10 px-3.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap sm:max-w-44",
                portalInput,
                companyOpen ? "border-primary shadow-[0_0_0_3px_rgba(108,71,255,0.1)]" : "",
              )}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 hidden sm:block shrink-0">
                {p.companyDropdownLabel}
              </span>
              <span className={cn("font-semibold truncate", selectedCompany ? "text-primary" : portalSubtextAlt)}>
                {selectedCompany ? selectedCompany.name : p.allCompanies}
              </span>
              {selectedCompany && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              )}
              <ChevronDown size={13} className={cn("text-gray-400 transition-transform shrink-0 ml-auto sm:ml-0", companyOpen && "rotate-180")} />
            </button>

            {companyOpen && (
              <div className={cn(dropdownBase, "right-0 w-64")}>
                <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                  <div className={cn("flex items-center gap-2 rounded-lg px-2.5 h-8", portalInput)}>
                    <Search size={12} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      placeholder={p.companySearchPlaceholder}
                      className="flex-1 text-[12px] bg-transparent outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto py-1">
                  <button
                    type="button"
                    onClick={() => { onSelectCompany(null); setCompanyOpen(false); }}
                    className={cn(optionBase, selectedCompanyId === null ? "bg-primary/5 dark:bg-primary/10" : "")}
                  >
                    <span className={cn("flex-1 text-left", selectedCompanyId === null ? "font-semibold text-primary" : portalSubtextAlt)}>
                      {p.allCompanies}
                    </span>
                    {selectedCompanyId === null && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                  {filteredCompanies.map((c) => {
                    const active = selectedCompanyId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { onSelectCompany(c.id); setCompanyOpen(false); }}
                        className={cn(optionBase, active ? "bg-primary/5 dark:bg-primary/10" : "")}
                      >
                        {c.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.logoUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            className="w-5 h-5 rounded object-cover shrink-0"
                          />
                        ) : (
                          <span className={cn("w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0", getCompanyColor(c.name))}>
                            {getCompanyInitials(c.name)}
                          </span>
                        )}
                        <span className={cn("flex-1 text-left truncate", active ? "font-semibold text-primary" : portalSubtextAlt)}>
                          {c.name}
                        </span>
                        {active && <Check size={13} className="text-primary shrink-0" />}
                      </button>
                    );
                  })}
                  {filteredCompanies.length === 0 && (
                    <p className={cn("text-[12px] text-center py-4", portalSubtextAlt)}>
                      {p.companySearchPlaceholder}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Skills multi-select dropdown */}
        {availableSkills.length > 0 && (
          <div ref={skillRef} className="relative sm:shrink-0">
            <button
              type="button"
              onClick={() => { setSkillOpen((v) => !v); setDiffOpen(false); }}
              className={cn(
                "w-full sm:w-auto flex items-center gap-2 h-10 px-3.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap",
                portalInput,
                skillOpen ? "border-primary shadow-[0_0_0_3px_rgba(108,71,255,0.1)]" : "",
              )}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 hidden sm:block">
                {p.skillsDropdownLabel}
              </span>
              {selectedSkills.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 bg-primary text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  {p.skillsSelected.replace("{{count}}", String(selectedSkills.length))}
                </span>
              ) : (
                <span className={cn("font-semibold", portalSubtextAlt)}>
                  {p.allSkills}
                </span>
              )}
              <ChevronDown size={13} className={cn("text-gray-400 transition-transform shrink-0 ml-auto sm:ml-0", skillOpen && "rotate-180")} />
            </button>

            {skillOpen && (
              <div className={cn(dropdownBase, "right-0 w-64")}>
                <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                  <div className={cn("flex items-center gap-2 rounded-lg px-2.5 h-8", portalInput)}>
                    <Search size={12} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      placeholder={p.skillsSearchPlaceholder}
                      className="flex-1 text-[12px] bg-transparent outline-none"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto py-1">
                  {filteredSkills.map((skill) => {
                    const active = selectedSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => onToggleSkill(skill)}
                        className={cn(optionBase, active ? "bg-primary/5 dark:bg-primary/10" : "")}
                      >
                        <span className={cn(
                          "w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors",
                          active ? "bg-primary border-primary" : "border-gray-300 dark:border-gray-600"
                        )}>
                          {active && <Check size={10} className="text-white" />}
                        </span>
                        <span className={cn("flex-1 text-left text-[12px] truncate", active ? "font-medium text-primary" : portalSubtextAlt)}>
                          {skill}
                        </span>
                      </button>
                    );
                  })}
                  {filteredSkills.length === 0 && (
                    <p className={cn("text-[12px] text-center py-4", portalSubtextAlt)}>
                      {p.skillsSearchPlaceholder}
                    </p>
                  )}
                </div>

                {selectedSkills.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-800 p-2">
                    <button
                      type="button"
                      onClick={() => { onClearSkills(); setSkillOpen(false); }}
                      className="w-full text-[12px] font-semibold text-red-500 hover:text-red-600 transition-colors py-1"
                    >
                      {p.clearAll}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <span className="hidden h-6 w-px shrink-0 bg-gray-200 dark:bg-gray-700 sm:block" />

        {/* Sort — fills grid cell on mobile, content-width on sm+ */}
        <SortDropdown
          value={sortBy}
          onChange={onSortByChange}
          label={p.sortLabel}
          options={[
            { value: "featured",       label: p.sortFeatured },
            { value: "newest",         label: p.sortNewest },
            { value: "most_practiced", label: p.sortMostPracticed },
            { value: "highest_rated",  label: p.sortHighestRated },
          ]}
          fullWidth
        />
      </div>

      {/* Active company + skill tags */}
      {(selectedCompany || selectedSkills.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800">
          {selectedCompany && (
            <span className="inline-flex items-center gap-1 bg-primary/10 dark:bg-primary/20 text-primary text-[11px] font-medium px-2.5 py-1 rounded-full">
              {selectedCompany.name}
              <button type="button" onClick={() => onSelectCompany(null)} className="hover:text-primary/60 transition-colors">
                <X size={10} />
              </button>
            </span>
          )}
          {selectedSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 bg-primary/10 dark:bg-primary/20 text-primary text-[11px] font-medium px-2.5 py-1 rounded-full"
            >
              {skill}
              <button type="button" onClick={() => onToggleSkill(skill)} className="hover:text-primary/60 transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function MarketplacePage() {
  const { t } = useLanguage();
  const p = t.jobseekerMarketplacePage;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [difficulty, setDifficulty] = useState<"All" | Difficulty>("All");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"featured" | "newest" | "most_practiced" | "highest_rated">("featured");

  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Raw results from BE — keyed by companyId (the only BE-side filter that works).
  // All other filters (difficulty, skills, search, sort) run client-side on this cache.
  const rawCacheRef = useRef<{ key: string; results: QuestionSet[] } | null>(null);
  // Track previous filter values to detect filter-vs-page changes inside the effect
  const prevFiltersRef = useRef({
    debouncedSearch: "",
    difficulty: "All" as "All" | Difficulty,
    skills: "",
    companyId: null as string | null,
    sortBy: "featured" as "featured" | "newest" | "most_practiced" | "highest_rated",
    reloadKey: 0,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  function scrollToSearch() {
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    searchInputRef.current?.focus();
  }

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    listQuestionSets({ pageSize: FETCH_SIZE })
      .then((res) => {
        const skillSet = new Set<string>();
        res.items.forEach((s) => s.skills.forEach((sk) => skillSet.add(sk)));
        setAvailableSkills(Array.from(skillSet).sort());
      })
      .catch(() => {});
    getBookmarkedSetIds().then(setBookmarkedIds);
    listCompanies({ pageSize: 100 })
      .then((res) => setCompanies(res.items))
      .catch(() => {});
  }, []);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  useEffect(() => {
    let cancelled = false;
    const term = debouncedSearch.trim();

    // Detect whether a filter changed vs just a page flip
    const prev = prevFiltersRef.current;
    const companyOrReloadChanged =
      prev.companyId !== selectedCompanyId || prev.reloadKey !== reloadKey;
    const filterChanged =
      companyOrReloadChanged ||
      prev.debouncedSearch !== debouncedSearch ||
      prev.difficulty !== difficulty ||
      prev.skills !== selectedSkills.join(",") ||
      prev.sortBy !== sortBy;

    if (filterChanged) {
      prevFiltersRef.current = {
        debouncedSearch,
        difficulty,
        skills: selectedSkills.join(","),
        companyId: selectedCompanyId,
        sortBy,
        reloadKey,
      };
      setPage(1);
      // Only a company/reload change requires a fresh network fetch
      if (companyOrReloadChanged) rawCacheRef.current = null;
    }

    const effectPage = filterChanged ? 1 : page;

    // Cache is keyed by the only BE-side filter (companyId).
    // All other filters are applied client-side on the cached raw results.
    const cacheKey = `${selectedCompanyId ?? ""}|${reloadKey}`;
    const cached = rawCacheRef.current;

    function applyAndSet(allItems: QuestionSet[]) {
      const filtered = applyClientFilters(allItems, term, difficulty, selectedSkills, sortBy);
      setTotalCount(filtered.length);
      const start = (effectPage - 1) * PAGE_SIZE;
      setSets(filtered.slice(start, start + PAGE_SIZE));
    }

    if (cached && cached.key === cacheKey) {
      // Cache hit — apply all filters client-side instantly, no network call
      applyAndSet(cached.results);
      return;
    }

    // Cache miss — fetch from BE using only companyId (the only reliable BE filter)
    setLoading(true);
    setError(false);
    listQuestionSets({
      companyId: selectedCompanyId ?? undefined,
      page: 1,
      pageSize: FETCH_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        rawCacheRef.current = { key: cacheKey, results: res.items };
        applyAndSet(res.items);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedSearch, difficulty, selectedSkills, selectedCompanyId, sortBy, page, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function goToPage(newPage: number) {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const navBtnCls = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors",
    portalCard,
    portalSubtextAlt,
    "hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:pointer-events-none"
  );

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="hr-quick-generate rounded-xl px-6 sm:px-10 py-7 sm:py-9 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
      >
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 dark:bg-primary/15 border border-primary/20 rounded-full px-3 py-1 mb-4">
            <Sparkles size={12} className="text-primary" />
            <span className="text-[11px] font-semibold text-primary">{p.heroBadge}</span>
          </div>
          <h1 className={cn("text-[24px] sm:text-[32px] font-extrabold leading-7.5 sm:leading-10 mb-2.5", portalHeadingAlt)}>
            {p.heroTitle}{" "}
            <span className="gradient-text-animate">{p.heroTitleAccent}</span>
          </h1>
          <p className={cn("text-[13px] leading-5 max-w-md", portalSubtextAlt)}>
            {p.heroSub}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:shrink-0">
          <button
            type="button"
            onClick={scrollToSearch}
            className="shimmer-button w-full sm:w-auto h-10 px-5 text-[13px] font-semibold text-white hr-cta-btn rounded-lg"
          >
            {p.heroCta}
          </button>
          <p className={cn("text-[12px] hidden sm:block", portalSubtextAlt)}>{p.heroCtaSub}</p>
        </div>
      </motion.section>

      {/* ── Search + Filters ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="relative z-10"
      >
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchInputRef={searchInputRef}
        searchPlaceholder={p.searchPlaceholder}
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        availableSkills={availableSkills}
        selectedSkills={selectedSkills}
        onToggleSkill={toggleSkill}
        onClearSkills={() => setSelectedSkills([])}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onSelectCompany={setSelectedCompanyId}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        labels={p}
      />
      </motion.div>

      {/* ── Results count ─────────────────────────────────────────────────── */}
      {!loading && !error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.18 }}
          className={cn("text-[13px] mb-5", portalSubtextAlt)}
        >
          <span className={cn("font-semibold", portalHeadingAlt)}>{totalCount}</span>{" "}
          {p.setsFound}
        </motion.p>
      )}

      {/* ── Card Grid ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="hr-glass-card p-6 h-56 animate-pulse flex flex-col gap-4">
              <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className={cn("text-[14px]", portalSubtextAlt)}>{p.loadFailed}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline"
          >
            <RefreshCw size={13} />
            {p.retryBtn}
          </button>
        </div>
      ) : sets.length === 0 ? (
        <EmptyState icon={Search} title={p.noResults} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sets.map((set, i) => (
            <motion.div
              key={set.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: "easeOut" }}
              className="hover:drop-shadow-md transition-[filter] duration-200"
            >
              <QuestionSetCard
                set={set}
                initialBookmarked={bookmarkedIds.has(set.id)}
                onBookmarkChange={(id, bookmarked) => {
                  setBookmarkedIds((prev) => {
                    const next = new Set(prev);
                    if (bookmarked) next.add(id); else next.delete(id);
                    return next;
                  });
                }}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-8">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className={navBtnCls}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </button>

          {getPageNums(page, totalPages).map((num, i) =>
            num === "…" ? (
              <span
                key={`ellipsis-${i}`}
                className={cn("w-8 text-center text-sm select-none", portalSubtextAlt)}
              >
                …
              </span>
            ) : (
              <button
                key={num}
                type="button"
                onClick={() => goToPage(num as number)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  num === page
                    ? "bg-primary text-white shadow-sm scale-105"
                    : cn(navBtnCls)
                )}
              >
                {num}
              </button>
            )
          )}

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className={navBtnCls}
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
