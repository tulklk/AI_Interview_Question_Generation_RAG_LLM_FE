"use client";

import { cn } from "@/lib/cn";
import { AlertTriangle } from "lucide-react";
import { MAX_INTEGRITY_STRIKES } from "@/features/candidate/anti-cheat/constants";
import { useLanguage } from "@/shared/providers/language-context";

type Props = {
  active: boolean;
  cameraDisabled?: boolean;
  /** Current strike count (1–2 shown as Warnings n/2). */
  warningCount?: number;
};

export function AntiCheatStatus({ active, cameraDisabled, warningCount = 0 }: Props) {
  const { t } = useLanguage();
  const a = t.antiCheat;

  if (cameraDisabled) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <AlertTriangle className="h-3 w-3" />
        {a.cameraDisconnected}
      </div>
    );
  }

  if (!active) return null;

  const shownWarnings = Math.min(Math.max(0, warningCount), MAX_INTEGRITY_STRIKES - 1);
  const maxWarnings = MAX_INTEGRITY_STRIKES - 1;

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800",
          "dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        )}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        {a.monitoringActive}
      </div>
      {shownWarnings > 0 && (
        <div className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {a.warningsCount
            .replace("{{current}}", String(shownWarnings))
            .replace("{{max}}", String(maxWarnings))}
        </div>
      )}
    </div>
  );
}
