"use client";

import { Check, FolderPlus, Loader2, PencilLine, Save, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";

interface Props {
  projectName?: string | null;
  onNewSession: () => void;
  onCreateManually: () => void;
  onSaveDraft: () => void;
  onShare: () => void;
  isGenerating?: boolean;
  isSaving?: boolean;
  isSaved?: boolean;
  questionCount?: number;
  /** When false (Step 1 — no JD yet), Save and Share are hidden to reduce cognitive load */
  hasJd?: boolean;
}

export function StudioTopBar({
  projectName,
  onNewSession,
  onCreateManually,
  onSaveDraft,
  onShare,
  isGenerating,
  isSaving = false,
  isSaved = false,
  questionCount = 0,
  hasJd = false,
}: Props) {
  const { t } = useLanguage();
  const s = t.studioPage;

  return (
    <header
      className="mb-4"
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex items-start gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                {s.title}
              </h1>
              {questionCount > 0 && (
                <span style={{ animation: "scaleInFade 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {s.questionsCount.replace("{{count}}", String(questionCount))}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {s.subtitle}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isGenerating}
            onClick={onNewSession}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors",
              "hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900",
              "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-100",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <FolderPlus className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">{s.newSet}</span>
          </button>

          <button
            type="button"
            onClick={onCreateManually}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors",
              "hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900",
              "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            )}
          >
            <PencilLine className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">{s.createManually}</span>
          </button>

          {/* Save & Share — only shown once JD exists (reduces cognitive load at Step 1) */}
          {hasJd && (
            <>
              <button
                type="button"
                disabled={isGenerating || isSaving || isSaved}
                onClick={onSaveDraft}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                  isSaved
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : [
                        "border-gray-200 bg-white text-gray-700",
                        "hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900",
                        "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-100",
                      ],
                  isSaved ? "disabled:cursor-default" : "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSaved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="hidden md:inline">
                  {isSaving ? s.saving : isSaved ? s.saved : s.save}
                </span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={onShare}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors",
                  "hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900",
                  "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-100",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden md:inline">{s.share}</span>
              </button>
            </>
          )}

        </div>
      </div>
    </header>
  );
}
