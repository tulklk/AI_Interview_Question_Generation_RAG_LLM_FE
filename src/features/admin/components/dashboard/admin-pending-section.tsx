"use client";

import { Clock, Code2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

interface AdminPendingSectionProps {
  /** Lucide icon for the card header */
  icon: React.ElementType;
  title: string;
  subtitle: string;
  /** One-line explanation of what's missing */
  pendingMessage: string;
  /** API endpoint that would satisfy this section */
  endpointHint: string;
}

/**
 * Reusable placeholder card for dashboard sections whose backend API has not
 * been integrated yet. Shows an honest "pending" state rather than fake data.
 */
export function AdminPendingSection({
  icon: Icon,
  title,
  subtitle,
  pendingMessage,
  endpointHint,
}: AdminPendingSectionProps) {
  return (
    <div className="hr-glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
          <Icon size={14} className="text-gray-400 dark:text-gray-600" />
        </div>
        <div>
          <h2 className={cn("text-sm font-bold leading-tight", portalHeadingAlt)}>{title}</h2>
          <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{subtitle}</p>
        </div>
      </div>

      {/* Pending state body */}
      <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Clock size={18} className="text-gray-400 dark:text-gray-600" />
        </div>
        <p className={cn("text-[12px] font-medium max-w-64 leading-snug", portalSubtextAlt)}>
          {pendingMessage}
        </p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800/80">
          <Code2 size={11} className="text-gray-400 shrink-0" />
          <code className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
            {endpointHint}
          </code>
        </div>
      </div>
    </div>
  );
}
