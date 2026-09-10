"use client";

import { cn } from "@/lib/cn";
import type { AntiCheatPersistedPayload } from "@/features/candidate/anti-cheat/types";
import { INTEGRITY_EVENT_DISPLAY_NAMES } from "@/features/candidate/anti-cheat/integrity-labels";
import { portalHeadingAlt, portalSubtextAlt, portalDivider } from "@/shared/utils/portal-ui";

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRelative(msFromStart: number): string {
  const totalSec = Math.max(0, Math.floor(msFromStart / 1000));
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const EVENT_LABELS = INTEGRITY_EVENT_DISPLAY_NAMES;

type Props = {
  payload: AntiCheatPersistedPayload;
};

export function AntiCheatReport({ payload }: Props) {
  const { summary, events, interviewStartTime } = payload;

  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900",
        portalDivider
      )}
    >
      <h2 className={cn("text-base font-semibold", portalHeadingAlt)}>Interview Integrity Report</h2>
      <p className={cn("mt-1 text-xs leading-relaxed", portalSubtextAlt)}>
        These signals are provided for interview integrity review. They do not automatically indicate
        cheating.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Stat
          label="Camera presence"
          value={`${summary.facePresencePercentage.toFixed(1)}%`}
        />
        <Stat label="Integrity signals" value={String(summary.totalEvents)} />
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        <Row
          title="Phone detected"
          count={summary.phoneEvents}
          detail={
            summary.phoneEvents > 0
              ? `Total duration: ${formatDuration(summary.totalPhoneDurationMs)}`
              : undefined
          }
        />
        <Row title="Multiple people detected" count={summary.multipleFaceEvents} />
        <Row
          title="Candidate not visible"
          count={summary.noFaceEvents}
          detail={
            summary.noFaceEvents > 0
              ? `Total duration: ${formatDuration(summary.totalNoFaceDurationMs)}`
              : undefined
          }
        />
        <Row
          title="Prolonged looking away"
          count={summary.lookingAwayEvents}
          detail={
            summary.lookingAwayEvents > 0
              ? `Total duration: ${formatDuration(summary.totalLookingAwayDurationMs)}`
              : undefined
          }
        />
        <Row
          title="Tab switches"
          count={summary.tabSwitchEvents}
          detail={
            summary.tabSwitchEvents > 0
              ? `Total away time: ${formatDuration(summary.totalTabSwitchDurationMs)}`
              : undefined
          }
        />
        <Row
          title="Window focus lost"
          count={summary.windowFocusLostEvents ?? 0}
          detail={
            (summary.windowFocusLostEvents ?? 0) > 0
              ? `Total away time: ${formatDuration(summary.totalWindowFocusLostDurationMs ?? 0)}`
              : undefined
          }
        />
        <Row title="Fullscreen exits" count={summary.fullscreenExitEvents} />
        <Row title="Camera disabled" count={summary.cameraDisabledEvents} />
      </ul>

      {events.length > 0 && (
        <div className="mt-5">
          <h3 className={cn("text-sm font-semibold", portalHeadingAlt)}>Event timeline</h3>
          <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
            {[...events]
              .sort((a, b) => a.startTime - b.startTime)
              .map((e) => (
                <li
                  key={e.id}
                  className="flex items-start gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800/50"
                >
                  <span className="shrink-0 font-mono tabular-nums text-gray-500">
                    {formatRelative(e.startTime - interviewStartTime)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("font-semibold", portalHeadingAlt)}>
                      {EVENT_LABELS[e.type]}
                    </span>
                    {e.durationMs != null && e.durationMs > 0 && (
                      <span className={cn("ml-1", portalSubtextAlt)}>
                        {formatDuration(e.durationMs)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-800/50">
      <p className={cn("text-[11px] font-medium", portalSubtextAlt)}>{label}</p>
      <p className={cn("text-lg font-bold tabular-nums", portalHeadingAlt)}>{value}</p>
    </div>
  );
}

function Row({
  title,
  count,
  detail,
}: {
  title: string;
  count: number;
  detail?: string;
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-gray-100 py-2 last:border-0 dark:border-gray-800">
      <div>
        <p className={cn("font-medium", portalHeadingAlt)}>{title}</p>
        {detail && <p className={cn("text-[11px]", portalSubtextAlt)}>{detail}</p>}
      </div>
      <p className={cn("shrink-0 text-sm font-semibold tabular-nums", portalSubtextAlt)}>
        {count} {count === 1 ? "event" : "events"}
      </p>
    </li>
  );
}
