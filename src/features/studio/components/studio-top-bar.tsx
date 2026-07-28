"use client";

import { FolderPlus, Loader2, Save, Share2, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  projectName?: string | null;
  onNewSession: () => void;
  onSaveDraft: () => void;
  onShare: () => void;
  onGenerateQuestions: () => void;
  generateDisabled?: boolean;
  generateLabel?: string;
  isGenerating?: boolean;
  questionCount?: number;
}

export function StudioTopBar({
  projectName,
  onNewSession,
  onSaveDraft,
  onShare,
  onGenerateQuestions,
  generateDisabled,
  generateLabel,
  isGenerating,
  questionCount = 0,
}: Props) {
  const primaryLabel = generateLabel ?? "Sinh câu hỏi";

  return (
    <header
      className={cn(
        "mb-4 overflow-hidden rounded-2xl border border-[#e8e4f8] bg-white shadow-sm",
        "dark:border-gray-800 dark:bg-gray-900"
      )}
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              "bg-gradient-to-br from-[#6c47ff] to-[#8b6cff] text-white shadow-md shadow-[#6c47ff]/25"
            )}
            aria-hidden
          >
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                Interview Plan Studio
              </h1>
              {questionCount > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {questionCount} câu hỏi
                </span>
              )}
              {isGenerating && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Đang sinh…
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400" title={projectName ?? undefined}>
              Session · <span className="font-medium text-gray-700 dark:text-gray-300">{projectName ?? "—"}</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNewSession}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700",
              "hover:border-gray-300 hover:bg-gray-50",
              "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            )}
          >
            <FolderPlus className="h-4 w-4 text-[#6c47ff]" />
            <span className="hidden sm:inline">Tạo bộ mới</span>
          </button>

          <button
            type="button"
            onClick={onSaveDraft}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700",
              "hover:border-gray-300 hover:bg-gray-50",
              "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            )}
          >
            <Save className="h-4 w-4" />
            <span className="hidden md:inline">Lưu nháp</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700",
              "hover:border-gray-300 hover:bg-gray-50",
              "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            )}
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden md:inline">Chia sẻ</span>
          </button>

          <button
            type="button"
            onClick={onGenerateQuestions}
            disabled={generateDisabled}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#6c47ff]/30",
              "bg-gradient-to-r from-[#6c47ff] to-[#5535dd]",
              "hover:from-[#5a3aef] hover:to-[#4a28c9]",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            )}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {primaryLabel}
          </button>
        </div>
      </div>
    </header>
  );
}
