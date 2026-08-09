"use client";

import { useState, useEffect, useRef, useId } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, RefreshCw, Eye, BarChart2, Clock, Trophy, BookOpen,
  ChevronDown, AlertCircle, History as HistoryIcon, Activity, Check,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  listCompletedSessions,
  getPracticeStats,
  type CompletedSessionSummary,
  type PracticeStats,
} from "@/features/candidate/services/practice-session.service";
import { getCompanyColor, getCompanyInitials } from "@/features/candidate/utils/company-visual";
import { useLanguage } from "@/shared/providers/language-context";
import { StatCard } from "@/features/candidate/components/ui/stat-card";
import { Pill, PendingScorePill, getScoreBadgeClass } from "@/features/candidate/components/ui/pill";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { useToast } from "@/shared/providers/toast-context";
import {
  portalHeadingAlt,
  portalInput,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

const PAGE_SIZE = 10;

type TimeFilterKey = "all" | "week" | "month";

function dateRangeFor(filter: TimeFilterKey): { fromDate?: string } {
  if (filter === "all") return {};
  const from = new Date();
  if (filter === "week") {
    from.setDate(from.getDate() - 7);
  } else {
    from.setDate(1);
  }
  from.setHours(0, 0, 0, 0);
  return { fromDate: from.toISOString() };
}

function formatSessionDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ScorePill({ score, pendingTooltip }: { score: number | null; pendingTooltip: string }) {
  if (score === null) {
    return <PendingScorePill label={pendingTooltip} className="text-[13px] px-2.5 py-1 w-fit" />;
  }
  return (
    <Pill className={cn("text-[13px] font-bold px-2.5 py-1 w-fit", getScoreBadgeClass(score))}>
      {score}%
    </Pill>
  );
}

// ── Micro-chart components ────────────────────────────────────────────────────
function Sparkline({ data, color = "#7C3AED", width = 60, height = 28 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  const rawId = useId();
  const gid = `sl${rawId.replace(/[^a-z0-9]/gi, "")}`;
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max === min ? 1 : max - min;
  const pad = 2;
  const pts = data.map((v, i) => ({
    x: +(pad + (i / (data.length - 1)) * (width - pad * 2)).toFixed(1),
    y: +(pad + (1 - (v - min) / range) * (height - pad * 2)).toFixed(1),
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${height} L${pts[0].x},${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  );
}

function MiniBarChart({ data, color = "#7C3AED", width = 60, height = 28 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (data.length === 0) return null;
  const count = Math.min(data.length, 14);
  const sliced = data.slice(-count);
  const max = Math.max(...sliced, 1);
  const gap = 2;
  const barW = Math.max(2, Math.floor((width - (count - 1) * gap) / count));
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {sliced.map((v, i) => {
        const h = Math.max(3, (v / max) * (height - 2));
        const opacity = i === sliced.length - 1 ? 0.9 : 0.35 + (i / Math.max(sliced.length - 1, 1)) * 0.4;
        return (
          <rect key={i} x={i * (barW + gap)} y={height - h}
            width={barW} height={h} rx={1.5} fill={color} fillOpacity={opacity} />
        );
      })}
    </svg>
  );
}

// ── Pagination helpers ────────────────────────────────────────────────────────
function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums: (number | "…")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) nums.push("…");
  for (let i = left; i <= right; i++) nums.push(i);
  if (right < total - 1) nums.push("…");
  nums.push(total);
  return nums;
}

// ── Custom time-filter dropdown (native <select> ignores dark theme) ──────────
function TimeFilterDropdown({
  value, onChange, options,
}: {
  value: TimeFilterKey;
  onChange: (v: TimeFilterKey) => void;
  options: { value: TimeFilterKey; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 h-9.5 px-3 rounded-lg text-[12px] font-semibold transition-all",
          "border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-gray-900 text-charcoal dark:text-gray-100",
          "hover:border-primary",
          open && "border-primary shadow-[0_0_0_3px_rgba(108,71,255,0.1)]"
        )}
      >
        <span>{current?.label}</span>
        <ChevronDown
          size={13}
          className={cn("text-gray-400 transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className={cn(
          "absolute right-0 top-full z-50 mt-1.5 min-w-35 rounded-xl overflow-hidden py-1",
          "border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-gray-900",
          "shadow-lg dark:shadow-black/40"
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

// ── Pagination bar ────────────────────────────────────────────────────────────
function PaginationBar({
  page, totalPages, onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-end gap-1 mt-6">
      {/* Prev */}
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
          "border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-gray-900",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "hover:border-primary hover:text-primary",
          portalHeadingAlt
        )}
      >
        <ChevronLeft size={14} />
      </button>

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={`ellipsis-${i}`}
            className={cn("w-8 h-8 flex items-center justify-center text-[12px]", portalSubtextAlt)}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p as number)}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-lg text-[13px] font-semibold transition-colors",
              p === page
                ? "bg-primary text-white border border-primary"
                : cn(
                    "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900",
                    "hover:border-primary hover:text-primary",
                    portalHeadingAlt
                  )
            )}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
          "border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-gray-900",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "hover:border-primary hover:text-primary",
          portalHeadingAlt
        )}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function HistoryBoard() {
  const { t } = useLanguage();
  const p = t.jobseekerHistoryPage;
  const { addToast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilterKey>("all");
  const [page, setPage] = useState(1);

  const [sessions, setSessions] = useState<CompletedSessionSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Scroll lên đầu trang khi chuyển trang (không áp dụng lần mount đầu)
  const topRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    topRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [page]);

  // Debounce keyword
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  }

  // Reset page when filter changes
  function handleTimeFilterChange(v: TimeFilterKey) {
    setTimeFilter(v);
    setPage(1);
  }

  // Fetch stats once
  useEffect(() => {
    getPracticeStats().then(setStats).catch(() => {});
  }, [reloadKey]);

  // Fetch current page of sessions
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const { fromDate } = dateRangeFor(timeFilter);
    listCompletedSessions({
      page,
      pageSize: PAGE_SIZE,
      fromDate,
      keyword: debouncedSearch || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setSessions(res.items);
        setTotalCount(res.totalCount);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          addToast("error", p.loadFailed);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadKey, timeFilter, debouncedSearch, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const iconBg = "bg-gray-100 dark:bg-gray-800 shadow-sm ring-1 ring-black/5 dark:ring-white/10";
  const iconColor = "text-gray-900 dark:text-gray-100";

  // Chart data — API returns newest-first, reverse to chronological for left→right trend
  const chronoSessions = [...sessions].reverse();
  const scoreData = chronoSessions.map(s => s.score).filter((v): v is number => v !== null);
  const durationData = chronoSessions.map(s => s.durationMinutes ?? 0);

  const statCards = [
    {
      icon: BookOpen,  label: p.statLabels[0],
      value: (stats?.totalSessions ?? 0).toString(),
      bg: iconBg, color: iconColor,
      chart: durationData.length > 0
        ? <MiniBarChart data={durationData.map(() => 1)} color="#7C3AED" />
        : undefined,
    },
    {
      icon: BarChart2, label: p.statLabels[1],
      value: stats?.averageScore != null ? `${stats.averageScore}%` : "—",
      bg: iconBg, color: iconColor,
      chart: scoreData.length >= 2
        ? <Sparkline data={scoreData} color="#7C3AED" />
        : undefined,
    },
    {
      icon: Trophy,    label: p.statLabels[2],
      value: stats?.bestScore != null ? `${stats.bestScore}%` : "—",
      bg: iconBg, color: iconColor,
      chart: scoreData.length >= 2
        ? <Sparkline data={scoreData} color="#10B981" />
        : undefined,
    },
    {
      icon: Activity,  label: p.statLabels[4],
      value: stats?.latestScore != null ? `${stats.latestScore}%` : "—",
      bg: iconBg, color: iconColor,
      chart: scoreData.length >= 2
        ? <Sparkline data={scoreData} color="#7C3AED" />
        : undefined,
    },
    {
      icon: Clock,     label: p.statLabels[3],
      value: `${stats?.totalDurationMinutes ?? 0} min`,
      bg: iconBg, color: iconColor,
      chart: durationData.some(d => d > 0)
        ? <MiniBarChart data={durationData} color="#F59E0B" />
        : undefined,
    },
  ];

  const timeOptions: { value: TimeFilterKey; label: string }[] = [
    { value: "all",   label: p.filters.allTime },
    { value: "week",  label: p.filters.thisWeek },
    { value: "month", label: p.filters.thisMonth },
  ];

  if (error && sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <p className={cn("text-[14px]", portalSubtextAlt)}>{p.loadFailed}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline"
        >
          <RefreshCw size={13} />
          {p.loadRetryBtn}
        </button>
      </div>
    );
  }

  return (
    <div ref={topRef}>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <StatCard icon={s.icon} iconBg={s.bg} iconColor={s.color} value={s.value} label={s.label} chart={s.chart} />
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="hr-glass-card p-4 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className={cn(
          "flex items-center gap-2 flex-1 rounded-lg px-3 h-9.5 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(108,71,255,0.1)] transition-all",
          portalInput
        )}>
          <Search size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={p.filters.searchPlaceholder}
            className="flex-1 text-[12px] bg-transparent outline-none"
          />
        </div>

        <TimeFilterDropdown
          value={timeFilter}
          onChange={handleTimeFilterChange}
          options={timeOptions}
        />
      </motion.div>

      {/* Table — desktop */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="hr-glass-card overflow-hidden hidden md:block"
      >
        {/* Header */}
        <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_200px] gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
          {[p.table.session, p.table.date, p.table.score, p.table.duration, p.table.actions].map((col) => (
            <span key={col} className={cn("text-[11px] font-bold uppercase tracking-wide", portalSubtextAlt)}>{col}</span>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={loading ? "loading" : `p${page}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <AiLoadingSpinner text={p.loading} />
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState icon={HistoryIcon} title={p.noHistory} className="py-12" />
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {sessions.map((session) => (
                  <motion.li
                    key={session.id}
                    whileHover={{ scale: 1.003 }}
                    className="hr-table-row grid grid-cols-[2.5fr_1fr_1fr_1fr_200px] gap-4 px-6 py-4 items-center"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {session.companyLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={session.companyLogoUrl} alt={session.company} loading="lazy" decoding="async"
                          className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-700" />
                      ) : (
                        <div className={cn("w-8 h-8 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", getCompanyColor(session.company))}>
                          {getCompanyInitials(session.company)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className={cn("text-[13px] font-semibold truncate", portalHeadingAlt)}>{session.setTitle}</p>
                        <p className={cn("text-[11px]", portalSubtextAlt)}>{session.company}</p>
                      </div>
                    </div>

                    <p className={cn("text-[12px]", portalSubtextAlt)}>{formatSessionDate(session.completedAt)}</p>
                    <ScorePill score={session.score} pendingTooltip={p.pendingScoreTooltip} />
                    <p className={cn("text-[12px]", portalSubtextAlt)}>{session.durationMinutes} min</p>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/jobseeker/practice/${session.id}/result`}
                        className={cn(
                          "flex items-center gap-1.5 h-7.5 px-3 text-[11px] font-semibold hover:text-primary hover:bg-[#F5F3FF] dark:hover:bg-purple-950/30 rounded-lg transition-colors",
                          portalSubtextAlt
                        )}
                        title={p.viewBtn}
                      >
                        <Eye size={13} />
                        {p.viewBtn}
                      </Link>
                      <Link
                        href={`/jobseeker/practice/${session.questionSetId}`}
                        className="shimmer-button flex items-center gap-1.5 h-7.5 px-3 text-[11px] font-semibold text-white hr-cta-btn rounded-lg"
                        title={p.retryBtn}
                      >
                        <RefreshCw size={12} />
                        {p.retryBtn}
                      </Link>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Card list — mobile */}
      <div className="md:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={loading ? "loading" : `p${page}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="flex flex-col gap-3"
          >
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <AiLoadingSpinner text={p.loading} />
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState icon={HistoryIcon} title={p.noHistory} className="py-12" />
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="hr-glass-card p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    {session.companyLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={session.companyLogoUrl} alt={session.company} loading="lazy" decoding="async"
                        className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-700" />
                    ) : (
                      <div className={cn("w-9 h-9 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", getCompanyColor(session.company))}>
                        {getCompanyInitials(session.company)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[13px] font-semibold truncate", portalHeadingAlt)}>{session.setTitle}</p>
                      <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{session.company}</p>
                    </div>
                    <ScorePill score={session.score} pendingTooltip={p.pendingScoreTooltip} />
                  </div>

                  <div className={cn("flex items-center gap-3 text-[12px]", portalSubtextAlt)}>
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="shrink-0" />
                      {formatSessionDate(session.completedAt)}
                    </span>
                    <span>·</span>
                    <span>{session.durationMinutes} min</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={`/jobseeker/practice/${session.id}/result`}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 h-8.5 text-[12px] font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors hover:text-primary hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-200 dark:hover:border-violet-800",
                        portalSubtextAlt
                      )}
                    >
                      <Eye size={13} />
                      {p.viewBtn}
                    </Link>
                    <Link
                      href={`/jobseeker/practice/${session.questionSetId}`}
                      className="flex-1 shimmer-button flex items-center justify-center gap-1.5 h-8.5 text-[12px] font-semibold text-white hr-cta-btn rounded-lg"
                    >
                      <RefreshCw size={12} />
                      {p.retryBtn}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {!loading && (
        <>
          <PaginationBar page={page} totalPages={totalPages} onPage={setPage} />
          {totalCount > 0 && (
            <p className={cn("text-right text-[11px] mt-2", portalSubtextAlt)}>
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} / {totalCount} phiên
            </p>
          )}
        </>
      )}
    </div>
  );
}
