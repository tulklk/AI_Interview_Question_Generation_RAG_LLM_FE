"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Bookmark,
  Download,
  Eye,
  FileText,
  Globe,
  GlobeOff,
  Inbox,
  Loader2,
  Pencil,
  SearchX,
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
} from "@/features/interview/services/interview.service";

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

const iconBtn =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-200";

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

  const [items, setItems] = useState<HistoryQuestionSetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryQuestionSetItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "bookmarked") {
        if (!item.isBookmarked) return false;
      } else if (filter === "DRAFT" || filter === "PUBLISHED") {
        if (item.status !== filter) return false;
      }
      if (q && !item.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, filter]);

  function openStudio(projectId: string) {
    try {
      localStorage.setItem("studio_active_project_id", projectId);
    } catch {
      /* ignore */
    }
    router.push("/hr/generate-v2");
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
        await unpublishQuestionSet(item.questionSetId);
        setItems((prev) =>
          prev.map((x) =>
            x.questionSetId === item.questionSetId ? { ...x, status: "DRAFT", publishedAt: null } : x
          )
        );
        addToast("success", t.historyPage.unpublishSuccess);
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={filters.searchPlaceholder}
          className="min-w-[200px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] outline-none focus:border-primary/40 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-700">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className={cn("text-sm font-medium", portalHeading)}>{t.historyPage.emptyTitle}</p>
          <p className={cn("mt-1 text-[12px]", portalSubtext)}>{t.historyPage.emptyBody}</p>
          <Link href="/hr/generate-v2" className="mt-3 inline-block text-[13px] font-semibold text-primary">
            {t.historyPage.openStudio}
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
          <SearchX className="mx-auto mb-2 h-7 w-7 text-gray-300" />
          <p className={cn("text-[13px]", portalSubtext)}>{t.historyPage.noFilterResults}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40">
          <table className="w-full min-w-[880px] table-fixed text-[13px]">
            <colgroup>
              <col style={{ width: "36%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "18%" }} />
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
              {filtered.map((item) => {
                const busy = busyId === item.questionSetId;
                return (
                  <tr
                    key={item.questionSetId}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-900/40"
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
                      <div className="flex flex-nowrap items-center justify-center gap-0.5">
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
                        <Link
                          href={`/hr/question-sets/${item.questionSetId}/practitioners`}
                          className={iconBtn}
                          title={t.historyPage.practitionersTitle}
                        >
                          <Users size={14} />
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handlePublishToggle(item)}
                          className={iconBtn}
                          title={
                            item.status === "PUBLISHED"
                              ? t.historyPage.unpublishTitle
                              : t.historyPage.publishTitle
                          }
                        >
                          {item.status === "PUBLISHED" ? <GlobeOff size={14} /> : <Globe size={14} />}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleExport(item)}
                          className={iconBtn}
                          title={ht.exportTitle}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setDeleteTarget(item)}
                          className={cn(iconBtn, "hover:text-red-600")}
                          title={ht.deleteTitle}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
