"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { getPracticeSession } from "@/features/candidate/services/practice-session.service";
import { useLanguage } from "@/shared/providers/language-context";

// ---------------------------------------------------------------------------
// localStorage contract (shared with feedback-result-client.tsx)
// ---------------------------------------------------------------------------

export const SCORING_LS_KEY = "cand_scoring_sessions";
const POLL_INTERVAL_MS = 4000;
const ANIM_DURATION_MS = 350;

export interface ScoringEntry {
  sessionId: string;
  setTitle: string;
  status: "SCORING" | "SCORED";
}

export function readScoringEntries(): ScoringEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SCORING_LS_KEY) ?? "[]"); }
  catch { return []; }
}

export function writeScoringEntries(entries: ScoringEntry[]) {
  if (typeof window === "undefined") return;
  if (entries.length === 0) localStorage.removeItem(SCORING_LS_KEY);
  else localStorage.setItem(SCORING_LS_KEY, JSON.stringify(entries));
}

export function registerScoringSession(sessionId: string, setTitle: string) {
  if (typeof window === "undefined") return;
  const entries = readScoringEntries();
  const idx = entries.findIndex((e) => e.sessionId === sessionId);
  if (idx === -1) {
    entries.push({ sessionId, setTitle, status: "SCORING" });
  } else if (setTitle && entries[idx].setTitle !== setTitle) {
    entries[idx] = { ...entries[idx], setTitle };
  }
  writeScoringEntries(entries);
}

export function markScoringDone(sessionId: string) {
  if (typeof window === "undefined") return;
  const entries = readScoringEntries();
  const idx = entries.findIndex((e) => e.sessionId === sessionId);
  if (idx !== -1 && entries[idx].status === "SCORING") {
    entries[idx] = { ...entries[idx], status: "SCORED" };
    writeScoringEntries(entries);
    window.dispatchEvent(new CustomEvent("cand:scoring-updated"));
  }
}

// ---------------------------------------------------------------------------
// Badge card
// ---------------------------------------------------------------------------

interface BadgeCardProps {
  entry: ScoringEntry;
  visible: boolean;
  scoringTitle: string;
  scoredTitle: string;
  subtitleLabel: string;
  onDismiss: (e: React.MouseEvent) => void;
  onClick: () => void;
}

function BadgeCard({
  entry, visible, scoringTitle, scoredTitle, subtitleLabel, onDismiss, onClick,
}: BadgeCardProps) {
  const isScored = entry.status === "SCORED";
  return (
    <div
      className={cn(
        "transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-6 scale-95 pointer-events-none"
      )}
      style={{ transitionDuration: `${ANIM_DURATION_MS}ms` }}
    >
      <div
        onClick={onClick}
        className={cn(
          "relative flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl shadow-2xl cursor-pointer select-none",
          "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800",
          "hover:shadow-[0_8px_30px_rgba(124,58,237,0.22)] hover:scale-[1.02]",
          "transition-[box-shadow,transform] duration-200 ease-out min-w-60 max-w-75"
        )}
      >
        {/* Pulse dot while scoring */}
        {!isScored && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
          </span>
        )}

        {/* Ripple flash on state change */}
        <div
          key={entry.status}
          className="absolute inset-0 rounded-2xl bg-white/30 dark:bg-white/5 animate-[ping_0.4s_ease-out_1]"
          style={{ animationFillMode: "forwards" }}
        />

        {/* Icon */}
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
          isScored ? "bg-emerald-500" : "bg-violet-600"
        )}>
          {isScored
            ? <CheckCircle2 size={16} className="text-white" />
            : <Loader2 size={16} className="animate-spin text-white" />
          }
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
            {isScored ? scoredTitle : scoringTitle}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight truncate">
            {entry.setTitle || subtitleLabel}
          </p>
        </div>

        {/* Dismiss */}
        <button
          className={cn(
            "absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center",
            "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600",
            "transition-all duration-150 hover:scale-110"
          )}
          onClick={onDismiss}
        >
          <X size={10} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
}

// Per-entry badge with mount/unmount lifecycle
function AnimatedBadge({
  entry, scoringTitle, scoredTitle, subtitleLabel, onDismiss, onClick,
}: {
  entry: ScoringEntry;
  scoringTitle: string;
  scoredTitle: string;
  subtitleLabel: string;
  onDismiss: () => void;
  onClick: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const exitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (exitRef.current) clearTimeout(exitRef.current);
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => { if (exitRef.current) clearTimeout(exitRef.current); };
  }, []);

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setVisible(false);
    exitRef.current = setTimeout(() => { setMounted(false); onDismiss(); }, ANIM_DURATION_MS);
  }

  if (!mounted) return null;

  return (
    <BadgeCard
      entry={entry}
      visible={visible}
      scoringTitle={scoringTitle}
      scoredTitle={scoredTitle}
      subtitleLabel={subtitleLabel}
      onClick={onClick}
      onDismiss={handleDismiss}
    />
  );
}

// ---------------------------------------------------------------------------
// Main badge (placed in jobseeker app shell)
// ---------------------------------------------------------------------------

export function ScoringProgressBadge() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const b = t.scoringProgressBadge;

  const [entries, setEntries] = useState<ScoringEntry[]>([]);
  // Track dismissed session IDs (component-local — removed from localStorage on dismiss)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Active background poll control: sessionId → abort flag (true = keep going)
  const activePollsRef = useRef<Map<string, boolean>>(new Map());

  // Sync from localStorage every 1.5 s + on custom event
  useEffect(() => {
    function sync() {
      setEntries(readScoringEntries());
    }
    sync();
    const id = setInterval(sync, 1500);
    window.addEventListener("cand:scoring-updated", sync);
    return () => {
      clearInterval(id);
      window.removeEventListener("cand:scoring-updated", sync);
    };
  }, []);

  // Background polling for SCORING entries when the result page for that session isn't open
  useEffect(() => {
    const scoringIds = new Set(
      entries.filter((e) => e.status === "SCORING").map((e) => e.sessionId)
    );

    // Deactivate polls for sessions that are no longer SCORING
    activePollsRef.current.forEach((_, id) => {
      if (!scoringIds.has(id)) activePollsRef.current.set(id, false);
    });

    for (const entry of entries) {
      if (entry.status !== "SCORING") continue;
      const { sessionId } = entry;

      // Let the result page poll itself
      const onResultPage = pathname === `/jobseeker/practice/${sessionId}/result`;
      if (onResultPage) continue;

      // Already polling
      if (activePollsRef.current.get(sessionId) === true) continue;

      activePollsRef.current.set(sessionId, true);

      const doPoll = async () => {
        if (!activePollsRef.current.get(sessionId)) {
          activePollsRef.current.delete(sessionId);
          return;
        }
        try {
          const s = await getPracticeSession(sessionId);
          if (s && s.overallScore !== null) {
            markScoringDone(sessionId);
            activePollsRef.current.delete(sessionId);
            return;
          }
        } catch { /* keep polling */ }

        if (activePollsRef.current.get(sessionId)) {
          setTimeout(doPoll, POLL_INTERVAL_MS);
        } else {
          activePollsRef.current.delete(sessionId);
        }
      };

      setTimeout(doPoll, POLL_INTERVAL_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activePollsRef.current.forEach((_, id) => activePollsRef.current.set(id, false));
    };
  }, []);

  const visible = entries.filter((e) => !dismissed.has(e.sessionId));
  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {visible.map((entry) => (
        <AnimatedBadge
          key={entry.sessionId}
          entry={entry}
          scoringTitle={b.scoring}
          scoredTitle={b.scored}
          subtitleLabel={b.subtitle}
          onClick={() => router.push(`/jobseeker/practice/${entry.sessionId}/result`)}
          onDismiss={() => {
            // Remove from localStorage and local display
            writeScoringEntries(
              readScoringEntries().filter((e) => e.sessionId !== entry.sessionId)
            );
            setDismissed((prev) => new Set([...prev, entry.sessionId]));
          }}
        />
      ))}
      <div className="flex items-center gap-1 justify-end pr-1">
        <Sparkles size={9} className="text-violet-400" />
        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">HireGen AI</span>
      </div>
    </div>
  );
}
