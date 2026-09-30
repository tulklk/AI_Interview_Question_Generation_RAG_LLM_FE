"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

interface CoachStepHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Tailwind classes cho nền icon (ví dụ bg-violet-100). */
  iconWrapClassName?: string;
  /** Tailwind classes cho màu icon. */
  iconClassName?: string;
  className?: string;
  /** Nút / action góc phải header. */
  trailing?: React.ReactNode;
}

/**
 * SCRUM-484: header card thống nhất cho các step AI Coach
 * (icon + title + subtitle) — cùng pattern Report / Roadmaps.
 */
export function CoachStepHeader({
  icon: Icon,
  title,
  subtitle,
  iconWrapClassName = "bg-primary/10",
  iconClassName = "text-primary",
  className,
  trailing,
}: CoachStepHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5",
        className
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          iconWrapClassName
        )}
      >
        <Icon size={14} className={iconClassName} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13px] font-semibold sm:text-[14px]", portalHeadingAlt)}>{title}</p>
        {subtitle ? (
          <p className={cn("text-[11px]", portalSubtextAlt)}>{subtitle}</p>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}
