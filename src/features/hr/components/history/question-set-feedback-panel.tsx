"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Star,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  getHrQuestionSetFeedback,
  type HrFeedbackEntry,
} from "@/features/hr/services/hr-feedback.service";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarRow({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            i < Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
          )}
        />
      ))}
    </span>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300",
];

function avatarColor(name: string): string {
  const idx = (name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ── Entry card ────────────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const [imgError, setImgError] = useState(false);
  const showImg = !!avatarUrl && !imgError;

  if (showImg) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="shrink-0 w-8 h-8 rounded-full object-cover border border-gray-100 dark:border-gray-800"
      />
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold",
        avatarColor(name)
      )}
    >
      {name && name !== "Ứng viên" ? getInitials(name) : <User size={13} />}
    </span>
  );
}

function FeedbackCard({ entry }: { entry: HrFeedbackEntry }) {
  const name = entry.candidateName || "Ứng viên";
  return (
    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar name={name} avatarUrl={entry.avatarUrl} />

        <div className="flex-1 min-w-0">
          {/* Name + date */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className={cn("text-[13px] font-semibold truncate", portalHeading)}>
              {name}
            </p>
            <span className={cn("text-[11px] whitespace-nowrap shrink-0", portalSubtext)}>
              {formatDate(entry.createdAt)}
            </span>
          </div>

          {/* Stars */}
          <StarRow value={entry.rating} size={12} />

          {/* Comment */}
          {entry.comment && (
            <p className={cn("text-[12px] leading-relaxed mt-2", portalSubtext)}>
              {entry.comment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

interface QuestionSetFeedbackPanelProps {
  open: boolean;
  questionSetId: string | null;
  questionSetTitle?: string;
  onClose: () => void;
}

export function QuestionSetFeedbackPanel({
  open,
  questionSetId,
  questionSetTitle,
  onClose,
}: QuestionSetFeedbackPanelProps) {
  const [items, setItems] = useState<HrFeedbackEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset page when the set changes
  useEffect(() => {
    if (questionSetId) setPage(1);
  }, [questionSetId]);

  // Fetch feedback
  useEffect(() => {
    if (!open || !questionSetId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    getHrQuestionSetFeedback(questionSetId, page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.totalCount);
        setAvgRating(result.averageRating);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, questionSetId, page, reloadKey]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-55 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            className={cn(
              "fixed right-0 top-0 bottom-0 z-56 flex flex-col",
              "w-full max-w-md",
              "bg-white dark:bg-gray-950",
              "border-l border-gray-200 dark:border-gray-800",
              "shadow-2xl"
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <MessageSquare size={15} className="text-violet-500 shrink-0" />
                  <h2 className={cn("text-[15px] font-bold truncate", portalHeading)}>
                    Feedback ứng viên
                  </h2>
                </div>
                {questionSetTitle && (
                  <p className={cn("text-[12px] truncate pl-5.75", portalSubtext)} title={questionSetTitle}>
                    {questionSetTitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </div>

            {/* Summary bar */}
            {!loading && !error && total > 0 && (
              <div className="shrink-0 flex items-center gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  {avgRating !== null ? (
                    <>
                      <span className={cn("text-[22px] font-extrabold tabular-nums", portalHeading)}>
                        {avgRating.toFixed(1)}
                      </span>
                      <div>
                        <StarRow value={avgRating} size={13} />
                        <p className={cn("text-[10px] mt-0.5", portalSubtext)}>
                          {total} đánh giá
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className={cn("text-[13px]", portalSubtext)}>Chưa có đánh giá</p>
                  )}
                </div>

                {/* Breakdown bar (visual only) */}
                {avgRating !== null && (
                  <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${(avgRating / 5) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={22} className="animate-spin text-violet-500" />
                  <p className={cn("text-[13px]", portalSubtext)}>Đang tải feedback…</p>
                </div>
              )}

              {!loading && error && (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
                  <AlertCircle size={24} className="text-red-400" />
                  <p className={cn("text-[13px]", portalSubtext)}>Không thể tải feedback. Vui lòng thử lại.</p>
                  <button
                    type="button"
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    <RefreshCw size={13} />
                    Thử lại
                  </button>
                </div>
              )}

              {!loading && !error && total === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-6">
                  <MessageSquare size={28} className="text-gray-300 dark:text-gray-600" />
                  <p className={cn("text-[14px] font-medium", portalHeading)}>Chưa có feedback</p>
                  <p className={cn("text-[12px]", portalSubtext)}>
                    Ứng viên chưa gửi đánh giá cho bộ câu hỏi này.
                  </p>
                </div>
              )}

              {!loading && !error && items.length > 0 && (
                <div>
                  {items.map((entry) => (
                    <FeedbackCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination footer */}
            {!loading && !error && totalPages > 1 && (
              <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                <p className={cn("text-[11px] tabular-nums", portalSubtext)}>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <span className={cn("text-[11px] tabular-nums px-2", portalSubtext)}>
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
