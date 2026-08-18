"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  Check,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Star,
  Pencil,
  Save,
} from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useOverlayTransition } from "@/shared/hooks/use-overlay-transition";
import {
  getAdminFeedbacks,
  adminUpdateFeedbackStatus,
  adminDeleteFeedback,
  adminUpdateFeedback,
  type AdminFeedback,
  type FeedbackStatus,
} from "@/features/guest/services/feedback.service";
import { notifyAdminFeedbacksUpdated } from "@/features/admin/hooks/use-admin-pending-feedbacks";

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  Pending:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
  Approved:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
  Rejected:
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50",
};

function StatusBadge({
  status,
  label,
}: {
  status: FeedbackStatus;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold leading-none",
        STATUS_STYLES[status]
      )}
    >
      {label}
    </span>
  );
}

// ── Star rating display ───────────────────────────────────────────────────────

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={
            i < value
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
          }
        />
      ))}
    </span>
  );
}

// ── Edit feedback modal ───────────────────────────────────────────────────────

interface EditFeedbackModalProps {
  feedback: AdminFeedback | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditFeedbackModal({ feedback, onClose, onSaved }: EditFeedbackModalProps) {
  const { t } = useLanguage();
  const p = t.adminPages.feedbacks;
  const { addToast } = useToast();
  const open = !!feedback;
  const { mounted, exiting } = useOverlayTransition(open);
  const visible = mounted && !exiting;

  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Populate fields when feedback changes
  useEffect(() => {
    if (feedback) {
      setContent(feedback.content ?? "");
      setRating(feedback.rating ?? 0);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [feedback]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSave() {
    if (!feedback || saving) return;
    setSaving(true);
    try {
      await adminUpdateFeedback(feedback.id, { content: content.trim() || undefined, rating: rating || undefined });
      addToast("success", t.adminPages.feedbacks.approveSuccess.replace("duyệt", "cập nhật").replace("Approved", "Updated"));
      onSaved();
      onClose();
    } catch {
      addToast("error", "Không thể cập nhật feedback. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200",
      visible ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className={cn(
        "relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md",
        "border border-gray-100 dark:border-gray-800 transition-all duration-200",
        visible ? "scale-100 translate-y-0" : "scale-95 translate-y-2"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">
            Chỉnh sửa feedback
          </h3>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Rating */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{p.table.rating}</p>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = hovered || rating;
                return (
                  <button key={star} type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="focus:outline-none"
                  >
                    <Star size={22} className={cn("transition-all",
                      star <= active
                        ? "fill-amber-400 text-amber-400"
                        : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
                    )} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div>
            <label htmlFor="edit-fb-content" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              {p.table.content}
            </label>
            <textarea
              ref={textareaRef}
              id="edit-fb-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className={cn(
                "w-full px-3.5 py-3 text-sm rounded-xl border resize-none",
                "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                "text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600",
                "focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
              )}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 disabled:opacity-50 transition-colors">
            {p.deleteConfirm.cancel}
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl text-white bg-primary hover:bg-primary/90 disabled:opacity-60 transition-all">
            {saving
              ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Save size={13} />}
            {saving ? p.actions.approving : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export function AdminFeedbacksPage() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const p = t.adminPages.feedbacks;

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "">("");
  const [roleFilter, setRoleFilter] = useState<"HR" | "Candidate" | "">("");
  const [page, setPage] = useState(1);

  // Data state
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Action state
  const [actioning, setActioning] = useState<string | null>(null); // id of item in flight
  const [deleteTarget, setDeleteTarget] = useState<AdminFeedback | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminFeedback | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await getAdminFeedbacks({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        search: search.trim() || undefined,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, roleFilter, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, roleFilter, search]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleApprove(fb: AdminFeedback) {
    if (actioning) return;
    setActioning(fb.id);
    try {
      await adminUpdateFeedbackStatus(fb.id, "Approved");
      addToast("success", p.approveSuccess);
      notifyAdminFeedbacksUpdated();
      void fetchData();
    } catch {
      addToast("error", p.approveError);
    } finally {
      setActioning(null);
    }
  }

  async function handleReject(fb: AdminFeedback) {
    if (actioning) return;
    setActioning(fb.id);
    try {
      await adminUpdateFeedbackStatus(fb.id, "Rejected");
      addToast("success", p.rejectSuccess);
      notifyAdminFeedbacksUpdated();
      void fetchData();
    } catch {
      addToast("error", p.rejectError);
    } finally {
      setActioning(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await adminDeleteFeedback(deleteTarget.id);
      addToast("success", p.deleteSuccess);
      setDeleteTarget(null);
      notifyAdminFeedbacksUpdated();
      void fetchData();
    } catch {
      addToast("error", p.deleteError);
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 feedback-section" style={{ animationDelay: "0ms" }}>
        {/* Search */}
        <div className="relative flex-1 min-w-56">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={p.filters.searchPlaceholder}
            className={cn(
              "w-full pl-8 pr-3 py-2 text-sm rounded-xl border",
              "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700",
              "text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600",
              "focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 dark:focus:border-violet-500",
              "transition-colors"
            )}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus | "")}
          className={cn(
            "px-3 py-2 text-sm rounded-xl border",
            "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700",
            "text-gray-800 dark:text-gray-100",
            "focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 dark:focus:border-violet-500",
            "transition-colors"
          )}
        >
          <option value="">{p.filters.allStatuses}</option>
          <option value="Pending">{p.filters.statusPending}</option>
          <option value="Approved">{p.filters.statusApproved}</option>
          <option value="Rejected">{p.filters.statusRejected}</option>
        </select>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "HR" | "Candidate" | "")}
          className={cn(
            "px-3 py-2 text-sm rounded-xl border",
            "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700",
            "text-gray-800 dark:text-gray-100",
            "focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 dark:focus:border-violet-500",
            "transition-colors"
          )}
        >
          <option value="">{p.filters.allRoles}</option>
          <option value="HR">{p.filters.roleHR}</option>
          <option value="Candidate">{p.filters.roleCandidate}</option>
        </select>
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden feedback-section" style={{ animationDelay: "60ms" }}>
        {/* Error state */}
        {error && !loading && (
          <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {p.loadError}
          </div>
        )}

        {/* Empty state */}
        {!error && !loading && items.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {p.emptyState}
          </div>
        )}

        {/* Skeleton loading */}
        {loading && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-3 w-6 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="h-2.5 w-64 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
                <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="h-5 w-20 bg-gray-100 dark:bg-gray-800 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-10">
                    {p.table.no}
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {p.table.author}
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {p.table.content}
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-28">
                    {p.table.rating}
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-28">
                    {p.table.status}
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-28">
                    {p.table.createdAt}
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-32">
                    {p.table.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((fb, idx) => {
                  const isActioning = actioning === fb.id;
                  const rowNum = (page - 1) * PAGE_SIZE + idx + 1;
                  const dateLabel = fb.createdAt
                    ? new Date(fb.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={fb.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors group feedback-row"
                      style={{ animationDelay: `${idx * 35}ms` }}
                    >
                      {/* # */}
                      <td className="px-5 py-3.5 text-gray-400 dark:text-gray-600 text-xs tabular-nums">
                        {rowNum}
                      </td>

                      {/* Author */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800 dark:text-gray-100 leading-tight">
                          {fb.authorName || "—"}
                        </p>
                        {fb.authorEmail && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[160px]">
                            {fb.authorEmail}
                          </p>
                        )}
                      </td>

                      {/* Content */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="text-gray-700 dark:text-gray-300 line-clamp-2 leading-snug text-[13px]">
                          {fb.content || "—"}
                        </p>
                      </td>

                      {/* Rating */}
                      <td className="px-5 py-3.5">
                        <StarRating value={fb.rating} />
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <StatusBadge
                          status={fb.status}
                          label={p.statusBadge[fb.status] ?? fb.status}
                        />
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
                        {dateLabel}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Approve — only for Pending */}
                          {fb.status === "Pending" && (
                            <button
                              type="button"
                              onClick={() => void handleApprove(fb)}
                              disabled={!!actioning}
                              title={p.actions.approve}
                              className={cn(
                                "feedback-action-btn w-7 h-7 flex items-center justify-center rounded-lg",
                                "transition-all duration-150 active:scale-90",
                                "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
                                "disabled:opacity-40 disabled:cursor-not-allowed"
                              )}
                            >
                              {isActioning && actioning === fb.id ? (
                                <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                            </button>
                          )}

                          {/* Reject — only for Pending */}
                          {fb.status === "Pending" && (
                            <button
                              type="button"
                              onClick={() => void handleReject(fb)}
                              disabled={!!actioning}
                              title={p.actions.reject}
                              className={cn(
                                "feedback-action-btn w-7 h-7 flex items-center justify-center rounded-lg",
                                "transition-all duration-150 active:scale-90",
                                "text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40",
                                "disabled:opacity-40 disabled:cursor-not-allowed"
                              )}
                            >
                              <X size={14} />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => setEditTarget(fb)}
                            disabled={!!actioning}
                            title="Chỉnh sửa"
                            className={cn(
                              "feedback-action-btn w-7 h-7 flex items-center justify-center rounded-lg",
                              "transition-all duration-150 active:scale-90",
                              "text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40",
                              "disabled:opacity-40 disabled:cursor-not-allowed"
                            )}
                          >
                            <Pencil size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(fb)}
                            disabled={!!actioning}
                            title={p.actions.delete}
                            className={cn(
                              "feedback-action-btn w-7 h-7 flex items-center justify-center rounded-lg",
                              "transition-all duration-150 active:scale-90",
                              "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40",
                              "disabled:opacity-40 disabled:cursor-not-allowed"
                            )}
                          >
                            <Trash2 size={13} />
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

        {/* Pagination */}
        {!loading && !error && total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums px-2">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteConfirm()}
        variant="danger"
        title={p.deleteConfirm.title}
        message={p.deleteConfirm.message}
        confirmLabel={deleting ? p.actions.deleting : p.deleteConfirm.confirm}
        cancelLabel={p.deleteConfirm.cancel}
        loading={deleting}
      />

      {/* Edit modal */}
      <EditFeedbackModal
        feedback={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => void fetchData()}
      />
    </div>
  );
}
