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
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={cn("text-[17px] font-bold leading-tight tracking-tight", portalHeadingAlt)}>
            {d.title}
          </h1>
          {formattedTime ? (
            <p className={cn("mt-0.5 text-[11px]", portalSubtextAlt)}>
              {d.lastUpdated} {formattedTime}
            </p>
          ) : null}
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
