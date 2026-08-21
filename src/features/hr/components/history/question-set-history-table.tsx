"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Globe,
  GlobeOff,
  Inbox,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  SearchX,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import type {
  HistoryQuestionSetItem,
  HistoryPublishStatus,
  QuestionSetsFilterKey,
} from "@/features/hr/types/history-question-set";
import {
  deleteHistoryQuestionSet,
  exportHistoryQuestionSet,
  listHistoryQuestionSets,
} from "@/features/hr/services/hr-history.service";
import {
  publishQuestionSet,
  renameQuestionSetTitle,
  toggleHrBookmark,
  unpublishQuestionSet,
  withAbandonedToast,
} from "@/features/interview/services/interview.service";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { QuestionSetFeedbackPanel } from "./question-set-feedback-panel";

function formatDate(iso: string, lang: "en" | "vi"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PublishBadge({
  status,
  labels,
}: {
  status: HistoryPublishStatus;
  labels: { published: string; draft: string };
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        status === "PUBLISHED"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      )}
    >
      {status === "PUBLISHED" ? <Globe size={10} className="shrink-0" /> : <Pencil size={10} className="shrink-0" />}
      <span className="truncate">{status === "PUBLISHED" ? labels.published : labels.draft}</span>
    </span>
  );
}

const PAGE_SIZE = 10;

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-200";

const menuItemCls =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-800";

const thCls =
  "h-10 px-3 align-middle text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400";

const tdCls = "h-12 px-3 align-middle";

interface QuestionSetHistoryTableProps {
  filter?: QuestionSetsFilterKey;
}

export function QuestionSetHistoryTable({ filter = "all" }: QuestionSetHistoryTableProps) {
  const { t, lang } = useLanguage();
  const ht = t.historyPage.table;
  const filters = t.historyPage.filters;
  const dm = t.historyPage.deleteModal;
  const { addToast } = useToast();
  const router = useRouter();
  const { planId } = useHrSubscription();
  const isPremium = planId === "HR_PREMIUM";

  const [items, setItems] = useState<HistoryQuestionSetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryQuestionSetItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [page, setPage] = useState(1);
  const [feedbackTarget, setFeedbackTarget] = useState<{ id: string; title: string } | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"all" | "studio" | "legacy">("all");
  const [questionFilter, setQuestionFilter] = useState<"all" | "1-5" | "6-10" | "11-20" | "21+">("all");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const menuDropRef = useRef<HTMLDivElement | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listHistoryQuestionSets());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!openMenuId) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuDropRef.current?.contains(target)) return;
      if (menuBtnRef.current?.contains(target)) return;
      setOpenMenuId(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }
    function onScroll() {
      setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [openMenuId]);

  const openMenuItem = useMemo(
    () => (openMenuId ? items.find((i) => i.questionSetId === openMenuId) ?? null : null),
    [openMenuId, items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = items.filter((item) => {
      // Tab filter
      if (filter === "bookmarked") {
        if (!item.isBookmarked) return false;
      } else if (filter === "DRAFT" || filter === "PUBLISHED") {
        if (item.status !== filter) return false;
      }
      // Search
      if (q && !item.title.toLowerCase().includes(q)) return false;
      // Source filter
      if (sourceFilter === "studio" && !item.sourceProjectId) return false;
      if (sourceFilter === "legacy" && item.sourceProjectId) return false;
      // Question count filter
      const count = item.questionCount;
      if (questionFilter === "1-5"   && (count < 1  || count > 5))  return false;
      if (questionFilter === "6-10"  && (count < 6  || count > 10)) return false;
      if (questionFilter === "11-20" && (count < 11 || count > 20)) return false;
      if (questionFilter === "21+"   && count < 21)                  return false;
      return true;
    });
    // Sort by date
    return [...result].sort((a, b) => {
      const dA = new Date(a.publishedAt ?? a.savedAt).getTime();
      const dB = new Date(b.publishedAt ?? b.savedAt).getTime();
      return dateSort === "newest" ? dB - dA : dA - dB;
    });
  }, [items, search, filter, sourceFilter, questionFilter, dateSort]);

  // Reset to page 1 when any filter / search changes
  useEffect(() => { setPage(1); }, [filter, search, sourceFilter, questionFilter, dateSort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const publishedSummary = useMemo(() => {
    if (filter !== "PUBLISHED" || filtered.length === 0) return null;
    const q = filtered.reduce((sum, item) => sum + item.questionCount, 0);
    return t.historyPage.publishedSummary
      .replace("{{n}}", String(filtered.length))
      .replace("{{q}}", String(q));
  }, [filter, filtered, t.historyPage.publishedSummary]);

  // Key changes on every tab/page switch → re-mounts content div → CSS animation replays
  const contentKey = `${filter}-${safePage}`;

  function openStudio(projectId: string) {
    try {
      localStorage.setItem("studio_active_project_id", projectId);
    } catch {
      /* ignore */
    }
    router.push("/hr/generate-question");
  }

  async function handleBookmark(item: HistoryQuestionSetItem) {
    setBusyId(item.questionSetId);
    try {
      const next = await toggleHrBookmark(item.questionSetId);
      setItems((prev) =>
        prev.map((x) => (x.questionSetId === item.questionSetId ? { ...x, isBookmarked: next } : x))
      );
      addToast("success", next ? ht.bookmarkAdded : ht.bookmarkRemoved);
    } catch {
      addToast("error", ht.bookmarkFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function handlePublishToggle(item: HistoryQuestionSetItem) {
    setBusyId(item.questionSetId);
    try {
      if (item.status === "PUBLISHED") {
        const abandoned = await unpublishQuestionSet(item.questionSetId);
        setItems((prev) =>
          prev.map((x) =>
            x.questionSetId === item.questionSetId ? { ...x, status: "DRAFT", publishedAt: null } : x
          )
        );
        addToast("success", withAbandonedToast(t.historyPage.unpublishSuccess, abandoned));
      } else {
        await publishQuestionSet(item.questionSetId);
        setItems((prev) =>
          prev.map((x) =>
            x.questionSetId === item.questionSetId
              ? { ...x, status: "PUBLISHED", publishedAt: new Date().toISOString() }
              : x
          )
        );
        addToast("success", t.historyPage.publishSuccess);
      }
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : t.historyPage.actionFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function handleExport(item: HistoryQuestionSetItem) {
    setBusyId(item.questionSetId);
    try {
      await exportHistoryQuestionSet(item.questionSetId, item.title);
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : ht.exportDisabledTitle);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.status === "PUBLISHED") {
      setDeleteTarget(null);
      addToast("error", ht.deletePublishedTitle);
      return;
    }
    const id = deleteTarget.questionSetId;
    setDeleteTarget(null);
    setBusyId(id);
    try {
      await deleteHistoryQuestionSet(id);
      setItems((prev) => prev.filter((x) => x.questionSetId !== id));
      addToast("success", ht.deleteSuccess);
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : ht.deleteFailed);
    } finally {
      setBusyId(null);
    }
  }

  function startEditTitle(item: HistoryQuestionSetItem) {
    setEditingId(item.questionSetId);
    setEditTitle(item.title);
  }

  function cancelEditTitle() {
    setEditingId(null);
    setEditTitle("");
    setSavingTitle(false);
  }

  async function saveEditTitle(item: HistoryQuestionSetItem) {
    const next = editTitle.trim();
    if (!next || next === item.title) {
      cancelEditTitle();
      return;
    }
    setSavingTitle(true);
    try {
      // PUT /api/hr/question-sets/{id}/title — BE SaveChanges, UI chỉ cập nhật sau khi OK
      const savedTitle = await renameQuestionSetTitle(item.questionSetId, next);
      setItems((prev) =>
        prev.map((x) =>
          x.questionSetId === item.questionSetId ? { ...x, title: savedTitle } : x
        )
      );
      addToast("success", t.reviewPage.renameSuccess);
      cancelEditTitle();
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : t.reviewPage.renameFailed);
      setSavingTitle(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-14">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-3" style={{ overflowY: "hidden" }}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={filters.searchPlaceholder}
          style={{ animation: "slideUpFade 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
          className="w-full sm:w-72 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-primary/40 dark:border-gray-700 dark:bg-gray-900"
        />

        {/* Nguồn */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
          style={{ animation: "slideUpFade 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both 0.05s" }}
          className={cn(
            "cursor-pointer rounded-lg border px-2.5 py-1.5 text-[12px] font-medium outline-none transition-colors",
            "bg-white dark:bg-gray-900",
            sourceFilter !== "all"
              ? "border-primary/50 text-primary dark:border-primary/40 dark:text-primary"
              : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300",
            "focus:border-primary/60"
          )}
        >
          <option value="all">Nguồn: Tất cả</option>
          <option value="studio">Studio</option>
          <option value="legacy">Legacy</option>
        </select>

        {/* Số câu hỏi */}
        <select
          value={questionFilter}
          onChange={(e) => setQuestionFilter(e.target.value as typeof questionFilter)}
          style={{ animation: "slideUpFade 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both 0.1s" }}
          className={cn(
            "cursor-pointer rounded-lg border px-2.5 py-1.5 text-[12px] font-medium outline-none transition-colors",
            "bg-white dark:bg-gray-900",
            questionFilter !== "all"
              ? "border-primary/50 text-primary dark:border-primary/40 dark:text-primary"
              : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300",
            "focus:border-primary/60"
          )}
        >
          <option value="all">Số câu: Tất cả</option>
          <option value="1-5">1–5 câu</option>
          <option value="6-10">6–10 câu</option>
          <option value="11-20">11–20 câu</option>
          <option value="21+">21+ câu</option>
        </select>

        {/* Ngày */}
        <select
          value={dateSort}
          onChange={(e) => setDateSort(e.target.value as typeof dateSort)}
          style={{ animation: "slideUpFade 0.32s cubic-bezier(0.25,0.46,0.45,0.94) both 0.15s" }}
          className={cn(
            "cursor-pointer rounded-lg border px-2.5 py-1.5 text-[12px] font-medium outline-none transition-colors",
            "bg-white dark:bg-gray-900",
            dateSort !== "newest"
              ? "border-primary/50 text-primary dark:border-primary/40 dark:text-primary"
              : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300",
            "focus:border-primary/60"
          )}
        >
          <option value="newest">Ngày: Mới nhất</option>
          <option value="oldest">Ngày: Cũ nhất</option>
        </select>

        {/* Xóa lọc — chỉ hiện khi có filter đang active */}
        {(sourceFilter !== "all" || questionFilter !== "all" || dateSort !== "newest" || search.trim()) && (
          <button
            type="button"
            onClick={() => {
              setSourceFilter("all");
              setQuestionFilter("all");
              setDateSort("newest");
              setSearch("");
            }}
            style={{ animation: "scaleInFade 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[12px] text-gray-500 transition-colors hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-800 dark:hover:text-red-400"
          >
            <X size={11} />
            Xóa lọc
          </button>
        )}
      </div>

      {publishedSummary && (
        <p className={cn("text-[12px] font-medium", portalSubtext)}>{publishedSummary}</p>
      )}

      {items.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-700"
          style={{ animation: "fadeIn 0.4s ease-out both 0.1s" }}
        >
          <Inbox className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className={cn("text-sm font-medium", portalHeading)}>{t.historyPage.emptyTitle}</p>
          <p className={cn("mt-1 text-[12px]", portalSubtext)}>{t.historyPage.emptyBody}</p>
          <Link href="/hr/generate-question" className="mt-3 inline-block text-[13px] font-semibold text-primary">
            {t.historyPage.openStudio}
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700"
          style={{ animation: "fadeIn 0.3s ease-out both" }}
        >
          <SearchX className="mx-auto mb-2 h-7 w-7 text-gray-300" />
          <p className={cn("text-[13px]", portalSubtext)}>{t.historyPage.noFilterResults}</p>
        </div>
      ) : (
        <div
          key={contentKey}
          style={{ animation: "fadeIn 0.2s ease-out both" }}
          className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40"
        >
          <table className="w-full min-w-[880px] table-fixed text-[13px]">
            <colgroup>
              <col style={{ width: "33%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "25%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/90 dark:border-gray-800 dark:bg-gray-900/60">
                <th scope="col" className={cn(thCls, "text-left")}>
                  {ht.jobTitle}
                </th>
                <th scope="col" className={cn(thCls, "text-left")}>
                  {ht.status}
                </th>
                <th scope="col" className={cn(thCls, "text-center")}>
                  {ht.questions}
                </th>
                <th scope="col" className={cn(thCls, "text-left")}>
                  {ht.date}
                </th>
                <th scope="col" className={cn(thCls, "text-left")}>
                  {ht.source}
                </th>
                <th scope="col" className={cn(thCls, "text-center")}>
                  {ht.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/70">
              {paginated.map((item, rowIdx) => {
                const busy = busyId === item.questionSetId;
                return (
                  <tr
                    key={item.questionSetId}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-900/40"
                    style={{ animation: `fadeIn 0.28s ease-out both ${rowIdx * 0.04}s` }}
                  >
                    <td className={cn(tdCls, "overflow-hidden")}>
                      {editingId === item.questionSetId ? (
                        <div className="flex min-w-0 items-center gap-1">
                          <input
                            autoFocus
                            value={editTitle}
                            disabled={savingTitle}
                            maxLength={500}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveEditTitle(item);
                              if (e.key === "Escape") cancelEditTitle();
                            }}
                            className="h-7 min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 text-[13px] font-medium outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-950"
                          />
                          <button
                            type="button"
                            disabled={savingTitle || !editTitle.trim()}
                            onClick={() => void saveEditTitle(item)}
                            className={cn(iconBtn, "text-primary hover:text-primary")}
                            title={t.reviewPage.questionActions.save}
                          >
                            {savingTitle ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button
                            type="button"
                            disabled={savingTitle}
                            onClick={cancelEditTitle}
                            className={iconBtn}
                            title={t.reviewPage.questionActions.cancel}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="group flex min-w-0 items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <span className={cn("min-w-0 flex-1 truncate font-medium", portalHeading)} title={item.title}>
                            {item.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditTitle(item)}
                            className={cn(
                              iconBtn,
                              "shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            )}
                            title={t.reviewPage.renameTitleBtn}
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className={cn(tdCls, "overflow-hidden")}>
                      <PublishBadge
                        status={item.status}
                        labels={{
                          published: t.historyPage.badgePublished,
                          draft: t.historyPage.badgeDraft,
                        }}
                      />
                    </td>
                    <td className={cn(tdCls, "text-center tabular-nums", portalSubtext)}>
                      {item.questionCount}
                    </td>
                    <td className={cn(tdCls, "overflow-hidden whitespace-nowrap", portalSubtext)}>
                      {formatDate(item.publishedAt || item.savedAt, lang === "vi" ? "vi" : "en")}
                    </td>
                    <td className={cn(tdCls, "overflow-hidden whitespace-nowrap")}>
                      {item.sourceProjectId ? (
                        <button
                          type="button"
                          onClick={() => openStudio(item.sourceProjectId!)}
                          className="text-[12px] font-semibold text-primary hover:underline"
                        >
                          Studio
                        </button>
                      ) : (
                        <span className={cn("text-[12px]", portalSubtext)}>Legacy</span>
                      )}
                    </td>
                    <td className={tdCls}>
                      <div className="relative flex flex-nowrap items-center justify-center gap-0.5">
                        <Link
                          href={`/hr/history/${item.questionSetId}`}
                          className={iconBtn}
                          title={ht.viewTitle}
                        >
                          <Eye size={14} />
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleBookmark(item)}
                          className={cn(iconBtn, item.isBookmarked && "text-amber-500 hover:text-amber-600")}
                          title={item.isBookmarked ? ht.bookmarkRemoveTitle : ht.bookmarkAddTitle}
                        >
                          <Bookmark size={14} fill={item.isBookmarked ? "currentColor" : "none"} />
                        </button>
                        <div className="relative">
                          <button
                            ref={openMenuId === item.questionSetId ? menuBtnRef : undefined}
                            type="button"
                            className={cn(
                              iconBtn,
                              openMenuId === item.questionSetId &&
                                "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                            )}
                            title={openMenuId === item.questionSetId ? undefined : t.historyPage.moreActionsTitle}
                            aria-label={t.historyPage.moreActionsTitle}
                            aria-expanded={openMenuId === item.questionSetId}
                            aria-haspopup="menu"
                            onClick={(e) => {
                              if (openMenuId === item.questionSetId) {
                                setOpenMenuId(null);
                                return;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPos({
                                top: rect.bottom + 4,
                                right: window.innerWidth - rect.right,
                              });
                              setOpenMenuId(item.questionSetId);
                            }}
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between gap-4 px-1 py-1"
          style={{ animation: "fadeIn 0.35s ease-out both 0.15s" }}
        >
          <p className={cn("text-xs", portalSubtext)}>
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              const isFirst = p === 1;
              const isLast = p === totalPages;
              const nearCurrent = Math.abs(p - safePage) <= 1;
              if (!isFirst && !isLast && !nearCurrent) {
                if (p === 2 || p === totalPages - 1) {
                  return <span key={p} className={cn("text-xs px-0.5", portalSubtext)}>…</span>;
                }
                return null;
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    "inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    p === safePage
                      ? "bg-primary text-white shadow-sm"
                      : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Overflow actions menu — portal escapes table overflow-x-auto */}
      {openMenuItem &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuDropRef}
            role="menu"
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            <Link
              href={`/hr/question-sets/${openMenuItem.questionSetId}/practitioners`}
              role="menuitem"
              className={menuItemCls}
              title={t.historyPage.practitionersTitle}
              onClick={() => setOpenMenuId(null)}
            >
              <Users size={14} className="shrink-0 opacity-70" />
              <span className="truncate">{t.historyPage.practitionersTitle}</span>
            </Link>
            <Link
              href={`/hr/history/${openMenuItem.questionSetId}?jdFit=1`}
              role="menuitem"
              className={menuItemCls}
              title={t.historyPage.jdFitTitle}
              onClick={() => setOpenMenuId(null)}
            >
              <Sparkles size={14} className="shrink-0 opacity-70" />
              <span className="truncate">{t.historyPage.jdFitTitle}</span>
            </Link>
            <button
              type="button"
              role="menuitem"
              className={menuItemCls}
              title={t.historyPage.feedbackTitle}
              onClick={() => {
                setFeedbackTarget({ id: openMenuItem.questionSetId, title: openMenuItem.title });
                setOpenMenuId(null);
              }}
            >
              <MessageSquare size={14} className="shrink-0 opacity-70" />
              <span className="truncate">{t.historyPage.feedbackTitle}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={busyId === openMenuItem.questionSetId}
              className={menuItemCls}
              title={
                openMenuItem.status === "PUBLISHED"
                  ? t.historyPage.unpublishTitle
                  : t.historyPage.publishTitle
              }
              onClick={() => {
                setOpenMenuId(null);
                void handlePublishToggle(openMenuItem);
              }}
            >
              {openMenuItem.status === "PUBLISHED" ? (
                <GlobeOff size={14} className="shrink-0 opacity-70" />
              ) : (
                <Globe size={14} className="shrink-0 opacity-70" />
              )}
              <span className="truncate">
                {openMenuItem.status === "PUBLISHED"
                  ? t.historyPage.unpublishTitle
                  : t.historyPage.publishTitle}
              </span>
            </button>
            {isPremium && (
              <button
                type="button"
                role="menuitem"
                disabled={busyId === openMenuItem.questionSetId}
                className={menuItemCls}
                title={ht.exportTitle}
                onClick={() => {
                  setOpenMenuId(null);
                  void handleExport(openMenuItem);
                }}
              >
                <Download size={14} className="shrink-0 opacity-70" />
                <span className="truncate">{ht.exportTitle}</span>
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              disabled={busyId === openMenuItem.questionSetId || openMenuItem.status === "PUBLISHED"}
              className={cn(
                menuItemCls,
                openMenuItem.status === "PUBLISHED"
                  ? "cursor-not-allowed opacity-40"
                  : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              )}
              title={
                openMenuItem.status === "PUBLISHED" ? ht.deletePublishedTitle : ht.deleteTitle
              }
              onClick={() => {
                if (openMenuItem.status === "PUBLISHED") return;
                setOpenMenuId(null);
                setDeleteTarget(openMenuItem);
              }}
            >
              <Trash2 size={14} className="shrink-0 opacity-70" />
              <span className="truncate">{ht.deleteTitle}</span>
            </button>
          </div>,
          document.body
        )}

      {/* Feedback slide-over panel */}
      <QuestionSetFeedbackPanel
        open={!!feedbackTarget}
        questionSetId={feedbackTarget?.id ?? null}
        questionSetTitle={feedbackTarget?.title}
        onClose={() => setFeedbackTarget(null)}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className={cn("text-sm font-semibold", portalHeading)}>{dm.title}</h3>
            <p className={cn("mt-1 text-[12px]", portalSubtext)}>{dm.subtitle}</p>
            <p className={cn("mt-2 text-[13px]", portalSubtext)}>{dm.body}</p>
            <p className={cn("mt-2 truncate rounded-lg bg-gray-50 px-3 py-2 text-[13px] font-semibold dark:bg-gray-800", portalHeading)}>
              {deleteTarget.title}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-medium dark:border-gray-700"
              >
                {dm.cancel}
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white"
              >
                {dm.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
