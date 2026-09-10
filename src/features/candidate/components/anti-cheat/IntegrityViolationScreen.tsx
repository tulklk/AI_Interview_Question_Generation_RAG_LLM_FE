"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { IntegrityState } from "@/features/candidate/anti-cheat/types";
import { integrityEventDisplayName } from "@/features/candidate/anti-cheat/integrity-labels";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

function formatStrikeTime(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

type Props = {
  state: IntegrityState;
  returnHref?: string;
};

/**
 * Full-screen terminal view after 3 integrity strikes.
 * Candidate cannot return to the active question from here.
 */
export function IntegrityViolationScreen({
  state,
  returnHref = "/candidate/dashboard",
}: Props) {
  const { t } = useLanguage();
  const a = t.antiCheat;

  return (
    <div className="min-h-screen hr-main-bg flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className={cn("text-[22px] font-bold", portalHeadingAlt)}>{a.terminatedTitle}</h1>
          <p className={cn("text-[13px] leading-relaxed max-w-md", portalSubtextAlt)}>
            {a.terminatedBody}
          </p>
          <p className="text-[13px] font-semibold text-red-700 dark:text-red-300">
            {a.violationsDetected.replace("{{count}}", String(state.strikeCount))}
          </p>
        </div>

        <div className="mt-6">
          <h2 className={cn("text-[13px] font-bold mb-3", portalHeadingAlt)}>
            {a.violationHistory}
          </h2>
          <ol className="space-y-2.5">
            {state.strikes.map((s) => (
              <li
                key={s.id}
                className="flex items-start gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-[11px] font-bold text-red-700 dark:text-red-300">
                  {s.strikeNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>
                    {integrityEventDisplayName(s.eventType, a.events)}
                  </p>
                  <p className={cn("text-[11px] tabular-nums mt-0.5", portalSubtextAlt)}>
                    {formatStrikeTime(s.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className={cn("mt-5 text-[12px] text-center leading-relaxed", portalSubtextAlt)}>
          {a.terminatedFooter}
        </p>

        <div className="mt-6 flex justify-center">
          <Link
            href={returnHref}
            className="shimmer-button inline-flex items-center justify-center h-10 px-5 text-[13px] font-semibold text-white hr-cta-btn rounded-xl"
          >
            {a.returnDashboard}
          </Link>
        </div>
      </div>
    </div>
  );
}
