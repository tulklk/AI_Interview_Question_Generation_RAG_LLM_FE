"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, RefreshCw, Eye, BarChart2, Clock, Trophy, BookOpen, ChevronDown, AlertCircle, History as HistoryIcon, Loader2, Activity } from "lucide-react";
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
  portalCard,
  portalHeadingAlt,
  portalInput,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

const PAGE_SIZE = 20;

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
    <Pill className={cn("text-[13px] font-[700] px-2.5 py-1 w-fit", getScoreBadgeClass(score))}>
      {score}%
    </Pill>
  );
}

export function HistoryBoard() {
  const { t } = useLanguage();
  const p = t.jobseekerHistoryPage;
  const { addToast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilterKey>("all");

  const [sessions, setSessions] = useState<CompletedSessionSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Debounce keyword: 350 ms after last keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 350);
  }

  // Fetch stats once (global, not affected by keyword / time filter)
  useEffect(() => {
    getPracticeStats()
      .then(setStats)
      .catch(() => {});
  }, [reloadKey]);

  // Fetch sessions when filter, keyword, or reload key changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const { fromDate } = dateRangeFor(timeFilter);
    listCompletedSessions({
      page: 1,
      pageSize: PAGE_SIZE,
      fromDate,
      keyword: debouncedSearch || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setSessions(res.items);
        setTotalCount(res.totalCount);
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
  }, [reloadKey, timeFilter, debouncedSearch]);

  function loadMore() {
    const nextPage = page + 1;
    setLoadingMore(true);
    const { fromDate } = dateRangeFor(timeFilter);
    listCompletedSessions({
      page: nextPage,
      pageSize: PAGE_SIZE,
      fromDate,
      keyword: debouncedSearch || undefined,
    })
      .then((res) => {
        setSessions((prev) => [...prev, ...res.items]);
        setTotalCount(res.totalCount);
        setPage(nextPage);
      })
      .catch(() => addToast("error", p.loadFailed))
      .finally(() => setLoadingMore(false));
  }

  const filtered = sessions;

  const iconBg = "bg-gray-100 dark:bg-gray-800 shadow-sm ring-1 ring-black/5 dark:ring-white/10";
  const iconColor = "text-gray-900 dark:text-gray-100";
  const statCards = [
    { icon: BookOpen, label: p.statLabels[0], value: (stats?.totalSessions ?? 0).toString(), bg: iconBg, color: iconColor },
    { icon: BarChart2, label: p.statLabels[1], value: stats?.averageScore != null ? `${stats.averageScore}%` : "—", bg: iconBg, color: iconColor },
    { icon: Trophy, label: p.statLabels[2], value: stats?.bestScore != null ? `${stats.bestScore}%` : "—", bg: iconBg, color: iconColor },
    { icon: Activity, label: p.statLabels[4], value: stats?.latestScore != null ? `${stats.latestScore}%` : "—", bg: iconBg, color: iconColor },
    { icon: Clock, label: p.statLabels[3], value: `${stats?.totalDurationMinutes ?? 0} min`, bg: iconBg, color: iconColor },
  ];

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
        <AiLoadingSpinner text={p.loading} />
      </div>
    );
  }

  if (error) {
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
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <StatCard icon={s.icon} iconBg={s.bg} iconColor={s.color} value={s.value} label={s.label} />
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
          "flex items-center gap-2 flex-1 rounded-lg px-3 h-[38px] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(108,71,255,0.1)] transition-all",
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
        <div className="relative shrink-0">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilterKey)}
            className={cn(
              "appearance-none w-full sm:w-auto rounded-lg pl-3 pr-8 h-[38px] text-[12px] outline-none cursor-pointer focus:border-primary transition-all",
              portalInput
            )}
          >
            {(
              [
                ["all", p.filters.allTime],
                ["week", p.filters.thisWeek],
                ["month", p.filters.thisMonth],
              ] as [TimeFilterKey, string][]
            ).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        </div>
      </motion.div>

      {/* Table — desktop (md+) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="hr-glass-card overflow-hidden hidden md:block"
      >
        {/* Header */}
        <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_200px] gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
          {[p.table.session, p.table.date, p.table.score, p.table.duration, p.table.actions].map((col) => (
            <span key={col} className={cn("text-[11px] font-[700] uppercase tracking-wide", portalSubtextAlt)}>{col}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={HistoryIcon} title={p.noHistory} className="py-12" />
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {filtered.map((session, i) => (
              <motion.li
                key={session.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                whileHover={{ scale: 1.01 }}
                className="hr-table-row grid grid-cols-[2.5fr_1fr_1fr_1fr_200px] gap-4 px-6 py-4 items-center"
              >
                {/* Session */}
                <div className="flex items-center gap-3 min-w-0">
                  {session.companyLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.companyLogoUrl} alt={session.company} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-700" />
                  ) : (
                    <div className={cn("w-8 h-8 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", getCompanyColor(session.company))}>
                      {getCompanyInitials(session.company)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={cn("text-[13px] font-[600] truncate", portalHeadingAlt)}>{session.setTitle}</p>
                    <p className={cn("text-[11px]", portalSubtextAlt)}>{session.company}</p>
                  </div>
                </div>

                {/* Date */}
                <p className={cn("text-[12px]", portalSubtextAlt)}>{formatSessionDate(session.completedAt)}</p>

                {/* Score */}
                <ScorePill score={session.score} pendingTooltip={p.pendingScoreTooltip} />

                {/* Duration */}
                <p className={cn("text-[12px]", portalSubtextAlt)}>{session.durationMinutes} min</p>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Link
                    href={`/jobseeker/practice/${session.id}/result`}
                    className={cn(
                      "flex items-center gap-1.5 h-[30px] px-3 text-[11px] font-[600] hover:text-primary hover:bg-[#F5F3FF] dark:hover:bg-purple-950/30 rounded-lg transition-colors",
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

      {/* Card list — mobile (below md) */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.length === 0 ? (
          <EmptyState icon={HistoryIcon} title={p.noHistory} className="py-12" />
        ) : (
          filtered.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className="hr-glass-card p-4 flex flex-col gap-3"
            >
              {/* Header row: company icon + title + score */}
              <div className="flex items-start gap-3">
                {session.companyLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.companyLogoUrl} alt={session.company} className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-700" />
                ) : (
                  <div className={cn("w-9 h-9 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", getCompanyColor(session.company))}>
                    {getCompanyInitials(session.company)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[13px] font-[600] truncate", portalHeadingAlt)}>{session.setTitle}</p>
                  <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{session.company}</p>
                </div>
                <ScorePill score={session.score} pendingTooltip={p.pendingScoreTooltip} />
              </div>

              {/* Meta: date · duration */}
              <div className={cn("flex items-center gap-3 text-[12px]", portalSubtextAlt)}>
                <span className="flex items-center gap-1">
                  <Clock size={11} className="shrink-0" />
                  {formatSessionDate(session.completedAt)}
                </span>
                <span>·</span>
                <span>{session.durationMinutes} min</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/jobseeker/practice/${session.id}/result`}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 h-[34px] text-[12px] font-[600] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors hover:text-primary hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-200 dark:hover:border-violet-800",
                    portalSubtextAlt
                  )}
                >
                  <Eye size={13} />
                  {p.viewBtn}
                </Link>
                <Link
                  href={`/jobseeker/practice/${session.questionSetId}`}
                  className="flex-1 shimmer-button flex items-center justify-center gap-1.5 h-[34px] text-[12px] font-semibold text-white hr-cta-btn rounded-lg"
                >
                  <RefreshCw size={12} />
                  {p.retryBtn}
                </Link>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Load more */}
      {sessions.length > 0 && sessions.length < totalCount && (
        <div className="flex justify-center mt-6">
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
