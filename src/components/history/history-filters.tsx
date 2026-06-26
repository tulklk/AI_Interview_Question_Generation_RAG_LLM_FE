"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Filter, Clock, Briefcase, Activity, Download, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";

const roleKeys = ["Frontend", "Backend", "Data", "Product", "Design", "DevOps", "ML"];
const difficultyKeys = ["Easy", "Medium", "Hard"];
const experienceKeys = ["Intern", "Junior", "Mid-Level", "Senior", "Lead"];

interface FilterOption { value: string; label: string }

interface FilterSelectProps {
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  icon: React.ReactNode;
}

function FilterSelect({ value, options, onChange, icon }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? options[0].label;
  const longestLabel = options.reduce((a, b) => a.label.length >= b.label.length ? a : b).label;

  useEffect(() => { setMounted(true); }, []);

  function handleToggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelMinW = Math.max(rect.width, 160);
      // Prevent panel from going off right edge
      const left = rect.left + panelMinW > window.innerWidth - 8
        ? Math.max(8, window.innerWidth - panelMinW - 8)
        : rect.left;
      setPanelStyle({
        top: rect.bottom + 4,
        left,
        minWidth: panelMinW,
      });
    }
    setOpen((o) => !o);
  }

  // Close on outside click — check both button and panel
  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open]);

  // Close on scroll (panel position would be stale)
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [open]);

  const dropdownPanel = mounted && open ? createPortal(
    <div
      ref={panelRef}
      style={panelStyle}
      className={cn(
        "fixed z-9999 rounded-lg py-1 shadow-2xl",
        "bg-white dark:bg-[#1e2130] border border-gray-200 dark:border-gray-700"
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { onChange(opt.value); setOpen(false); }}
          className={cn(
            "w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors whitespace-nowrap",
            "hover:bg-gray-50 dark:hover:bg-gray-700/50",
            value === opt.value
              ? "text-violet-600 dark:text-violet-400 font-medium"
              : "text-gray-700 dark:text-gray-300"
          )}
        >
          <span>{opt.label}</span>
          {value === opt.value && <Check size={12} className="shrink-0 text-violet-500 dark:text-violet-400" />}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors select-none whitespace-nowrap",
          "bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60",
          "text-gray-900 dark:text-gray-100",
          "hover:border-gray-300 dark:hover:border-gray-600",
          open && "border-violet-400 dark:border-violet-500/60"
        )}
      >
        <span className="text-gray-400 dark:text-gray-500 shrink-0">{icon}</span>
        {/* Ghost text stabilises button width; selected label overlays it */}
        <span className="relative whitespace-nowrap">
          <span className="invisible" aria-hidden>{longestLabel}</span>
          <span className="absolute inset-0 flex items-center">{selectedLabel}</span>
        </span>
        <ChevronDown
          size={13}
          className={cn(
            "text-gray-400 dark:text-gray-500 transition-transform duration-150 shrink-0",
            open && "rotate-180"
          )}
        />
      </button>
      {dropdownPanel}
    </div>
  );
}

interface HistoryFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  role: string;
  onRoleChange: (v: string) => void;
  level: string;
  onLevelChange: (v: string) => void;
  experience: string;
  onExperienceChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
}

export function HistoryFilters({
  search,
  onSearchChange,
  role,
  onRoleChange,
  level,
  onLevelChange,
  experience,
  onExperienceChange,
  status,
  onStatusChange,
}: HistoryFiltersProps) {
  const { t } = useLanguage();
  const hf = t.historyPage.filters;

  const roles: FilterOption[] = [{ value: "", label: hf.allRoles }, ...roleKeys.map((r) => ({ value: r, label: r }))];
  const levels: FilterOption[] = [{ value: "", label: hf.allLevels }, ...difficultyKeys.map((d) => ({ value: d, label: d }))];
  const experiences: FilterOption[] = [{ value: "", label: hf.allExperiences }, ...experienceKeys.map((e) => ({ value: e, label: e }))];
  const statuses: FilterOption[] = [
    { value: "",              label: hf.allStatuses },
    { value: "COMPLETED",    label: hf.statusCompleted },
    { value: "PLAN_PROPOSED", label: hf.statusPlanProposed },
    { value: "IN_PROGRESS",  label: hf.statusInProgress },
    { value: "FAILED",       label: hf.statusFailed },
  ];

  return (
    <div className="flex flex-col gap-3 mb-4 animate-fade-up">
      {/* Search — full width */}
      <div className="relative w-full">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={hf.searchPlaceholder}
          className={cn(
            "w-full pl-9 pr-4 py-2 text-sm rounded-lg transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500",
            "dark:focus:ring-violet-400/20 dark:focus:border-violet-400",
            "bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60",
            "text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          )}
        />
      </div>

      {/* Filters row + export — all on one scrollable row on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <FilterSelect value={role}       options={roles}       onChange={onRoleChange}       icon={<Filter    size={13} />} />
        <FilterSelect value={level}      options={levels}      onChange={onLevelChange}      icon={<Clock     size={13} />} />
        <FilterSelect value={experience} options={experiences} onChange={onExperienceChange} icon={<Briefcase size={13} />} />
        <FilterSelect value={status}     options={statuses}    onChange={onStatusChange}     icon={<Activity  size={13} />} />

        <button
          type="button"
          className={cn(
            "shrink-0 flex items-center gap-2 text-sm font-semibold rounded-lg px-4 py-2 transition-colors whitespace-nowrap ml-auto",
            "bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60",
            "text-gray-700 dark:text-gray-300",
            "hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-600 dark:hover:text-violet-400"
          )}
        >
          <Download size={14} />
          {hf.exportAll}
        </button>
      </div>
    </div>
  );
}
