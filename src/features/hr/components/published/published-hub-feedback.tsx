"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  RefreshCw,
  Star,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  getHrQuestionSetFeedback,
  type HrFeedbackEntry,
} from "@/features/hr/services/hr-feedback.service";
import { useLanguage } from "@/shared/providers/language-context";

const PAGE_SIZE = 10;

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

/** SCRUM-440: feedback list inline (không slide-over). */
export function PublishedHubFeedback({
  questionSetId,
  initialItems,
  initialTotal,
  initialAvg,
  previewLimit,
}: {
  questionSetId: string;
  /** Dữ liệu preload từ hub — nếu có previewLimit thì dùng luôn, không fetch. */
  initialItems?: HrFeedbackEntry[];
  initialTotal?: number;
  initialAvg?: number | null;
  previewLimit?: number;
}) {
  const { t } = useLanguage();
  const h = t.publishedHubPage;
  const [items, setItems] = useState<HrFeedbackEntry[]>(initialItems ?? []);
  const [total, setTotal] = useState(initialTotal ?? 0);
  const [avgRating, setAvgRating] = useState<number | null>(initialAvg ?? null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const isPreview = previewLimit != null;

  useEffect(() => {
    if (isPreview) return;
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
    return () => {
      cancelled = true;
    };
  }, [questionSetId, page, reloadKey, isPreview]);

  const displayItems = isPreview ? (initialItems ?? []).slice(0, previewLimit) : items;
  const displayTotal = isPreview ? (initialTotal ?? displayItems.length) : total;
  const displayAvg = isPreview ? (initialAvg ?? null) : avgRating;
  const totalPages = Math.max(1, Math.ceil(displayTotal / PAGE_SIZE));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 size={22} className="animate-spin text-violet-500" />
        <p className={cn("text-[13px]", portalSubtext)}>{h.feedbackLoading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <AlertCircle size={24} className="text-red-400" />
        <p className={cn("text-[13px]", portalSubtext)}>{h.feedbackLoadFailed}</p>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-violet-600 hover:underline"
        >
          <RefreshCw size={13} /> {h.retry}
        </button>
      </div>
    );
  }

  if (displayTotal === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
        <MessageSquare size={28} className="text-gray-300 dark:text-gray-600" />
        <p className={cn("text-[14px] font-medium", portalHeading)}>{h.feedbackEmpty}</p>
        <p className={cn("text-[12px]", portalSubtext)}>{h.feedbackEmptyBody}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950/40 overflow-hidden">
      {!isPreview && displayAvg != null && (
        <div className="flex items-center gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800">
          <span className={cn("text-[22px] font-extrabold tabular-nums", portalHeading)}>
            {displayAvg.toFixed(1)}
          </span>
          <div>
            <StarRow value={displayAvg} size={13} />
            <p className={cn("text-[10px] mt-0.5", portalSubtext)}>
              {h.feedbackCount.replace("{{n}}", String(displayTotal))}
            </p>
          </div>
        </div>
      )}

      <div>
        {displayItems.map((entry) => {
          const name = entry.candidateName || "—";
          return (
            <div
              key={entry.id}
              className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                  {name !== "—" ? getInitials(name) : <User size={13} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className={cn("text-[13px] font-semibold truncate", portalHeading)}>{name}</p>
                    <span className={cn("text-[11px] whitespace-nowrap shrink-0", portalSubtext)}>
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                  <StarRow value={entry.rating} size={12} />
                  {entry.comment?.trim() && (
                    <p className={cn("mt-2 text-[13px] leading-relaxed", portalSubtext)}>
                      {entry.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isPreview && totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className={cn("text-[11px] tabular-nums", portalSubtext)}>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, displayTotal)} / {displayTotal}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg border disabled:opacity-30"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg border disabled:opacity-30"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
