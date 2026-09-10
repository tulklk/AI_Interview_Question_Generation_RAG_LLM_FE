"use client";

import { Lock, Undo2, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  body: string;
  unpublishLabel: string;
  onUnpublish: () => void;
  publishing?: boolean;
  className?: string;
};

/** Compact amber banner when the question set is published and edits are locked. */
export function QuestionSetStatusBanner({
  title,
  body,
  unpublishLabel,
  onUnpublish,
  publishing = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        "dark:border-amber-800/60 dark:bg-amber-950/35",
        className
      )}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
          <Lock size={14} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">{title}</p>
          <p className="mt-0.5 text-xs leading-snug text-amber-800/90 dark:text-amber-300/90">{body}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onUnpublish}
        disabled={publishing}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100 dark:hover:bg-amber-900/40"
      >
        {publishing ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
        {unpublishLabel}
      </button>
    </div>
  );
}
