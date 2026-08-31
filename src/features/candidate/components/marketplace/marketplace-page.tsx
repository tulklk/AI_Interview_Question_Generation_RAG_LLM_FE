"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search, Sparkles, AlertCircle, RefreshCw,
  ChevronDown, Check, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { listQuestionSets, getBookmarkedSetIds, listBookmarkedQuestionSets } from "@/features/candidate/services/question-set.service";
import { listMyPersonalSets } from "@/features/candidate/services/personal-set.service";
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

/**
 * Returns ALL "Dành cho bạn" items — every set tied at the highest CV match.
 * Priority: (1) all sets sharing the highest matchPercent → (2) first pinned → (3) first item.
 *
 * If there are multiple sets at 100% (or any equal top score), they ALL belong
 * together in the "Dành cho bạn" section; only non-tied items go to "Gợi ý tiếp theo".
 */
function selectTopMatchSets(items: QuestionSet[]): QuestionSet[] {
  if (items.length === 0) return [];
  const withMatch = items.filter((s) => s.matchPercent != null);
  if (withMatch.length > 0) {
    const maxPct = Math.max(...withMatch.map((s) => s.matchPercent!));
    // Return every set tied at the top score, in their current sort order.
    return withMatch.filter((s) => s.matchPercent === maxPct);
  }
  // No CV data: fall back to a single hero (pinned or first).
  const hero = items.find((s) => s.isPinned) ?? items[0];
  return hero ? [hero] : [];
}
const PAGE_SIZE = 9;
type PracticeChip = "cv" | "targetRole" | "weak" | "mine" | "saved" | "trending" | "unattempted" | "retry";
const PRACTICE_CHIPS: PracticeChip[] = ["cv", "targetRole", "weak", "mine", "saved", "trending", "unattempted", "retry"];

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
type SortValue = "featured" | "newest" | "most_practiced" | "highest_rated" | "best_match";

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
  sortBestMatch: string;
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
  sortBy: SortValue;
  onSortByChange: (v: SortValue) => void;
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
    <div className="hr-glass-card p-3 mb-4">
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
              diffOpen
                ? "border-primary shadow-[0_0_0_3px_rgba(108,71,255,0.1)]"
                : difficulty !== "All"
                ? "border-primary/40 bg-primary/4 dark:bg-primary/8"
                : "",
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
                companyOpen
                  ? "border-primary shadow-[0_0_0_3px_rgba(108,71,255,0.1)]"
                  : selectedCompany
                  ? "border-primary/40 bg-primary/4 dark:bg-primary/8"
                  : "",
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
                skillOpen
                  ? "border-primary shadow-[0_0_0_3px_rgba(108,71,255,0.1)]"
                  : selectedSkills.length > 0
                  ? "border-primary/40 bg-primary/4 dark:bg-primary/8"
                  : "",
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
            { value: "best_match",     label: p.sortBestMatch },
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

// ── ScrollRevealCard ─────────────────────────────────────────────────────────
// Two-phase animation:
//
// PHASE 1 — "entering" (on every mount: initial page load OR after a filter
//   change that causes the loading skeleton to appear and cards to remount):
//   A CSS @keyframes animation handles the appearance so it starts on the
//   VERY FIRST browser paint — no JS rAF tricks, no invisible frames.
//   animationFillMode:"both" means cards start from the `from` keyframe
//   even during the stagger delay period (never a blank flash).
//   Duration 0.36s + per-card stagger. Switches to idle phase afterwards.
//
// PHASE 2 — "idle" (after mount animation finishes, ~400ms post-mount):
//   IntersectionObserver handles scroll-based show / hide.
//
//   SCROLL DOWN — card enters from below:
//     translateY(+10px) → 0   stagger delay ✓
//
//   SCROLL DOWN past card — exits from TOP:
//     Hide INSTANTLY (no CSS transition). Top cards never "disappear"
//     when the user later scrolls back up.
//
//   SCROLL UP — card exits from BOTTOM:
//     0 → translateY(+10px)  delay=0, slides DOWN.
//     Observer fires bottom-most card first → bottom-to-top cascade ✓
//
//   SCROLL UP to revisit — re-enters from TOP:
//     translateY(-10px) → 0   no stagger, slides smoothly.
function ScrollRevealCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // 'entering': CSS animation is running — IntersectionObserver not yet active.
  // 'idle':     CSS animation done — IntersectionObserver owns visibility.
  const [phase, setPhase] = useState<"entering" | "idle">("entering");

  // Idle-phase visibility state (ignored during entering).
  const [visible, setVisible]           = useState(true);
  const [transEnabled, setTransEnabled] = useState(false);
  const [hiddenY, setHiddenY]           = useState(10);
  const [activeDelay, setActiveDelay]   = useState(delay);
  // instant=true → this render uses transition:none.
  const [instant, setInstant]           = useState(false);

  // Switch to idle after the CSS animation + stagger completes.
  useEffect(() => {
    const id = setTimeout(() => {
      setPhase("idle");
      setTransEnabled(true);
    }, delay + 400); // 360ms animation + 40ms buffer
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally captured once — delay is constant per card instance

  // IntersectionObserver (idle phase only).
  useEffect(() => {
    if (phase !== "idle") return;
    const el = ref.current;
    if (!el) return;

    let firstFire = true;

    const obs = new IntersectionObserver(
      ([entry]) => {
        const cardTop = entry.boundingClientRect.top;
        const vh      = entry.rootBounds?.height ?? window.innerHeight;

        // ── First fire after phase switch: sync state, no animation ────────
        if (firstFire) {
          firstFire = false;
          if (!entry.isIntersecting) {
            // Card is off-screen — position it correctly without animating.
            setInstant(true);
            setHiddenY(cardTop < 0 ? -10 : 10);
            setVisible(false);
            requestAnimationFrame(() => setInstant(false));
          }
          // Still intersecting → card is already visible from CSS anim; nothing to do.
          return;
        }

        // ── Subsequent scroll events ────────────────────────────────────────
        if (entry.isIntersecting) {
          const fromBelow = cardTop > vh * 0.5;
          setHiddenY(fromBelow ? 10 : -10);
          setActiveDelay(fromBelow ? delay : 0);
          setVisible(true);
        } else {
          const exitFromTop = cardTop < 0;
          if (exitFromTop) {
            setInstant(true);
            setHiddenY(-10);
            setVisible(false);
            requestAnimationFrame(() => setInstant(false));
          } else {
            setActiveDelay(0);
            setHiddenY(10);
            setVisible(false);
          }
        }
      },
      { threshold: 0.04 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [phase, delay]);

  const style: React.CSSProperties =
    phase === "entering"
      ? {
          // CSS animation: starts on the first browser paint, no JS gap.
          animationName:           "src-card-enter",
          animationDuration:       "0.36s",
          animationDelay:          `${delay}ms`,
          animationTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
          // "both" = apply `from` state during delay + keep `to` state after.
          animationFillMode:       "both",
        }
      : {
          opacity:    visible ? 1 : 0,
          transform:  visible ? "translateY(0)" : `translateY(${hiddenY}px)`,
          transition: transEnabled && !instant
            ? `opacity 0.36s ${activeDelay}ms cubic-bezier(0.4,0,0.2,1),` +
              `transform 0.36s ${activeDelay}ms cubic-bezier(0.4,0,0.2,1)`
            : "none",
        };

  return (
    <>
      {/* Keyframe injected once per entering card; removed when phase→idle. */}
      {phase === "entering" && (
        <style>{`@keyframes src-card-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      )}
      <div ref={ref} style={style}>
        {children}
      </div>
    </>
  );
}

export function MarketplacePage() {
  const { t } = useLanguage();
  const p = t.jobseekerMarketplacePage;
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [difficulty, setDifficulty] = useState<"All" | Difficulty>("All");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortValue>("featured");
  const [chip, setChip] = useState<PracticeChip | null>(null);

  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // True if any item in the latest API response has CV match data (matchPercent != null).
  // Used to decide whether to show "Dành cho bạn" empty state when filters
  // remove all CV-matched sets from the current view.
  const [hasCvData, setHasCvData] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  // Ref for the top of the page content — used by goToPage to scroll the
  // nearest scroll container back to top (works even when the parent shell
  // uses its own overflow container instead of window).
  const topRef = useRef<HTMLDivElement>(null);

  function scrollToSearch() {
    searchInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    searchInputRef.current?.focus();
  }

  function scrollToTop() {
    const el = topRef.current;
    if (!el) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    // Walk up to find the nearest scrollable ancestor (the app-shell's content panel).
    let parent: Element | null = el.parentElement;
    while (parent) {
      const { overflowY } = window.getComputedStyle(parent);
      if (overflowY === "auto" || overflowY === "scroll") {
        parent.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      parent = parent.parentElement;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const skillsParam = searchParams.get("skills");
    const chipParam = searchParams.get("chip");
    if (skillsParam) setSelectedSkills(skillsParam.split(",").map((s) => s.trim()).filter(Boolean));
    if (chipParam && (PRACTICE_CHIPS as readonly string[]).includes(chipParam)) {
      setChip(chipParam as PracticeChip);
    }
  }, [searchParams]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    listQuestionSets({ pageSize: 100 })
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
    setPage(1);
  }, [debouncedSearch, difficulty, selectedSkills, selectedCompanyId, sortBy, chip, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    // ── Client-side filter + sort (fallback for backend that ignores params) ──
    function applyLocalFilters(items: QuestionSet[]): QuestionSet[] {
      let out = items;

      // 1. Keyword — matches title, company name, or any skill tag
      const q = debouncedSearch.trim().toLowerCase();
      if (q) {
        out = out.filter((s) =>
          s.title.toLowerCase().includes(q) ||
          s.company.toLowerCase().includes(q) ||
          s.skills.some((sk) => sk.toLowerCase().includes(q))
        );
      }

      // 2. Difficulty
      if (difficulty !== "All") {
        out = out.filter((s) => s.difficulty === difficulty);
      }

      // 3. Skills (any-match)
      if (selectedSkills.length > 0) {
        out = out.filter((s) => selectedSkills.some((sk) => s.skills.includes(sk)));
      }

      // 4. Company — resolve company id → name, then match
      if (selectedCompanyId) {
        const compName = companies.find((c) => c.id === selectedCompanyId)?.name ?? "";
        if (compName) {
          out = out.filter((s) => s.company.toLowerCase() === compName.toLowerCase());
        }
      }

      // 5. Sort
      switch (sortBy) {
        case "best_match":
          out = [...out].sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0));
          break;
        case "newest":
          out = [...out].sort((a, b) =>
            (b.myLastCompletedAt ?? "").localeCompare(a.myLastCompletedAt ?? "")
          );
          break;
        case "most_practiced":
          out = [...out].sort((a, b) => (b.attempts ?? 0) - (a.attempts ?? 0));
          break;
        case "highest_rated":
          out = [...out].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
          break;
        // "featured": pinned first, then highest CV match, then backend order.
        // Sorting by matchPercent here ensures items with 100% match land
        // in the first page slice so selectFeaturedSet() can pick them as hero.
        default:
          out = [...out].sort((a, b) => {
            const pinDiff = (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
            if (pinDiff !== 0) return pinDiff;
            return (b.matchPercent ?? 0) - (a.matchPercent ?? 0);
          });
          break;
      }

      return out;
    }

    const load = async () => {
      // ── "Bộ của tôi": personal sets have their own endpoint ──────────────
      if (chip === "mine") {
        const mine = await listMyPersonalSets();
        if (cancelled) return;
        const allMapped: QuestionSet[] = mine.map((s) => ({
          id: s.id,
          title: s.title,
          company: p.personalMineCompany,
          companyInitials: "ME",
          companyColor: "#6366f1",
          difficulty: "Medium" as const,
          skills: s.skills,
          totalQuestions: s.totalQuestions,
          estimatedTime: "",
          myLastScore: s.myLastScore,
          myLastCompletedAt: s.myLastCompletedAt,
          questions: [],
        }));
        const filtered = applyLocalFilters(allMapped);
        // Personal sets never have CV match data.
        setHasCvData(false);
        const start = (page - 1) * PAGE_SIZE;
        setSets(filtered.slice(start, start + PAGE_SIZE));
        setTotalCount(filtered.length);
        return;
      }

      // ── "Đã lưu": bookmarked sets have their own endpoint ─────────────────
      if (chip === "saved") {
        const saved = await listBookmarkedQuestionSets();
        if (cancelled) return;
        const filtered = applyLocalFilters(saved);
        // Saved-sets view doesn't show "Dành cho bạn".
        setHasCvData(false);
        const start = (page - 1) * PAGE_SIZE;
        setSets(filtered.slice(start, start + PAGE_SIZE));
        setTotalCount(filtered.length);
        return;
      }

      // ── Main marketplace: fetch ALL then filter client-side ───────────────
      // Backend may or may not honour filter params; client-side is the
      // authoritative layer so filters always work regardless of BE support.
      const marketplaceChip =
        chip === "cv" || chip === "targetRole" || chip === "weak"
        || chip === "trending" || chip === "unattempted" || chip === "retry"
          ? chip
          : undefined;

      const effectiveSortBy: SortValue = chip === "cv" ? "best_match" : sortBy;

      // Pass params to backend as hints (reduces payload when BE supports them),
      // but we re-filter on the full result set regardless.
      const allRes = await listQuestionSets({
        keyword: debouncedSearch.trim() || undefined,
        difficulty: difficulty === "All" ? undefined : difficulty,
        skills: selectedSkills.length ? selectedSkills : undefined,
        companyId: selectedCompanyId ?? undefined,
        pageSize: 500,          // fetch all; client handles pagination
        sortBy: effectiveSortBy,
        chip: marketplaceChip,
      });
      if (cancelled) return;

      const filtered = applyLocalFilters(allRes.items);
      // Track whether the backend returned ANY CV-match data at all.
      // Used to decide whether to show the "Dành cho bạn" empty state when
      // active filters happen to remove all CV-matched sets from the current page.
      setHasCvData(allRes.items.some((s) => s.matchPercent != null));
      const start = (page - 1) * PAGE_SIZE;
      setSets(filtered.slice(start, start + PAGE_SIZE));
      setTotalCount(filtered.length);
    };

    load()
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedSearch, difficulty, selectedSkills, selectedCompanyId, sortBy, page, reloadKey, chip, p.personalMineCompany]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function goToPage(newPage: number) {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    scrollToTop();
  }

  const navBtnCls = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors",
    portalCard,
    portalSubtextAlt,
    "hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:pointer-events-none"
  );

  return (
    <div ref={topRef}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="hr-quick-generate rounded-xl px-6 sm:px-10 py-5 sm:py-7 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
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

      <div className="flex flex-wrap gap-2 mb-4">
        {([
          ["cv", p.chipCv],
          ["targetRole", p.chipTargetRole],
          ["weak", p.chipWeak],
          ["mine", p.chipMine],
          ["saved", p.chipSaved],
          ["trending", p.chipTrending],
          ["unattempted", p.chipUnattempted],
          ["retry", p.chipRetry],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setChip((c) => {
                const next = c === id ? null : id;
                if (id === "cv") {
                  // Toggling ON → sort by best match; toggling OFF → restore default
                  setSortBy(next === "cv" ? "best_match" : "featured");
                }
                return next;
              });
            }}
            className={cn(
              "h-8 px-3 rounded-full text-[12px] font-semibold border transition-colors",
              chip === id
                ? "bg-primary text-white border-primary"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300",
            )}
          >
            {label}
          </button>
        ))}
      </div>

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

      {/* ── Feed: Hero + Horizontal Smart Cards ──────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700/60 animate-pulse mb-1" />
          <div className="h-60 rounded-2xl bg-gray-100 dark:bg-gray-800/60 animate-pulse" />
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700/60 animate-pulse mt-5 mb-1" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800/60 animate-pulse" />
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
      ) : (() => {
        // topItems = all sets sharing the highest CV match (could be 1 or many).
        // heroItem  = sentinel (non-null = CV-matched sets exist to show).
        // listSets  = everything else → rendered under "Gợi ý tiếp theo".
        const topItems = page === 1 ? selectTopMatchSets(sets) : [];
        // Only treat top items as "Dành cho bạn" when they have actual CV match
        // data. When hasCvData=true but filters removed all CV-matched sets,
        // selectTopMatchSets falls back to the first/pinned item (no matchPercent)
        // — those should NOT render as featured, and an empty state is shown instead.
        const topItemsHaveCvMatch = topItems.some((s) => s.matchPercent != null);
        // heroItem is just a sentinel: non-null means we have real CV-matched sets to show.
        const heroItem = topItemsHaveCvMatch ? (topItems[0] ?? null) : null;
        const topIds = new Set(topItemsHaveCvMatch ? topItems.map((s) => s.id) : []);

        // Remaining items after removing all "Dành cho bạn" items.
        const rawList = sets.filter((s) => !topIds.has(s.id));
        // Sort remaining by CV match when in default "featured" order.
        const listSets = heroItem && sortBy === "featured"
          ? [...rawList].sort((a, b) => (b.matchPercent ?? 0) - (a.matchPercent ?? 0))
          : rawList;

        const bookmarkCb = (id: string, bm: boolean) =>
          setBookmarkedIds((prev) => { const next = new Set(prev); if (bm) next.add(id); else next.delete(id); return next; });

        return (
          <>
            {/* ── "Dành cho bạn" section ── */}
            {page === 1 && hasCvData && (
              heroItem ? (
                // Show all CV-matched top items as QuestionSetCard (featured)
                // for consistent UI regardless of count.
                <div className="mb-8">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                      <span aria-hidden>✦</span>
                      {p.featuredLabel}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {topItems.map((set, i) => (
                      <ScrollRevealCard key={set.id} delay={Math.min(i, 4) * 40}>
                        <QuestionSetCard
                          set={set}
                          initialBookmarked={bookmarkedIds.has(set.id)}
                          onBookmarkChange={bookmarkCb}
                          featured
                          layout="horizontal"
                        />
                      </ScrollRevealCard>
                    ))}
                  </div>
                </div>
              ) : (
                // CV data exists but active filters removed all CV-matched sets.
                // Show an empty state so the user knows their best-match sets
                // are hidden (not gone) — they can clear a filter to reveal them.
                <div className="mb-8">
                  <style>{`
                    @keyframes fdb-spark{0%,100%{transform:scale(1) rotate(0deg);filter:drop-shadow(0 0 0 rgba(124,58,237,0))}50%{transform:scale(1.4) rotate(22deg);filter:drop-shadow(0 0 6px rgba(124,58,237,0.8))}}
                    @keyframes fdb-glow{0%,100%{text-shadow:0 0 0 transparent}50%{text-shadow:0 0 10px rgba(124,58,237,0.5)}}
                  `}</style>
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                      <span aria-hidden className="inline-block" style={{ animation: "fdb-spark 2.4s ease-in-out infinite" }}>✦</span>
                      <span style={{ animation: "fdb-glow 2.4s ease-in-out infinite" }}>{p.featuredLabel}</span>
                    </span>
                  </div>
                  <div className="rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] dark:bg-primary/[0.06] p-5 flex items-center gap-4">
                    <span className="text-[26px] shrink-0">🔍</span>
                    <div>
                      <p className="text-[13.5px] font-semibold text-gray-700 dark:text-gray-300">
                        Không có bộ phù hợp với bạn
                      </p>
                      <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">
                        Thử thay đổi điều kiện lọc để xem các bộ khớp với CV của bạn.
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* ── "Gợi ý tiếp theo" / full list section ── */}
            {listSets.length > 0 && (
              <div className="flex items-center justify-between mb-4">
                <h2 className={cn("text-[15px] font-bold", portalHeadingAlt)}>
                  {heroItem ? p.feedTitle : `${totalCount} ${p.setsFound}`}
                </h2>
                {heroItem && (
                  <span className={cn("text-[13px]", portalSubtextAlt)}>
                    <span className={cn("font-semibold", portalHeadingAlt)}>{totalCount}</span>{" "}{p.setsFound}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {listSets.map((set, i) => (
                <ScrollRevealCard key={set.id} delay={Math.min(i, 5) * 40}>
                  <QuestionSetCard
                    set={set}
                    initialBookmarked={bookmarkedIds.has(set.id)}
                    onBookmarkChange={bookmarkCb}
                    layout="horizontal"
                  />
                </ScrollRevealCard>
              ))}
            </div>
          </>
        );
      })()}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-8">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className={navBtnCls}
            aria-label={p.prevPage}
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
            aria-label={p.nextPage}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
