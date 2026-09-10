"use client";

import { Check, Loader2, Pencil, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface PlanReviewHeaderProps {
  planApproved: boolean;
  badgePending: string;
  badgeApproved: string;
  sectionLabel: string;
  displayTitle: string;
  totalQuestions: number;
  interviewLengthMinutes: number;
  difficulty: string;
  mixLabel: string;
  unitQuestions: string;
  unitMin: string;
  editingTitle: boolean;
  titleDraft: string;
  savingTitle: boolean;
  canRename: boolean;
  renameTitle: string;
  renameTitleSave: string;
  renameTitleCancel: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onTitleDraftChange: (value: string) => void;
  onSaveTitle: () => void;
}

export function PlanReviewHeader({
  planApproved,
  badgePending,
  badgeApproved,
  sectionLabel,
  displayTitle,
  totalQuestions,
  interviewLengthMinutes,
  difficulty,
  mixLabel,
  unitQuestions,
  unitMin,
  editingTitle,
  titleDraft,
  savingTitle,
  canRename,
  renameTitle,
  renameTitleSave,
  renameTitleCancel,
  onStartEdit,
  onCancelEdit,
  onTitleDraftChange,
  onSaveTitle,
}: PlanReviewHeaderProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-900/60">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {sectionLabel}
        </p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
            planApproved
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
              : "bg-primary/10 text-primary"
          )}
        >
          {planApproved ? badgeApproved : badgePending}
        </span>
      </div>

      {editingTitle ? (
        <div className="mt-2 flex items-center gap-1">
          <input
            autoFocus
            value={titleDraft}
            disabled={savingTitle}
            maxLength={500}
            onChange={(e) => onTitleDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveTitle();
              if (e.key === "Escape") onCancelEdit();
            }}
            className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-semibold outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
          />
          <button
            type="button"
            disabled={savingTitle || !titleDraft.trim()}
            onClick={onSaveTitle}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary/10 disabled:opacity-40"
            title={renameTitleSave}
          >
            {savingTitle ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </button>
          <button
            type="button"
            disabled={savingTitle}
            onClick={onCancelEdit}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={renameTitleCancel}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="group mt-1.5 flex items-start gap-1.5">
          <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-50">
            {displayTitle}
          </p>
          {canRename && (
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-gray-800"
              title={renameTitle}
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      )}

      <p className="mt-2 text-[11px] text-gray-600 dark:text-gray-300">
        <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
          {totalQuestions} {unitQuestions}
        </span>
        <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
        <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
          {interviewLengthMinutes} {unitMin}
        </span>
        <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">{difficulty}</span>
      </p>
      {mixLabel ? (
        <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{mixLabel}</p>
      ) : null}
    </div>
  );
}
