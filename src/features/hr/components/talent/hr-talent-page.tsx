"use client";

/**
 * SCRUM-476: Kho ứng viên — layout khớp recommendations-list
 * (header sạch + hr-glass-card filter + list row, không bảng dày).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  User,
  Users,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import {
  portalHeading,
  portalSubtext,
  portalHeadingAlt,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import {
  listHrTalent,
  type HrTalentItem,
} from "@/features/hr/services/hr-talent.service";
import { listHistoryQuestionSets } from "@/features/hr/services/hr-history.service";
import type { HistoryQuestionSetItem } from "@/features/hr/types/history-question-set";
import { HrTalentListSkeleton } from "./hr-talent-list-skeleton";
import {
  getScoreBandLabel,
  getScoreBandRingClass,
  scoreBandBadgeClassName,
} from "@/features/hr/utils/score-band";
import type { ScoreLevelLabels } from "@/features/candidate/components/ui/pill";

const PAGE_SIZE = 20;

type StatusFilter = "" | "COMPLETED" | "IN_PROGRESS" | "ABANDONED";
type ScoreFilter = "" | "70" | "80" | "90";
type DateSort = "newest" | "oldest";

const STATUS_TABS: { key: StatusFilter; labelKey: "allStatuses" | "completed" | "inProgress" | "abandoned" }[] = [
  { key: "", labelKey: "allStatuses" },
  { key: "COMPLETED", labelKey: "completed" },
  { key: "IN_PROGRESS", labelKey: "inProgress" },
  { key: "ABANDONED", labelKey: "abandoned" },
];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

const AVATAR_COLORS = [
  "bg-amber-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-sky-500",
];

function avatarColor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function buildAttemptMap(rows: HrTalentItem[]): Map<string, number> {
  const groups = new Map<string, HrTalentItem[]>();
  for (const row of rows) {
    const key = `${row.candidateUserId}::${row.questionSetId}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  const map = new Map<string, number>();
  for (const list of groups.values()) {
    const ordered = [...list].sort((a, b) => {
      const tA = new Date(a.completedAt ?? a.startedAt ?? 0).getTime();
      const tB = new Date(b.completedAt ?? b.startedAt ?? 0).getTime();
      return tA - tB;
    });
    ordered.forEach((row, i) => map.set(row.sessionId, i + 1));
  }
  return map;
}

function ScoreBadge({ score, pendingTitle, labels }: { score: number | null; pendingTitle: string; labels: ScoreLevelLabels }) {
  if (score === null) {
    return (
      <div
        className="h-10 min-w-14 px-2 rounded-full ring-2 ring-gray-200 dark:ring-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center shrink-0"
        title={pendingTitle}
      >
        <span className="text-[13px] font-bold text-gray-400 leading-none">—</span>
      </div>
    );
  }
  const { text } = getScoreBandRingClass(score);
  const label = getScoreBandLabel(score, labels);
  const compact = label.length > 6;
  return (
    <div className={scoreBandBadgeClassName(score)} title={label}>
      <span
        className={cn(
          "font-bold leading-tight text-center tracking-tight",
          compact ? "text-[9px]" : "text-[10px]",
          text,
        )}
      >
        {label}
      </span>
    </div>
  );
}

function SessionStatusChip({
  status,
  labels,
}: {
  status: string;
  labels: { inProgress: string; completed: string; abandoned: string };
}) {
  const s = status.toUpperCase();
  const cls =
    s === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
      : s === "IN_PROGRESS"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  const label =
    s === "COMPLETED"
      ? labels.completed
      : s === "IN_PROGRESS"
        ? labels.inProgress
        : labels.abandoned;
  return (
    <span className={cn("inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap", cls)}>
      {label}
    </span>
  );
}

function ModeChip({
  isHiringAssessment,
  labels,
}: {
  isHiringAssessment: boolean;
  labels: { practice: string; hiring: string };
}) {
  return (
    <span
      className={cn(
        "inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap",
        isHiringAssessment
          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      )}
      title={isHiringAssessment ? labels.hiring : labels.practice}
    >
      {isHiringAssessment ? labels.hiring : labels.practice}
    </span>
  );
}

function TalentRow({
  item,
  attemptNo,
  index,
  lang,
  labels,
  scoreLabels,
}: {
  item: HrTalentItem;
  attemptNo: number;
  index: number;
  lang: "en" | "vi";
  labels: ReturnType<typeof useLanguage>["t"]["hrTalentPage"];
  scoreLabels: ScoreLevelLabels;
}) {
  const seed = item.candidateName || item.candidateEmail;
  const initials = getInitials(seed);
  const profileHref = `/hr/candidates/${item.candidateUserId}`;
  const sessionHref = `/hr/candidates/${item.candidateUserId}/sessions/${item.sessionId}`;
  const isInvited = item.invitationStatus?.toUpperCase() === "INVITED";
  const score = item.overallScore;
  const accentBar =
    score == null
      ? "bg-gray-300"
      : (() => {
          const { ring } = getScoreBandRingClass(score);
          if (ring.includes("emerald")) return "bg-emerald-400";
          if (ring.includes("violet")) return "bg-violet-400";
          if (ring.includes("amber")) return "bg-amber-400";
          return "bg-red-400";
        })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03 }}
      className={cn(
        "group relative flex flex-col sm:flex-row sm:items-center gap-4 pl-5 pr-4 sm:pr-5 py-4",
        "border-b border-gray-100 dark:border-gray-800 last:border-b-0",
        "hover:bg-gray-50/70 dark:hover:bg-gray-800/30 transition-colors duration-150",
      )}
    >
      <div
        className={cn(
          "absolute left-0 top-3 bottom-3 w-0.75 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
          accentBar,
        )}
      />

      <div
        className={cn(
          "w-11 h-11 rounded-xl text-white text-[13px] font-bold flex items-center justify-center shrink-0 shadow-sm",
          avatarColor(seed),
        )}
      >
        {initials || <User size={14} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn("text-sm font-bold leading-tight", portalHeadingAlt)}>
            {item.candidateName || item.candidateEmail || "—"}
          </p>
          <SessionStatusChip status={item.sessionStatus} labels={labels.statusLabels} />
          <ModeChip
            isHiringAssessment={item.isHiringAssessment}
            labels={{ practice: labels.modePractice, hiring: labels.modeHiring }}
          />
          {isInvited && (
            <span className="inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
              {labels.invitedBadge}
            </span>
          )}
          <span className={cn("text-[11px] font-medium tabular-nums", portalSubtextAlt)}>
            {labels.attempt} #{attemptNo}
          </span>
        </div>

        {item.candidateName && (
          <p className={cn("text-[11px] truncate mt-0.5", portalSubtextAlt)}>{item.candidateEmail}</p>
        )}

        <p className={cn("text-[11px] truncate mt-0.5", portalSubtextAlt)}>
          <span className="font-medium text-gray-600 dark:text-gray-300">
            {item.questionSetTitle || "—"}
          </span>
          {item.completedAt ? (
            <span className="text-gray-400 dark:text-gray-500">
              {" · "}
              {formatRelativeTime(item.completedAt, lang)}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500" title={labels.dateIncompleteTitle}>
              {" · —"}
            </span>
          )}
          {(item.targetRole || item.seniorityLevel) && (
            <span className="text-primary font-semibold">
              {" · "}
              {[item.targetRole, item.seniorityLevel].filter(Boolean).join(" · ")}
            </span>
          )}
        </p>
      </div>

      <ScoreBadge
        score={item.overallScore}
        pendingTitle={labels.scorePendingTitle}
        labels={scoreLabels}
      />

      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href={sessionHref}
          className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[11px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary bg-white dark:bg-gray-900 transition-colors"
          title={labels.viewAnswersBtn}
        >
          <ExternalLink size={12} />
          <span className="hidden sm:inline">{labels.viewAnswersBtn}</span>
        </Link>
        <Link
          href={profileHref}
          className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[11px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary bg-white dark:bg-gray-900 transition-colors"
          title={labels.overviewBtn}
        >
          <FileText size={12} />
          <span className="hidden sm:inline">{labels.overviewBtn}</span>
        </Link>
      </div>
    </motion.div>
  );
}

export function HrTalentPage() {
  const { t, lang } = useLanguage();
  const p = t.hrTalentPage;

  const [items, setItems] = useState<HrTalentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [questionSets, setQuestionSets] = useState<HistoryQuestionSetItem[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("COMPLETED");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("");
  const [dateSort, setDateSort] = useState<DateSort>("newest");
  const [questionSetId, setQuestionSetId] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const minScoreNum = scoreFilter ? Number(scoreFilter) : null;

  const fetchData = useCallback(
    async (
      pg: number,
      kw: string,
      status: StatusFilter,
      minScore: number | null,
      qsId: string,
    ) => {
      setLoading(true);
      setError(false);
      try {
        const result = await listHrTalent({
          page: pg,
          pageSize: PAGE_SIZE,
          keyword: kw.trim() || undefined,
          status: status || undefined,
          minScore,
          questionSetId: qsId || undefined,
        });
        setItems(result.items);
        setTotalCount(result.totalCount);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void listHistoryQuestionSets()
      .then(setQuestionSets)
      .catch(() => setQuestionSets([]));
  }, []);

  useEffect(() => {
    void fetchData(page, search, statusFilter, minScoreNum, questionSetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, page, search, statusFilter, scoreFilter, questionSetId]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, scoreFilter, dateSort, questionSetId]);

  const sorted =
    dateSort === "oldest"
      ? [...items].sort(
          (a, b) =>
            new Date(a.completedAt ?? a.startedAt ?? 0).getTime() -
            new Date(b.completedAt ?? b.startedAt ?? 0).getTime(),
        )
      : items;

  const attemptMap = useMemo(() => buildAttemptMap(items), [items]);

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "" ||
    scoreFilter !== "" ||
    dateSort !== "newest" ||
    questionSetId !== "";

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("");
    setScoreFilter("");
    setDateSort("newest");
    setQuestionSetId("");
  }

  function statusTabLabel(key: (typeof STATUS_TABS)[number]["labelKey"]): string {
    if (key === "allStatuses") return p.allStatuses;
    return p.statusLabels[key];
  }

  return (
    <AppShell
      pageTitle={p.heading}
      breadcrumb={[{ label: "HR", href: "/hr/dashboard" }, { label: p.heading }]}
      fullWidth
    >
      <div>
        {/* Header — giống recommendations-list */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          className="mb-6"
        >
          <h2 className={cn("text-[17px] font-bold leading-tight tracking-tight", portalHeadingAlt)}>
            {p.heading}
          </h2>
          <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{p.subtext}</p>
          <p className={cn("text-[11px] mt-1.5 max-w-2xl", portalSubtext)}>{p.candidatesNote}</p>
        </motion.div>

        {/* Filter bar */}
        <div className="hr-glass-card px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
          <SlidersHorizontal size={14} className="text-gray-400 shrink-0" />

          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key || "all"}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={cn(
                    "whitespace-nowrap px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all",
                    active
                      ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100 font-semibold"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                  )}
                >
                  {statusTabLabel(tab.labelKey)}
                </button>
              );
            })}
          </div>

          <select
            value={questionSetId}
            onChange={(e) => setQuestionSetId(e.target.value)}
            className="h-8 max-w-48 px-3 text-[12px] font-medium bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20 transition-colors cursor-pointer"
          >
            <option value="">
              {p.questionSetFilter}: {p.allQuestionSets}
            </option>
            {questionSets.map((qs) => (
              <option key={qs.questionSetId} value={qs.questionSetId}>
                {qs.title}
              </option>
            ))}
          </select>

          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as ScoreFilter)}
            className="h-8 px-3 text-[12px] font-medium bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20 transition-colors cursor-pointer"
          >
            <option value="">{t.historyPage.filters.scoreAll}</option>
            <option value="70">{t.historyPage.filters.scoreFairPlus}</option>
            <option value="80">{t.historyPage.filters.scoreGoodPlus}</option>
            <option value="90">{t.historyPage.filters.scoreExcellentPlus}</option>
          </select>

          <select
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value as DateSort)}
            className="h-8 px-3 text-[12px] font-medium bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20 transition-colors cursor-pointer"
          >
            <option value="newest">{t.historyPage.filters.dateNewest}</option>
            <option value="oldest">{t.historyPage.filters.dateOldest}</option>
          </select>

          <div className="relative flex-1 min-w-40 max-w-xs ml-auto">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={p.searchPlaceholder}
              className="w-full h-8 pl-7 pr-3 text-[12px] bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-8 px-2.5 inline-flex items-center gap-1 rounded-lg text-[11px] font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
            >
              <X size={12} />
              {t.historyPage.filters.clearFilters}
            </button>
          )}

          <button
            type="button"
            onClick={() => void fetchData(page, search, statusFilter, minScoreNum, questionSetId)}
            disabled={loading}
            className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors disabled:opacity-50"
            aria-label={p.retryBtn}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* List */}
        {loading ? (
          <HrTalentListSkeleton />
        ) : error ? (
          <div className="hr-glass-card flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle size={28} className="text-red-500" />
            <p className={cn("text-[14px]", portalSubtext)}>{p.loadFailed}</p>
            <button
              type="button"
              onClick={() => void fetchData(page, search, statusFilter, minScoreNum, questionSetId)}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
            >
              <RefreshCw size={13} /> {p.retryBtn}
            </button>
          </div>
        ) : items.length === 0 && !hasFilters ? (
          <div className="hr-glass-card flex flex-col items-center gap-3 py-16 text-center">
            <Users size={32} className="text-gray-300 dark:text-gray-600" />
            <p className={cn("text-sm font-semibold", portalHeading)}>{p.emptyTitle}</p>
            <p className={cn("text-[12px] max-w-sm", portalSubtext)}>{p.emptySubtext}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="hr-glass-card flex flex-col items-center gap-3 py-16 text-center">
            <Search size={28} className="text-gray-300 dark:text-gray-600" />
            <p className={cn("text-[14px]", portalSubtext)}>{t.historyPage.filters.noCandidateMatch}</p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              {t.historyPage.filters.clearFilters}
            </button>
          </div>
        ) : (
          <div className="hr-glass-card overflow-hidden">
            {sorted.map((item, i) => (
              <TalentRow
                key={item.sessionId}
                item={item}
                attemptNo={attemptMap.get(item.sessionId) ?? 1}
                index={i}
                lang={lang}
                labels={p}
                scoreLabels={t.jobseekerFeedbackPage.scoreLevels}
              />
            ))}
          </div>
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <p className={cn("text-[12px]", portalSubtextAlt)}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} / {totalCount}{" "}
              {p.peopleLabel}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((n) => Math.max(1, n - 1))}
                disabled={page === 1}
                className="h-8 px-3 flex items-center gap-1 text-[12px] font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary disabled:opacity-40 transition-colors bg-white dark:bg-gray-900"
              >
                <ChevronLeft size={13} /> {p.prevPage}
              </button>
              <button
                type="button"
                onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                disabled={page === totalPages}
                className="h-8 px-3 flex items-center gap-1 text-[12px] font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary disabled:opacity-40 transition-colors bg-white dark:bg-gray-900"
              >
                {p.nextPage} <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
