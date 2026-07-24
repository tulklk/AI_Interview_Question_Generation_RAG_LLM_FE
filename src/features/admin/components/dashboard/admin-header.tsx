"use client";

import { RefreshCw } from "lucide-react";
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-1">
      <div>
        <h1 className={cn("text-xl font-bold leading-tight tracking-tight", portalHeadingAlt)}>
          {d.title}
        </h1>
        {formattedTime && (
          <p className={cn("text-xs mt-0.5", portalSubtextAlt)}>
            {d.lastUpdated} {formattedTime}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium transition-colors shrink-0",
          "hover:bg-gray-50 dark:hover:bg-gray-800",
          portalSubtextAlt,
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        <RefreshCw size={13} className={cn(loading && "animate-spin")} />
        {d.refresh}
      </button>
    </div>
  );
}
