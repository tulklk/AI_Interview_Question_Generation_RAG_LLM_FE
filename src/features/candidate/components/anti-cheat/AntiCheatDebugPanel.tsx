"use client";

import { cn } from "@/lib/cn";
import type { AntiCheatDebugSnapshot } from "@/features/candidate/anti-cheat/types";
import { DEBUG_ANTI_CHEAT } from "@/features/candidate/anti-cheat/constants";

export function AntiCheatDebugPanel({ snapshot }: { snapshot: AntiCheatDebugSnapshot | null }) {
  if (!DEBUG_ANTI_CHEAT || !snapshot) return null;

  return (
    <div className="rounded-lg border border-dashed border-violet-300 bg-violet-50/80 p-2 font-mono text-[10px] text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
      <p className="mb-1 font-bold">Anti-cheat Debug</p>
      <p>Face count: {snapshot.faceCount}</p>
      <p>Phone detected: {String(snapshot.phoneDetected)}</p>
      <p>Phone confidence: {snapshot.phoneConfidence?.toFixed(2) ?? "-"}</p>
      <p>Head direction: {snapshot.headDirection}</p>
      <p>Tab visible: {String(snapshot.tabVisible)}</p>
      <p>Fullscreen: {String(snapshot.fullscreen)}</p>
      <p className={cn(snapshot.monitoringActive && "text-emerald-700 dark:text-emerald-300")}>
        Monitoring: {String(snapshot.monitoringActive)}
      </p>
    </div>
  );
}
