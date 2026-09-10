"use client";

import type { ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

/** Works for both lucide-react and react-icons brand glyphs. */
type FieldIcon = ComponentType<{ size?: number; className?: string }>;

interface ProfileFieldProps {
  label: string;
  value?: string;
  /** Renders the value as an external link when the value is a URL. */
  href?: string;
  icon?: FieldIcon;
  className?: string;
}

/** Label + value pair used across the profile cards. */
export function ProfileField({ label, value, href, icon: Icon, className }: ProfileFieldProps) {
  const { t } = useLanguage();
  const text = value?.trim() ?? "";

  return (
    <div className={cn("min-w-0", className)}>
      <p className={cn("flex items-center gap-1.5 text-xs font-medium", portalSubtext)}>
        {Icon ? (
          <span aria-hidden className="shrink-0 opacity-70">
            <Icon size={13} />
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </p>
      {text && href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-sm font-medium text-[#6c47ff] hover:underline"
          title={text}
        >
          {text}
        </a>
      ) : text ? (
        <p className={cn("mt-1 text-sm font-medium break-words", portalHeading)}>{text}</p>
      ) : (
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          {t.settingsPage.profile.emptyField}
        </p>
      )}
    </div>
  );
}

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  desc?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Neutral surface card with a compact icon + title header. */
export function SectionCard({ icon: Icon, title, desc, action, children, className }: SectionCardProps) {
  return (
    <section className={cn(portalCard, "p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="hr-icon-box flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
            <Icon size={15} className="text-[#7C3AED] dark:text-[#a78bff]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h4 className={cn("text-sm font-semibold truncate", portalHeading)}>{title}</h4>
            {desc ? <p className={cn("text-xs mt-0.5", portalSubtext)}>{desc}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
