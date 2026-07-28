"use client";

import { FolderPlus, Loader2, Save, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  projectName?: string | null;
  onNewSession: () => void;
  onSaveDraft: () => void;
  onShare: () => void;
  isGenerating?: boolean;
  questionCount?: number;
}

export function StudioTopBar({
  projectName,
  onNewSession,
  onSaveDraft,
  onShare,
  isGenerating,
  questionCount = 0,
}: Props) {

  return (
    <header
      className="mb-4"
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex items-start gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                Interview Studio
              </h1>
              {questionCount > 0 && (
                <span style={{ animation: "scaleInFade 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {questionCount} câu hỏi
                </span>
              )}
              {isGenerating && (
                <span style={{ animation: "scaleInFade 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Đang sinh…
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Paste your job description or upload a file to get AI-powered, role-specific questions instantly
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
            <FolderPlus className="h-4 w-4 text-primary" />
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

        </div>
      </div>
    </header>
  );
}
