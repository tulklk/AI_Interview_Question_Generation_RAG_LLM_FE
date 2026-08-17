"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
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

export function CoachGenerationBadge() {
  const router = useRouter();
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const [entry, setEntry] = useState<CoachJobEntry | null>(null);
  const [stuck, setStuck] = useState(false);
  const startedAtRef = useRef<number>(Date.now());

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

  useEffect(() => {
    if (!entry?.id) return;
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

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-1">
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (isDone && entry.questionSetId) {
              router.push(`/jobseeker/sets/${entry.questionSetId}`);
              clearCoachJob();
              return;
            }
            router.push("/jobseeker/coach");
          }}
          className={cn(
            "relative flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl shadow-2xl min-w-60 max-w-75 text-left",
            "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800",
            "hover:scale-[1.02] transition-transform"
          )}
        >
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              isDone ? "bg-emerald-500" : isFailed ? "bg-red-500" : "bg-violet-600"
            )}
          >
            {isDone ? (
              <CheckCircle2 size={16} className="text-white" />
            ) : (
              <Loader2 size={16} className="animate-spin text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
              {isDone ? p.readyBadge : isFailed ? p.generateFailed : p.generatingBackground}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5 truncate">
              {isFailed
                ? entry.errorMessage || p.generateFailed
                : stuck
                  ? p.stillWorking
                  : p.canLeaveShort}
            </p>
          </div>
        </button>
        {(isDone || isFailed) && (
          <button
            type="button"
            className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
            onClick={() => clearCoachJob()}
            aria-label="Dismiss"
          >
            <X size={10} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 pr-1">
        <Sparkles size={9} className="text-violet-400" />
        <span className="text-[9px] text-gray-400 font-medium">HireGen AI</span>
      </div>
    </div>
  );
}
