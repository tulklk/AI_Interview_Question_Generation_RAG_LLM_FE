"use client";

import { Pin, PinOff, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalCard, portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import type { AdminMarketplaceListItem } from "@/features/admin/services/admin-marketplace.service";

interface MarketplaceTableProps {
  items: AdminMarketplaceListItem[];
  loading: boolean;
  selectedId: string | null;
  pinningId: string | null;
  onSelect: (id: string) => void;
  onTogglePin: (item: AdminMarketplaceListItem) => void;
  labels: {
    title: string;
    hr: string;
    company: string;
    attempts: string;
    unique: string;
    rating: string;
    pinned: string;
    publishedAt: string;
    actions: string;
    empty: string;
    view: string;
    pin: string;
    unpin: string;
  };
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

export function MarketplaceTable({
  items,
  loading,
  selectedId,
  pinningId,
  onSelect,
  onTogglePin,
  labels,
}: MarketplaceTableProps) {
  if (loading) {
    return (
      <div className={cn("flex items-center justify-center rounded-xl border py-16", portalCard)}>
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={cn("rounded-xl border px-4 py-12 text-center text-sm", portalCard, portalSubtextAlt)}>
        {labels.empty}
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-xl border", portalCard)}>
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {[
              labels.title,
              labels.hr,
              labels.company,
              labels.attempts,
              labels.unique,
              labels.rating,
              labels.pinned,
              labels.publishedAt,
              labels.actions,
            ].map((h) => (
              <th key={h} className={cn("px-3 py-2.5 text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const active = selectedId === item.id;
            return (
              <tr
                key={item.id}
                className={cn(
                  "border-b border-gray-50 dark:border-gray-800/60 transition-colors",
                  active ? "bg-primary/5" : "hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                )}
              >
                <td className={cn("max-w-[220px] truncate px-3 py-2.5 font-semibold", portalHeadingAlt)}>
                  {item.title}
                </td>
                <td className="px-3 py-2.5">
                  <div className="min-w-0">
                    <p className={cn("truncate font-medium", portalHeadingAlt)}>{item.hrName}</p>
                    <p className={cn("truncate text-xs", portalSubtextAlt)}>{item.hrEmail}</p>
                  </div>
                </td>
                <td className={cn("max-w-[160px] truncate px-3 py-2.5", portalSubtextAlt)}>
                  {item.companyName}
                </td>
                <td className={cn("px-3 py-2.5 tabular-nums", portalHeadingAlt)}>{item.attemptCount}</td>
                <td className={cn("px-3 py-2.5 tabular-nums", portalHeadingAlt)}>
                  {item.uniqueCandidateCount}
                </td>
                <td className={cn("px-3 py-2.5 tabular-nums", portalHeadingAlt)}>
                  {item.rating != null ? item.rating.toFixed(1) : "—"}
                </td>
                <td className="px-3 py-2.5">
                  {item.isPinned ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      <Pin size={11} /> {labels.pinned}
                    </span>
                  ) : (
                    <span className={cn("text-xs", portalSubtextAlt)}>—</span>
                  )}
                </td>
                <td className={cn("px-3 py-2.5 text-xs", portalSubtextAlt)}>
                  {formatDate(item.publishedAt)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2 text-xs font-semibold hover:border-primary/40 hover:text-primary dark:border-gray-700"
                      title={labels.view}
                    >
                      <Eye size={12} />
                      {labels.view}
                    </button>
                    <button
                      type="button"
                      disabled={pinningId === item.id}
                      onClick={() => onTogglePin(item)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2 text-xs font-semibold hover:border-primary/40 hover:text-primary disabled:opacity-60 dark:border-gray-700"
                      title={item.isPinned ? labels.unpin : labels.pin}
                    >
                      {pinningId === item.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : item.isPinned ? (
                        <PinOff size={12} />
                      ) : (
                        <Pin size={12} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
