"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { InviteCandidateModal } from "@/features/hr/components/recommendations/invite-candidate-modal";
import {
  invitePractitioner,
  listHrTalent,
  type HrTalentItem,
} from "@/features/hr/services/hr-talent.service";

const PAGE_SIZE = 10;

const STATUS_TABS: Array<{ key: "all" | "completed" | "inProgress" | "abandoned"; value: string }> = [
  { key: "all", value: "" },
  { key: "completed", value: "COMPLETED" },
  { key: "inProgress", value: "IN_PROGRESS" },
  { key: "abandoned", value: "ABANDONED" },
];

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-200";

const thCls =
  "h-10 px-3 align-middle text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400";

const tdCls = "h-12 px-3 align-middle";

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function scoreTextClass(score: number | null): string {
  if (score == null) return "text-gray-400 dark:text-gray-500";
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function StatusBadge({
  status,
  labels,
}: {
  status: string;
  labels: { inProgress: string; completed: string; abandoned: string };
}) {
  const u = status.toUpperCase();
  const styles =
    u === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
      : u === "ABANDONED"
        ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
        : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
  const text =
    u === "COMPLETED" ? labels.completed : u === "ABANDONED" ? labels.abandoned : labels.inProgress;
  return (
    <span className={cn("inline-flex max-w-full items-center truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", styles)}>
      {text}
    </span>
  );
}

export function HrTalentPage() {
  const { t, lang } = useLanguage();
  const p = t.hrTalentPage;
  const title = t.sidebar.nav["/hr/talent"] ?? p.heading;

  const [items, setItems] = useState<HrTalentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [keywordApplied, setKeywordApplied] = useState("");
  const [status, setStatus] = useState("");
  const [minScore, setMinScore] = useState("");
  const [minScoreApplied, setMinScoreApplied] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<HrTalentItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const min = minScoreApplied.trim() ? Number(minScoreApplied) : null;
      const res = await listHrTalent({
        page,
        pageSize: PAGE_SIZE,
        keyword: keywordApplied || undefined,
        status: status || undefined,
        minScore: min != null && !Number.isNaN(min) ? min : null,
      });
      setItems(res.items);
      setTotal(res.totalCount);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, keywordApplied, status, minScoreApplied]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const contentKey = `${status}-${keywordApplied}-${minScoreApplied}-${safePage}`;

  function applySearch() {
    setPage(1);
    setKeywordApplied(keyword.trim());
    setMinScoreApplied(minScore.trim());
  }

  function clearFilters() {
    setKeyword("");
    setKeywordApplied("");
    setMinScore("");
    setMinScoreApplied("");
    setStatus("");
    setPage(1);
  }

  const hasFilters = Boolean(keywordApplied || minScoreApplied || status);

  return (
    <AppShell
      pageTitle={title}
      fullWidth
      breadcrumb={[
        { label: t.appShell.breadcrumb.hr, href: "/hr/dashboard" },
        { label: title },
      ]}
    >
      <div>
        <div
          className="mb-4 flex items-start justify-between gap-3"
          style={{ animation: "slideUpFade 0.38s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
        >
          <div>
            <h2 className={cn("text-xl font-bold", portalHeading)}>{p.heading}</h2>
            <p className={cn("mt-0.5 text-[13px]", portalSubtext)}>{p.subtext}</p>
            <p className={cn("mt-1 max-w-3xl text-[12px]", portalSubtext)}>{p.candidatesNote}</p>
          </div>
        </div>

        <div className="space-y-3" style={{ overflowY: "hidden" }}>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              applySearch();
            }}
          >
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={p.searchPlaceholder}
              style={{ animation: "slideUpFade 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
              className="w-full sm:w-72 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-primary/40 dark:border-gray-700 dark:bg-gray-900"
            />

            <select
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value); }}
              style={{ animation: "slideUpFade 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both 0.05s" }}
              className={cn(
                "cursor-pointer rounded-lg border px-2.5 py-1.5 text-[12px] font-medium outline-none transition-colors",
                "bg-white dark:bg-gray-900",
                status
                  ? "border-primary/50 text-primary dark:border-primary/40 dark:text-primary"
                  : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300",
                "focus:border-primary/60"
              )}
            >
              {STATUS_TABS.map((tab) => (
                <option key={tab.key} value={tab.value}>
                  {tab.key === "all" ? p.allStatuses : p.statusLabels[tab.key]}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              placeholder={p.minScore}
              style={{ animation: "slideUpFade 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both 0.1s" }}
              className="w-28 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] font-medium outline-none focus:border-primary/40 dark:border-gray-700 dark:bg-gray-900"
            />

            <button
              type="submit"
              className="h-[30px] rounded-lg bg-primary px-3 text-[12px] font-semibold text-white"
            >
              {p.searchBtn}
            </button>

            <button
              type="button"
              onClick={() => void fetchData()}
              disabled={loading}
              className={iconBtn}
              aria-label={p.retryBtn}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] text-gray-500 transition-colors hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-800 dark:hover:text-red-400"
              >
                {lang === "vi" ? "Xóa lọc" : "Clear"}
              </button>
            )}
          </form>

          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{p.loadFailed}</p>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-700">
              <Inbox className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className={cn("text-sm font-medium", portalHeading)}>{p.emptyTitle}</p>
              <p className={cn("mt-1 text-[12px]", portalSubtext)}>{p.emptySubtext}</p>
            </div>
          ) : (
            <div
              key={contentKey}
              style={{ animation: "fadeIn 0.2s ease-out both" }}
              className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40"
            >
              <table className="w-full min-w-[880px] table-fixed text-[13px]">
                <colgroup>
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "12%" }} />
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
                  {items.map((item, rowIdx) => {
                    const completed = item.sessionStatus.toUpperCase() === "COMPLETED";
                    const invited = (item.recommendationStatus ?? "").toUpperCase() === "INVITED" || Boolean(item.invitationStatus);
                    const initials = getInitials(item.candidateName || item.candidateEmail);
                    const score = item.overallScore != null ? Math.round(item.overallScore) : null;
                    const when = item.completedAt || item.startedAt;
                    return (
                      <tr
                        key={item.sessionId}
                        className="hover:bg-gray-50/70 dark:hover:bg-gray-900/40"
                        style={{ animation: `fadeIn 0.28s ease-out both ${rowIdx * 0.04}s` }}
                      >
                        <td className={cn(tdCls, "overflow-hidden")}>
                          <Link href={`/hr/candidates/${item.candidateUserId}`} className="flex min-w-0 items-center gap-2.5 group">
                            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white", avatarColor(item.candidateName || item.sessionId))}>
                              {initials || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className={cn("truncate font-medium group-hover:text-primary", portalHeading)} title={item.candidateName}>
                                {item.candidateName || "—"}
                              </p>
                              <p className={cn("truncate text-[11px]", portalSubtext)} title={item.candidateEmail}>
                                {item.candidateEmail}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className={cn(tdCls, "overflow-hidden")}>
                          <span className={cn("block truncate", portalSubtext)} title={item.questionSetTitle}>
                            {item.questionSetTitle || "—"}
                          </span>
                        </td>
                        <td className={cn(tdCls, "text-center tabular-nums font-semibold", scoreTextClass(score))}>
                          {score ?? "—"}
                        </td>
                        <td className={cn(tdCls, "overflow-hidden")}>
                          <div className="flex items-center gap-1 overflow-hidden">
                            <StatusBadge status={item.sessionStatus} labels={p.statusLabels} />
                            {invited && (
                              <span className="inline-flex shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                {p.invitedBadge}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={cn(tdCls, "overflow-hidden whitespace-nowrap", portalSubtext)}>
                          {when ? formatRelativeTime(when, lang) : "—"}
                        </td>
                        <td className={tdCls}>
                          <div className="flex flex-nowrap items-center justify-center gap-0.5">
                            <Link
                              href={`/hr/candidates/${item.candidateUserId}`}
                              className={iconBtn}
                              title={p.overviewBtn}
                            >
                              <ExternalLink size={14} />
                            </Link>
                            {completed ? (
                              <Link
                                href={`/hr/candidates/${item.candidateUserId}/sessions/${item.sessionId}`}
                                className={iconBtn}
                                title={p.viewAnswersBtn}
                              >
                                <FileText size={14} />
                              </Link>
                            ) : (
                              <span aria-hidden className="inline-flex h-7 w-7 shrink-0" />
                            )}
                            {completed && !invited ? (
                              <button
                                type="button"
                                onClick={() => setInviteTarget(item)}
                                className={cn(iconBtn, "hover:text-emerald-600")}
                                title={p.inviteBtn}
                              >
                                <Mail size={14} />
                              </button>
                            ) : (
                              <span aria-hidden className="inline-flex h-7 w-7 shrink-0" />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length < PAGE_SIZE &&
                    Array.from({ length: PAGE_SIZE - items.length }).map((_, i) => (
                      <tr key={`ph-${i}`} aria-hidden>
                        <td className={tdCls} colSpan={6} />
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-1 py-1">
              <p className={cn("text-xs", portalSubtext)}>
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, total)} / {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((x) => Math.max(1, x - 1))}
                  disabled={safePage === 1}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                  const isFirst = n === 1;
                  const isLast = n === totalPages;
                  const nearCurrent = Math.abs(n - safePage) <= 1;
                  if (!isFirst && !isLast && !nearCurrent) {
                    if (n === 2 || n === totalPages - 1) {
                      return <span key={n} className={cn("text-xs px-0.5", portalSubtext)}>…</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={cn(
                        "inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                        n === safePage
                          ? "bg-primary text-white shadow-sm"
                          : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPage((x) => Math.min(totalPages, x + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {inviteTarget && (
        <InviteCandidateModal
          target={{
            candidateName: inviteTarget.candidateName,
            candidateEmail: inviteTarget.candidateEmail,
            questionSetTitle: inviteTarget.questionSetTitle,
            score: inviteTarget.overallScore,
          }}
          onClose={() => setInviteTarget(null)}
          onSend={async (message) => {
            await invitePractitioner(inviteTarget.questionSetId, inviteTarget.candidateUserId, message);
            await fetchData();
          }}
        />
      )}
    </AppShell>
  );
}
