"use client";

import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Search, Sparkles, SlidersHorizontal, AlertCircle, RefreshCw, Loader2, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { listQuestionSets, getBookmarkedSetIds } from "@/features/candidate/services/question-set.service";
import { QuestionSetCard } from "./question-set-card";
import { useLanguage } from "@/shared/providers/language-context";
import type { Difficulty, QuestionSet } from "@/features/candidate/types/jobseeker";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import { useToast } from "@/shared/providers/toast-context";
import {
  portalCard,
  portalHeadingAlt,
  portalInput,
  portalMutedBg,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

const DIFFICULTIES: Array<"All" | Difficulty> = ["All", "Easy", "Medium", "Hard"];
const PAGE_SIZE = 12;
// BE's Keyword filter only matches the question-set title, not company name or
// skills — even though the search box explicitly promises "role, company, or
// skill". When searching, fetch a larger batch (ignoring Keyword) and match
// title/company/skills client-side instead so company search actually works.
const SEARCH_FETCH_SIZE = 200;

function matchesSearchTerm(set: QuestionSet, term: string): boolean {
  const q = term.toLowerCase();
  return (
    set.title.toLowerCase().includes(q) ||
    set.company.toLowerCase().includes(q) ||
    set.skills.some((s) => s.toLowerCase().includes(q))
  );
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ── Difficulty badge colour helper ─────────────────────────────────────────

function difficultyColor(d: "All" | Difficulty) {
  if (d === "Easy")   return "text-emerald-600 dark:text-emerald-400";
  if (d === "Medium") return "text-amber-500 dark:text-amber-400";
  if (d === "Hard")   return "text-red-500 dark:text-red-400";
  return "";
}

// ── FilterBar ──────────────────────────────────────────────────────────────

interface FilterBarLabels {
  searchPlaceholder: string;
  allDifficulties: string;
  easy: string;
  medium: string;
  hard: string;
  difficultyLabel: string;
  skillsDropdownLabel: string;
  skillsSelected: string;
  skillsSearchPlaceholder: string;
  clearAll: string;
}

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchPlaceholder: string;
  difficulty: "All" | Difficulty;
  onDifficultyChange: (d: "All" | Difficulty) => void;
  availableSkills: string[];
  selectedSkills: string[];
  onToggleSkill: (s: string) => void;
  onClearSkills: () => void;
  labels: FilterBarLabels;
}

function FilterBar({
  search, onSearchChange, searchInputRef, searchPlaceholder,
  difficulty, onDifficultyChange,
  availableSkills, selectedSkills, onToggleSkill, onClearSkills,
  labels: p,
}: FilterBarProps) {
  const [diffOpen, setDiffOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");

  const diffRef = useRef<HTMLDivElement>(null);
  const skillRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (diffRef.current && !diffRef.current.contains(e.target as Node)) setDiffOpen(false);
      if (skillRef.current && !skillRef.current.contains(e.target as Node)) setSkillOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredSkills = skillSearch.trim()
    ? availableSkills.filter((s) => s.toLowerCase().includes(skillSearch.toLowerCase()))
    : availableSkills;

  const diffLabel =
    difficulty === "All" ? p.allDifficulties
    : difficulty === "Easy"   ? p.easy
    : difficulty === "Medium" ? p.medium
    : p.hard;

  const dropdownBase = cn(
    "absolute top-full mt-1.5 z-30 rounded-xl border shadow-lg overflow-hidden",
    "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
  );
  const optionBase = "flex items-center gap-2.5 w-full px-3 py-2 text-[13px] transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="hr-glass-card p-3 mb-6"
    >
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className={cn(
          "flex items-center gap-2 rounded-lg px-3 h-10 flex-1",
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
        <div ref={diffRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => { setDiffOpen((v) => !v); setSkillOpen(false); }}
            className={cn(
              "flex items-center gap-2 h-10 px-3.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap",
              portalInput,
              diffOpen ? "border-primary shadow-[0_0_0_3px_rgba(108,71,255,0.1)]" : "",
            )}
          >
            <span className={cn("text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 hidden sm:block")}>
              {p.difficultyLabel}
            </span>
            <span className={cn("font-semibold", difficultyColor(difficulty), difficulty === "All" && portalSubtextAlt)}>
              {diffLabel}
            </span>
            {difficulty !== "All" && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            )}
            <ChevronDown size={13} className={cn("text-gray-400 transition-transform shrink-0", diffOpen && "rotate-180")} />
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

        {/* Skills multi-select dropdown */}
        {availableSkills.length > 0 && (
          <div ref={skillRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => { setSkillOpen((v) => !v); setDiffOpen(false); }}
              className={cn(
                "flex items-center gap-2 h-10 px-3.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap",
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
                  {p.skillsDropdownLabel}
                </span>
              )}
              <ChevronDown size={13} className={cn("text-gray-400 transition-transform shrink-0", skillOpen && "rotate-180")} />
            </button>

            {skillOpen && (
              <div className={cn(dropdownBase, "right-0 w-64")}>
                {/* Search inside dropdown */}
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

                {/* Options list */}
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

                {/* Footer: clear */}
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
      </div>

      {/* Active skill tags */}
      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800">
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
    </motion.div>
  );
}

export function MarketplacePage() {
  const { t } = useLanguage();
  const p = t.jobseekerMarketplacePage;
  const { addToast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [difficulty, setDifficulty] = useState<"All" | Difficulty>("All");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);

  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function scrollToSearch() {
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    searchInputRef.current?.focus();
  }

  // Debounce search input before it triggers a fetch
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  // One-time, unfiltered fetch to populate the full skill-chip picker
  // (independent of the current filters, so the list of options never shrinks).
  useEffect(() => {
    listQuestionSets({})
      .then((res) => {
        const skillSet = new Set<string>();
        res.items.forEach((s) => s.skills.forEach((sk) => skillSet.add(sk)));
        setAvailableSkills(Array.from(skillSet).sort());
      })
      .catch(() => {});
    getBookmarkedSetIds().then(setBookmarkedIds);
  }, []);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  // Filters (or a manual retry) changed — reset to page 1 and replace the list.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const term = debouncedSearch.trim();
    const isSearching = term.length > 0;

    listQuestionSets({
      // While searching, skip server-side Keyword (title-only) entirely and
      // instead pull a larger batch to filter client-side across title/company/skills.
      difficulty: difficulty === "All" ? undefined : difficulty,
      skills: selectedSkills.length > 0 ? selectedSkills : undefined,
      page: 1,
      pageSize: isSearching ? SEARCH_FETCH_SIZE : PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        const items = isSearching ? res.items.filter((s) => matchesSearchTerm(s, term)) : res.items;
        setSets(items);
        setTotalCount(isSearching ? items.length : res.totalCount);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, difficulty, selectedSkills, reloadKey]);

  function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    listQuestionSets({
      difficulty: difficulty === "All" ? undefined : difficulty,
      skills: selectedSkills.length > 0 ? selectedSkills : undefined,
      page: nextPage,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setSets((prev) => [...prev, ...res.items]);
        setTotalCount(res.totalCount);
        setPage(nextPage);
      })
      .catch(() => {
        addToast("error", p.loadFailed);
      })
      .finally(() => setLoadingMore(false));
  }

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hr-quick-generate rounded-xl px-5 sm:px-10 py-8 sm:py-12 mb-8"
      >
        <div className="max-w-2xl">
          {/* Badge */}
          <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5", portalCard)}>
            <Sparkles size={13} className="text-primary" />
            <span className={cn("text-[12px] font-[600]", portalHeadingAlt)}>{p.heroBadge}</span>
          </div>

          {/* Headline */}
          <h1 className={cn("text-[28px] sm:text-[48px] font-[800] leading-[34px] sm:leading-[52px] mb-4", portalHeadingAlt)}>
            {p.heroTitle}{" "}
            <span className="text-primary">{p.heroTitleAccent}</span>
          </h1>
          <p className={cn("text-[16px] leading-[24px] max-w-lg mb-8", portalSubtextAlt)}>
            {p.heroSub}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={scrollToSearch}
              className="shimmer-button h-11 px-6 text-[14px] font-semibold text-white hr-cta-btn rounded-xl"
            >
              {p.heroCta}
            </button>
            <p className={cn("text-[13px]", portalSubtextAlt)}>{p.heroCtaSub}</p>
          </div>
        </div>
      </motion.section>

      {/* ── Search + Filters ─────────────────────────────────────────────── */}
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
        labels={p}
      />

      {/* ── Results count ─────────────────────────────────────────────────── */}
      {!loading && !error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className={cn("text-[13px] mb-5", portalSubtextAlt)}
        >
          <span className={cn("font-[600]", portalHeadingAlt)}>{sets.length}</span>{" "}
          {p.setsFound}
        </motion.p>
      )}

      {/* ── Card Grid ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sets.map((set, i) => (
            <motion.div
              key={set.id}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.02 }}
              className="transition-shadow duration-200 hover:drop-shadow-lg"
            >
              <QuestionSetCard set={set} initialBookmarked={bookmarkedIds.has(set.id)} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Load more — hidden while searching, since that fetch already pulls a large
          enough batch to filter client-side rather than paging through it. */}
      {!loading && !error && !debouncedSearch.trim() && sets.length > 0 && sets.length < totalCount && (
        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={cn(
              "flex items-center gap-2 h-10 px-5 rounded-lg text-[13px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-colors",
              portalCard,
              portalHeadingAlt,
              "hover:border-primary/40"
            )}
          >
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
            {loadingMore ? p.loadingMore : p.loadMoreBtn}
          </button>
        </div>
      )}
    </div>
  );
}
