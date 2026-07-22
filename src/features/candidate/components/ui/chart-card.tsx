import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  state: "loading" | "error" | "empty" | "ready";
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptySubtext?: string;
  errorLabel?: string;
  retryLabel?: string;
  onRetry?: () => void;
  minHeight?: number;
  className?: string;
  children: ReactNode;
}

/** Shared wrapper for every dashboard chart/panel: consistent header + loading/error/empty states, chart content otherwise. */
export function ChartCard({
  title,
  subtitle,
  icon: Icon,
  actions,
  state,
  emptyIcon,
  emptyTitle,
  emptySubtext,
  errorLabel,
  retryLabel,
  onRetry,
  minHeight = 260,
  className,
  children,
}: ChartCardProps) {
  return (
    <div className={cn("hr-glass-card p-5 sm:p-6", className)}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
              <Icon size={15} className="text-gray-500 dark:text-gray-400" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className={cn("text-[15px] font-bold leading-tight truncate", portalHeadingAlt)}>{title}</h2>
            {subtitle && <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>

      {state === "loading" && (
        <div className="flex flex-col gap-3" style={{ minHeight }}>
          <Skeleton className="w-full flex-1 rounded-xl" />
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight }}>
          <AlertCircle size={20} className="text-red-500" />
          <p className={cn("text-[13px]", portalSubtextAlt)}>{errorLabel}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
            >
              <RefreshCw size={12} />
              {retryLabel}
            </button>
          )}
        </div>
      )}

      {state === "empty" && (
        <div style={{ minHeight }} className="flex items-center justify-center">
          <EmptyState icon={emptyIcon} title={emptyTitle} subtext={emptySubtext} />
        </div>
      )}

      {state === "ready" && children}
    </div>
  );
}
