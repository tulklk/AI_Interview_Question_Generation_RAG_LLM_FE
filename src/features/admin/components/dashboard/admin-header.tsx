"use client";

import { RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

interface AdminHeaderProps {
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
}

export function AdminHeader({ lastUpdated, loading, onRefresh }: AdminHeaderProps) {
  const { t } = useLanguage();
  const d = t.adminPages.dashboard.opCenter;

  const formattedTime = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-900/30 bg-linear-to-r from-violet-50 via-white to-cyan-50 dark:from-violet-950/20 dark:via-gray-900 dark:to-cyan-950/10 px-5 py-4 sm:px-6">
      {/* Decorative glow bar at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-violet-500 via-primary to-cyan-400 opacity-70" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-violet-500 to-primary flex items-center justify-center shrink-0 shadow-md shadow-violet-200 dark:shadow-violet-900/30">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <h1 className={cn("text-[17px] font-bold leading-tight tracking-tight", portalHeadingAlt)}>
              {d.title}
            </h1>
            {formattedTime ? (
              <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>
                {d.lastUpdated} {formattedTime}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-violet-200 dark:border-violet-800/50",
            "bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-3 py-2 text-[12px] font-semibold transition-all shrink-0",
            "hover:border-primary hover:text-primary dark:hover:border-primary",
            "text-gray-600 dark:text-gray-400",
            loading && "opacity-50 cursor-not-allowed"
          )}
        >
          <RefreshCw size={12} className={cn(loading && "animate-spin")} />
          {d.refresh}
        </button>
      </div>
    </div>
  );
}
