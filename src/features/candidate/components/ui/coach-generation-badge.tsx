"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { getCoachJob } from "@/features/candidate/services/coach.service";
import {
  COACH_JOB_EVENT,
  clearCoachJob,
  readCoachJobEntry,
  writeCoachJobEntry,
  type CoachJobEntry,
} from "@/features/candidate/utils/coach-job-storage";

const POLL_MS = 2500;
const STUCK_MS = 180_000;
const ANIM_MS = 350;

export function CoachGenerationBadge() {
  const router = useRouter();
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const [entry, setEntry] = useState<CoachJobEntry | null>(null);
  const [visible, setVisible] = useState(false);
  const [stuck, setStuck] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

  // Sync entry from localStorage
  useEffect(() => {
    const sync = () => setEntry(readCoachJobEntry());
    sync();
    window.addEventListener(COACH_JOB_EVENT, sync);
    const id = setInterval(sync, 1000);
    return () => {
      window.removeEventListener(COACH_JOB_EVENT, sync);
      clearInterval(id);
    };
  }, []);

  // Spring-in when entry appears, spring-out on clear
  useEffect(() => {
    if (entry) {
      // Small delay so the transition plays after mount
      const id = setTimeout(() => setVisible(true), 16);
      return () => clearTimeout(id);
    } else {
      setVisible(false);
    }
  }, [Boolean(entry)]);

  // Poll the real job (skip sentinel)
  useEffect(() => {
    if (!entry?.id) return;
    if (entry.id === "__pending__") return; // sentinel — no real id yet
    const initial = entry.status.toUpperCase();
    if (initial === "COMPLETED" || initial === "FAILED") return;

    startedAtRef.current = Date.now();
    setStuck(false);
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        const job = await getCoachJob(entry.id);
        if (cancelled) return;
        writeCoachJobEntry({
          id: job.id || entry.id,
          purpose: job.purpose,
          status: job.status || entry.status,
          questionSetId: job.questionSetId ?? null,
          errorMessage: job.errorMessage ?? null,
        });
        const next = (job.status || "").toUpperCase();
        if (next === "COMPLETED" || next === "FAILED") return;
      } catch {
        /* tiếp tục poll */
      }
      if (!cancelled && Date.now() - startedAtRef.current > STUCK_MS) setStuck(true);
      if (!cancelled) setTimeout(tick, POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [entry?.id]);

  if (!entry) return null;

  const status = (entry.status || "").toUpperCase();
  const isDone = status === "COMPLETED" && Boolean(entry.questionSetId);
  const isFailed = status === "FAILED";
  const isGenerating = !isDone && !isFailed;

  const iconBg = isDone
    ? "bg-emerald-500"
    : isFailed
      ? "bg-red-500"
      : "bg-violet-600";

  const title = isDone
    ? p.readyBadge
    : isFailed
      ? p.generateFailed
      : p.generatingBackground;

  const subtitle = isFailed
    ? (entry.errorMessage || p.generateFailed)
    : stuck
      ? p.stillWorking
      : p.canLeaveShort;

  function handleClick() {
    if (isDone && entry!.questionSetId) {
      router.push(`/candidate/sets/${entry!.questionSetId}`);
      clearCoachJob();
      return;
    }
    router.push("/candidate/coach");
  }

  // Renders just the card — no fixed wrapper.
  // The parent (FloatingBadgeStack in jobseeker-app-shell) owns the position.
  return (
    <div
      className={cn(
        "transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-6 scale-95 pointer-events-none"
      )}
      style={{ transitionDuration: `${ANIM_MS}ms` }}
    >
      <div
        className={cn(
          "relative flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl shadow-2xl cursor-pointer select-none",
          "bg-white dark:bg-gray-900",
          "border border-gray-100 dark:border-gray-800",
          "hover:shadow-[0_8px_30px_rgba(124,58,237,0.22)] hover:scale-[1.02]",
          "transition-[box-shadow,transform] duration-200 ease-out",
          "min-w-60 max-w-75"
        )}
        onClick={handleClick}
      >
        {/* Pulse dot — shown while generating */}
        {isGenerating && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
          </span>
        )}

        {/* Ripple on state change */}
        <div
          key={status}
          className="absolute inset-0 rounded-2xl bg-white/30 dark:bg-white/5 animate-[ping_0.4s_ease-out_1]"
          style={{ animationFillMode: "forwards" }}
        />

        {/* Icon */}
        <div
          key={`icon-${status}`}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
            iconBg
          )}
        >
          {isDone ? (
            <CheckCircle2 size={16} className="text-white" />
          ) : (
            <Loader2 size={16} className="animate-spin text-white" />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            key={`title-${status}`}
            className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate"
          >
            {title}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight truncate">
            {subtitle}
          </p>
        </div>

        <ArrowRight size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />

        {/* Dismiss — always shown */}
        <button
          type="button"
          aria-label="Đóng"
          className={cn(
            "absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center",
            "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600",
            "transition-all duration-150 hover:scale-110"
          )}
          onClick={(e) => {
            e.stopPropagation();
            clearCoachJob();
          }}
        >
          <X size={10} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
}
