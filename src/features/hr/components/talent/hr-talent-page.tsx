"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  SearchX,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import {
  listHrTalent,
  type HrTalentItem,
} from "@/features/hr/services/hr-talent.service";

// ---------------------------------------------------------------------------
// Constants — same class tokens as question-set-history-table
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-200";

const thCls =
  "h-10 px-3 align-middle text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400";

const tdCls = "h-12 px-3 align-middle";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-rose-500",
];

function avatarColor(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function InvitedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400">
      {label}
    </span>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null)
    return <span className={cn("tabular-nums", portalSubtext)}>—</span>;
  const color =
    score >= 85
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return (
    <span className={cn("text-[14px] font-bold tabular-nums", color)}>
      {Math.round(score)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type StatusFilter = "" | "COMPLETED" | "IN_PROGRESS" | "ABANDONED";
type ScoreFilter = "" | "50" | "70" | "85";
type DateSort = "newest" | "oldest";

export function HrTalentPage() {
  const { t, lang } = useLanguage();
  const p = t.hrTalentPage;

  const [items, setItems] = useState<HrTalentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("");
  const [dateSort, setDateSort] = useState<DateSort>("newest");

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchData = useCallback(
    async (
      pg: number,
      kw: string,
      status: StatusFilter,
      minScore: number | null,
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

  const minScoreNum =
    scoreFilter ? Number(scoreFilter) : null;

  useEffect(() => {
    void fetchData(page, search, statusFilter, minScoreNum);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, page, search, statusFilter, scoreFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, scoreFilter, dateSort]);

  // Client-side date sort (server returns most-recent by default; we flip for oldest)
  const sorted =
    dateSort === "oldest"
      ? [...items].sort(
          (a, b) =>
            new Date(a.completedAt ?? a.startedAt ?? 0).getTime() -
            new Date(b.completedAt ?? b.startedAt ?? 0).getTime(),
        )
      : items;

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "" ||
    scoreFilter !== "" ||
    dateSort !== "newest";

  const filterDropdownCls = (active: boolean) =>
    cn(
      "cursor-pointer rounded-lg border px-2.5 py-1.5 text-[12px] font-medium outline-none transition-colors bg-white dark:bg-gray-900 focus:border-primary/60",
      active
        ? "border-primary/50 text-primary dark:border-primary/40 dark:text-primary"
        : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300",
    );

  function handlePageChange(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("");
    setScoreFilter("");
    setDateSort("newest");
  }

  return (
    <AppShell
      pageTitle={p.heading}
      breadcrumb={[{ label: "HR", href: "/hr/dashboard" }, { label: p.heading }]}
      fullWidth
    >
      <div>
        {/* ── Page header ── */}
        <div
          className="mb-4 flex items-start justify-between gap-3"
          style={{ animation: "slideUpFade 0.38s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
        >
          <div>
            <h2 className={cn("text-xl font-bold", portalHeading)}>
              {p.heading}
            </h2>
            <p
              className={cn("mt-0.5 text-[13px]", portalSubtext)}
              style={{ animation: "slideUpFade 0.38s cubic-bezier(0.25,0.46,0.45,0.94) both 0.06s" }}
            >
              {p.subtext}
            </p>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div
          className="mb-3 flex flex-wrap items-center gap-2"
          style={{ animation: "slideUpFade 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both 0.08s" }}
        >
          {/* Search */}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={p.searchPlaceholder}
            className="w-full sm:w-72 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-primary/40 dark:border-gray-700 dark:bg-gray-900"
          />

          {/* Trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={filterDropdownCls(statusFilter !== "")}
          >
            <option value="">Trạng thái: {p.allStatuses}</option>
            <option value="COMPLETED">{p.statusLabels.completed}</option>
            <option value="IN_PROGRESS">{p.statusLabels.inProgress}</option>
            <option value="ABANDONED">{p.statusLabels.abandoned}</option>
          </select>

          {/* Điểm */}
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value as ScoreFilter)}
            className={filterDropdownCls(scoreFilter !== "")}
          >
            <option value="">Điểm: Tất cả</option>
            <option value="50">≥ 50</option>
            <option value="70">≥ 70</option>
            <option value="85">≥ 85</option>
          </select>

          {/* Ngày */}
          <select
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value as DateSort)}
            className={filterDropdownCls(dateSort !== "newest")}
          >
            <option value="newest">Ngày: Mới nhất</option>
            <option value="oldest">Ngày: Cũ nhất</option>
          </select>

          {/* Clear */}
          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={{ animation: "scaleInFade 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] text-gray-500 transition-colors hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-800 dark:hover:text-red-400"
            >
              <X size={11} />
              Xóa lọc
            </button>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ animation: "fadeIn 0.42s ease-out both 0.12s" }}>
          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <AlertCircle size={26} className="text-red-500" />
              <p className={cn("text-[13px]", portalSubtext)}>{p.loadFailed}</p>
              <button
                type="button"
                onClick={() => void fetchData(page, search, statusFilter, minScoreNum)}
                className="text-[13px] font-semibold text-primary hover:underline"
              >
                {p.retryBtn}
              </button>
            </div>
          ) : items.length === 0 && !hasFilters ? (
            /* Completely empty — no data at all */
            <div
              className="rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-700"
              style={{ animation: "fadeIn 0.4s ease-out both 0.1s" }}
            >
              <Inbox className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className={cn("text-sm font-medium", portalHeading)}>{p.emptyTitle}</p>
              <p className={cn("mt-1 text-[12px]", portalSubtext)}>{p.emptySubtext}</p>
            </div>
          ) : sorted.length === 0 ? (
            /* Filters returned no results */
            <div
              className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700"
              style={{ animation: "fadeIn 0.3s ease-out both" }}
            >
              <SearchX className="mx-auto mb-2 h-7 w-7 text-gray-300" />
              <p className={cn("text-[13px]", portalSubtext)}>Không tìm thấy ứng viên phù hợp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40">
              <table className="w-full min-w-190 table-fixed text-[13px]">
                <colgroup>
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/90 dark:border-gray-800 dark:bg-gray-900/60">
                    <th scope="col" className={cn(thCls, "text-left")}>{p.candidate}</th>
                    <th scope="col" className={cn(thCls, "text-left")}>{p.questionSet}</th>
                    <th scope="col" className={cn(thCls, "text-center")}>{p.score}</th>
                    <th scope="col" className={cn(thCls, "text-left")}>{p.status}</th>
                    <th scope="col" className={cn(thCls, "text-left")}>{p.date}</th>
                    <th scope="col" className={cn(thCls, "text-center")}>{p.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
                  {sorted.map((item, rowIdx) => {
                    const seed = item.candidateName || item.candidateEmail;
                    const initials = getInitials(seed);
                    // Always link to the candidate overview page (not recommendation-detail),
                    // so the breadcrumb correctly reads "Kho ứng viên > ..."
                    const profileHref = `/hr/candidates/${item.candidateUserId}`;
                    const sessionHref = `/hr/candidates/${item.candidateUserId}/sessions/${item.sessionId}`;
                    const isInvited =
                      item.invitationStatus?.toUpperCase() === "INVITED";

                    return (
                      <tr
                        key={item.sessionId}
                        className="hover:bg-gray-50/70 dark:hover:bg-gray-900/40"
                        style={{
                          animation: `fadeIn 0.28s ease-out both ${rowIdx * 0.04}s`,
                        }}
                      >
                        {/* Ứng viên */}
                        <td className={cn(tdCls, "overflow-hidden")}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold",
                                avatarColor(seed),
                              )}
                            >
                              {initials || <User size={13} />}
                            </div>
                            <div className="min-w-0">
                              <p
                                className={cn("truncate font-medium leading-tight", portalHeading)}
                                title={item.candidateName || item.candidateEmail}
                              >
                                {item.candidateName || item.candidateEmail}
                              </p>
                              {item.candidateName && (
                                <p className={cn("truncate text-[11px] leading-tight mt-0.5", portalSubtext)}>
                                  {item.candidateEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Bộ câu hỏi */}
                        <td className={cn(tdCls, "overflow-hidden")}>
                          <span
                            className={cn("block truncate", portalSubtext)}
                            title={item.questionSetTitle}
                          >
                            {item.questionSetTitle || "—"}
                          </span>
                        </td>

                        {/* Điểm */}
                        <td className={cn(tdCls, "text-center")}>
                          <ScoreCell score={item.overallScore} />
                        </td>

                        {/* Trạng thái */}
                        <td className={cn(tdCls, "overflow-hidden")}>
                          <div className="flex flex-wrap gap-1">
                            <SessionStatusChip
                              status={item.sessionStatus}
                              labels={p.statusLabels}
                            />
                            {isInvited && (
                              <InvitedBadge label={p.invitedBadge} />
                            )}
                          </div>
                        </td>

                        {/* Ngày */}
                        <td className={cn(tdCls, "overflow-hidden whitespace-nowrap", portalSubtext)}>
                          {item.completedAt
                            ? formatRelativeTime(item.completedAt, lang)
                            : "—"}
                        </td>

                        {/* Thao tác */}
                        <td className={tdCls}>
                          <div className="flex flex-nowrap items-center justify-center gap-0.5">
                            <Link
                              href={sessionHref}
                              className={iconBtn}
                              title={p.viewAnswersBtn}
                            >
                              <ExternalLink size={14} />
                            </Link>
                            <Link
                              href={profileHref}
                              className={iconBtn}
                              title={p.overviewBtn}
                            >
                              <FileText size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && !error && totalPages > 1 && (
          <div
            className="flex items-center justify-between gap-4 px-1 py-3"
            style={{ animation: "fadeIn 0.35s ease-out both 0.15s" }}
          >
            <p className={cn("text-xs", portalSubtext)}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} / {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                const isFirst = pg === 1;
                const isLast = pg === totalPages;
                const nearCurrent = Math.abs(pg - page) <= 1;
                if (!isFirst && !isLast && !nearCurrent) {
                  if (pg === 2 || pg === totalPages - 1) {
                    return (
                      <span key={pg} className={cn("text-xs px-0.5", portalSubtext)}>
                        …
                      </span>
                    );
                  }
                  return null;
                }
                return (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => handlePageChange(pg)}
                    className={cn(
                      "inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                      pg === page
                        ? "bg-primary text-white shadow-sm"
                        : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                    )}
                  >
                    {pg}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
