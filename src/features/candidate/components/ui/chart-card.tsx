"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Tailwind classes for the icon well background, e.g. "bg-blue-100 dark:bg-blue-950/50" */
  iconBg?: string;
  /** Tailwind classes for the icon color, e.g. "text-blue-600 dark:text-blue-400" */
  iconColor?: string;
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
  iconBg = "bg-gray-100 dark:bg-gray-800",
  iconColor = "text-gray-500 dark:text-gray-400",
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
    <motion.div
      className={cn("hr-glass-card p-5 sm:p-6", className)}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
              <Icon size={15} className={iconColor} />
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
    </motion.div>
  );
}
