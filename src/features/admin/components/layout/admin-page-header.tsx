"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

interface AdminPageHeaderProps {
  heading: string;
  subtext?: string;
  /** Lucide icon to display in the badge */
  icon: LucideIcon;
  /**
   * Tailwind classes for the icon badge background gradient.
   * Defaults to violet → primary.
   */
  iconGradient?: string;
  /**
   * Tailwind classes for the card's top accent gradient bar.
   * Defaults to violet → primary → cyan.
   */
  accentGradient?: string;
  /**
   * Tailwind classes for the card background gradient.
   * Defaults to violet → white → cyan.
   */
  cardGradient?: string;
  /** Tailwind classes for the card border. */
  cardBorder?: string;
  /** Shadow for the icon badge. */
  iconShadow?: string;
  className?: string;
}

/**
 * Shared gradient page-header card for all admin sub-pages.
 * Replaces the plain `<div className="mb-8 animate-fade-up">` heading pattern.
 */
export function AdminPageHeader({
  heading,
  subtext,
  icon: Icon,
  iconGradient = "bg-linear-to-br from-violet-500 to-primary",
  accentGradient = "bg-linear-to-r from-violet-500 via-primary to-cyan-400",
  cardGradient = "bg-linear-to-r from-violet-50 via-white to-cyan-50 dark:from-violet-950/20 dark:via-gray-900 dark:to-cyan-950/10",
  cardBorder = "border-violet-100 dark:border-violet-900/30",
  iconShadow = "shadow-violet-200 dark:shadow-violet-900/30",
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border px-5 py-4 sm:px-6 mb-6 animate-fade-up",
        cardGradient,
        cardBorder,
        className
      )}
    >
      {/* Gradient top accent bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 opacity-70", accentGradient)} />

      <div className="flex items-center gap-3">
        {/* Icon badge */}
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md",
            iconGradient,
            iconShadow
          )}
        >
          <Icon size={16} className="text-white" />
        </div>

        {/* Text */}
        <div>
          <h1 className={cn("text-[17px] font-bold leading-tight tracking-tight", portalHeadingAlt)}>
            {heading}
          </h1>
          {subtext && (
            <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}
