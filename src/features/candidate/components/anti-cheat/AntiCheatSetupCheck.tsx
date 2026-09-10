"use client";

import { AlertTriangle, Check, Circle, Loader2, Lock, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AntiCheatSetupItemStatus, AntiCheatSetupStatus } from "@/features/candidate/anti-cheat/types";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

const SETUP_KEYS = [
  "camera",
  "face",
  "singleCandidate",
  "phoneModel",
  "integrity",
] as const satisfies ReadonlyArray<keyof AntiCheatSetupStatus>;

function StatusIcon({ status }: { status: AntiCheatSetupItemStatus }) {
  if (status === "checking" || status === "pending") {
    return <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden />;
  }
  if (status === "ready") {
    return <Check className="h-4 w-4 text-emerald-500" strokeWidth={2.5} aria-hidden />;
  }
  if (status === "unavailable") {
    return <Circle className="h-4 w-4 text-amber-500" aria-hidden />;
  }
  return <X className="h-4 w-4 text-red-500" strokeWidth={2.5} aria-hidden />;
}

function labelFor(
  status: AntiCheatSetupItemStatus,
  readyText: string,
  failText: string,
  checkingText: string,
  a: {
    statusUnavailable: string;
    statusWaiting: string;
  }
): string {
  if (status === "ready") return readyText;
  if (status === "unavailable") return a.statusUnavailable;
  if (status === "error") return failText;
  if (status === "checking") return checkingText;
  return a.statusWaiting;
}

type Props = {
  setup: AntiCheatSetupStatus;
  canStart: boolean;
  starting?: boolean;
  onStart: () => void;
  onRetrySetup: () => void;
};

export function AntiCheatSetupCheck({ setup, canStart, starting, onStart, onRetrySetup }: Props) {
  const { t } = useLanguage();
  const a = t.antiCheat;

  const rows: {
    key: (typeof SETUP_KEYS)[number];
    title: string;
    ready: string;
    fail: string;
    helper?: string;
    checkingText: string;
  }[] = [
    {
      key: "camera",
      title: a.camera,
      ready: a.statusReady,
      fail: a.statusNotReady,
      helper: a.cameraHelper,
      checkingText: a.statusChecking,
    },
    {
      key: "face",
      title: a.face,
      ready: a.statusDetected,
      fail: a.statusNotDetected,
      helper: a.faceHelper,
      checkingText: a.statusChecking,
    },
    {
      key: "singleCandidate",
      title: a.singleCandidate,
      ready: a.statusOk,
      fail: a.statusMultipleNone,
      helper: a.multiHelper,
      checkingText: a.statusChecking,
    },
    {
      key: "phoneModel",
      title: a.phoneModel,
      ready: a.statusReady,
      fail: a.statusFailed,
      checkingText: a.phoneModelLoading,
    },
    {
      key: "integrity",
      title: a.integrity,
      ready: a.statusReady,
      fail: a.statusNotReady,
      checkingText: a.statusChecking,
    },
  ];

  const readyCount = SETUP_KEYS.filter((key) => {
    const status = setup[key];
    return status === "ready" || (key === "phoneModel" && status === "unavailable");
  }).length;

  const failingRow = rows.find((row) => setup[row.key] === "error");

  const showNotReadyBanner =
    !canStart && (Boolean(setup.errorMessage) || Boolean(failingRow));

  const notReadyReason =
    setup.errorMessage ||
    (failingRow
      ? labelFor(
          setup[failingRow.key] as AntiCheatSetupItemStatus,
          failingRow.ready,
          failingRow.fail,
          failingRow.checkingText,
          a
        )
      : null);

  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-3">
        <h2 className={cn("text-base font-semibold sm:text-lg", portalHeadingAlt)}>
          {a.setupPanelTitle}
        </h2>
        <p className={cn("mt-1 text-xs leading-relaxed sm:text-[13px]", portalSubtextAlt)}>
          {a.setupPanelIntro}
        </p>
        <p className={cn("mt-1.5 text-[11px] tabular-nums", portalSubtextAlt)}>
          {a.checksProgress
            .replace("{{ready}}", String(readyCount))
            .replace("{{total}}", String(SETUP_KEYS.length))}
        </p>
      </div>

      <ul className="space-y-0.5">
        {rows.map((row) => {
          const status = setup[row.key] as AntiCheatSetupItemStatus;
          const description = labelFor(status, row.ready, row.fail, row.checkingText, a);
          const showHelper = status === "error" && row.helper;

          return (
            <li
              key={row.key}
              className="flex items-start gap-2.5 rounded-lg px-1 py-2 transition-colors"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                <StatusIcon status={status} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium leading-tight", portalHeadingAlt)}>
                  {row.title}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-xs leading-snug",
                    status === "ready"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : status === "error"
                        ? "text-red-600 dark:text-red-400"
                        : status === "unavailable"
                          ? "text-amber-600 dark:text-amber-400"
                          : portalSubtextAlt
                  )}
                >
                  {description}
                </p>
                {showHelper && (
                  <p className={cn("mt-0.5 text-[11px] leading-snug", portalSubtextAlt)}>
                    {row.helper}
                  </p>
                )}
              </div>
              {status === "unavailable" && (
                <span className="mt-0.5 shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  {a.statusUnavailable}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {canStart ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3 py-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
          <div>
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {a.systemReadyTitle}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-700/90 dark:text-emerald-300/90">
              {a.systemReadyBody}
            </p>
          </div>
        </div>
      ) : showNotReadyBanner && notReadyReason ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              {a.cannotStartTitle}
            </p>
            <p className="mt-0.5 text-[11px] text-amber-800/90 dark:text-amber-300/90">
              {notReadyReason}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-2.5 dark:border-primary/25 dark:bg-primary/10">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className={cn("text-xs font-semibold", portalHeadingAlt)}>{a.privacyTitle}</p>
          <p className={cn("mt-0.5 text-[11px] leading-relaxed", portalSubtextAlt)}>
            {a.privacyBody}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart || starting}
          className={cn(
            "inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold text-white transition-all sm:flex-[1.4]",
            canStart
              ? "hr-cta-btn shimmer-button disabled:opacity-70"
              : "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
          )}
        >
          {starting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {a.starting}
            </>
          ) : (
            a.startInterview
          )}
        </button>
        <button
          type="button"
          onClick={onRetrySetup}
          disabled={starting}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors sm:min-w-[7.5rem]",
            "border-gray-200 text-gray-700 hover:bg-gray-50",
            "dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          {a.recheck}
        </button>
      </div>
      {!canStart && !starting && (
        <p className={cn("mt-2 text-center text-[11px] sm:text-left", portalSubtextAlt)}>
          {a.completeChecksHint}
        </p>
      )}
    </div>
  );
}
