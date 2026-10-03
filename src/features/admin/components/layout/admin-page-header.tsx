"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

interface AdminPageHeaderProps {
  heading: string;
  subtext?: string;
  /** Kept so existing pages can still pass an icon; it is not rendered. */
  icon?: LucideIcon;
  iconGradient?: string;
  accentGradient?: string;
  cardGradient?: string;
  cardBorder?: string;
  iconShadow?: string;
  className?: string;
}

/**
 * Plain title block for admin sub-pages: heading plus one description line.
 */
export function AdminPageHeader({
  heading,
  subtext,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn("mb-6 animate-fade-up", className)}>
      <h1 className={cn("text-[17px] font-bold leading-tight tracking-tight", portalHeadingAlt)}>
        {heading}
      </h1>
      {subtext && (
        <p className={cn("mt-0.5 text-[11px]", portalSubtextAlt)}>{subtext}</p>
      )}
    </div>
  );
}
