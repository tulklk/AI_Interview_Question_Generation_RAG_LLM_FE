"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Clock, Sparkles, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGenerationJob } from "@/lib/api/generation";
import { useLanguage } from "@/context/language-context";

type FlowView = "form" | "polling" | "plan_review" | "question_review" | "failed" | "draft_view";

interface StatusInfo {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  pulse: boolean;
}

interface BgJobEntry {
  id: string;
  view: FlowView;
  phase: string | null;
  plan?: string | null;
}

interface BgJobState {
  id: string;
  view: FlowView;
  phase: string | null;
  dismissed: boolean;
}

const ANIM_DURATION = 350;

// ── localStorage helpers ──────────────────────────────────────────────────────

function readBgJobs(): BgJobEntry[] {
  try { return JSON.parse(localStorage.getItem("hr_gen_bg_jobs") ?? "[]"); }
  catch { return []; }
}

function writeBgJobs(jobs: BgJobEntry[]) {
  if (jobs.length === 0) localStorage.removeItem("hr_gen_bg_jobs");
  else localStorage.setItem("hr_gen_bg_jobs", JSON.stringify(jobs));
}

function readDismissedBgKeys(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem("hr_gen_badge_dismissed_bg") ?? "[]")); }
  catch { return new Set(); }
}

function writeDismissedBgKeys(keys: Set<string>) {
  if (keys.size === 0) localStorage.removeItem("hr_gen_badge_dismissed_bg");
  else localStorage.setItem("hr_gen_badge_dismissed_bg", JSON.stringify([...keys]));
}

// ── Badge card sub-component ──────────────────────────────────────────────────

interface BadgeCardProps {
  view: FlowView;
  phase: string | null;
  visible: boolean;
  status: StatusInfo;
  onDismiss: (e: React.MouseEvent) => void;
  onClick: () => void;
}

function BadgeCard({ view, visible, status, onDismiss, onClick }: BadgeCardProps) {
  return (
    <div
      className={cn(
        "transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-6 scale-95 pointer-events-none"
      )}
      style={{ transitionDuration: `${ANIM_DURATION}ms` }}
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
        onClick={onClick}
      >
        {status.pulse && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
          </span>
        )}
        <div
          key={view}
          className="absolute inset-0 rounded-2xl bg-white/30 dark:bg-white/5 animate-[ping_0.4s_ease-out_1]"
          style={{ animationFillMode: "forwards" }}
        />
        <div
          key={`icon-${view}`}
          className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300", status.iconBg)}
        >
          {status.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p key={`title-${view}`} className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
            {status.title}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight truncate">
            {status.subtitle}
          </p>
        </div>
        <ArrowRight size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
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

// ── BgBadge: per-job badge with its own mount/visible state ───────────────────

function BgBadge({
  job,
  getStatus,
  onDismiss,
  onClick,
}: {
  job: BgJobState;
  getStatus: (v: FlowView, p: string | null) => StatusInfo | null;
  onDismiss: () => void;
  onClick: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const exitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statusInfo = getStatus(job.view, job.phase);
  const shouldShow = !job.dismissed && !!statusInfo;

  useEffect(() => {
    if (exitRef.current) clearTimeout(exitRef.current);
    if (shouldShow) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      exitRef.current = setTimeout(() => setMounted(false), ANIM_DURATION);
    }
    return () => { if (exitRef.current) clearTimeout(exitRef.current); };
  }, [shouldShow]);

  if (!mounted || !statusInfo) return null;

  return (
    <BadgeCard
      view={job.view}
      phase={job.phase}
      visible={visible}
      status={statusInfo}
      onClick={onClick}
      onDismiss={(e) => { e.stopPropagation(); onDismiss(); }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GenerationProgressBadge() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const b = t.generationProgressBadge;

  const onGeneratePage = pathname === "/hr/generate" || pathname.startsWith("/hr/generate/");

  // ── Primary badge state (main job) ───────────────────────────────────────
  const [view, setView] = useState<FlowView | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // ── BG jobs state (N badges) ─────────────────────────────────────────────
  const [bgJobStates, setBgJobStates] = useState<BgJobState[]>([]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const prevViewRef = useRef<FlowView | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverPollActiveRef = useRef(false);
  const planReadyRetryRef = useRef(0);

  // Per-bg-job poll timers and retry counters
  const bgPollTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const bgRetryCountRef = useRef<Map<string, number>>(new Map());

  // ── Status info helper ────────────────────────────────────────────────────
  function getStatusInfo(v: FlowView, p: string | null): StatusInfo | null {
    switch (v) {
      case "polling":
        return p === "questions"
          ? { title: b.generatingQuestionsTitle, subtitle: b.generatingQuestionsSubtitle, icon: <Loader2 size={16} className="animate-spin text-white" />, iconBg: "bg-violet-600", pulse: true }
          : { title: b.generatingPlanTitle, subtitle: b.generatingPlanSubtitle, icon: <Loader2 size={16} className="animate-spin text-white" />, iconBg: "bg-violet-600", pulse: true };
      case "plan_review":
        return { title: b.planReviewTitle, subtitle: b.planReviewSubtitle, icon: <Clock size={16} className="text-white" />, iconBg: "bg-amber-500", pulse: false };
      case "question_review":
        return { title: b.questionsReadyTitle, subtitle: b.questionsReadySubtitle, icon: <CheckCircle2 size={16} className="text-white" />, iconBg: "bg-emerald-500", pulse: false };
      case "failed":
        return { title: b.failedTitle, subtitle: b.failedSubtitle, icon: <AlertCircle size={16} className="text-white" />, iconBg: "bg-red-500", pulse: false };
      default:
        return null;
    }
  }

  // ── BG job server polling (one timer per job) ─────────────────────────────

  function startBgPoll(jobId: string) {
    if (bgPollTimersRef.current.has(jobId)) return;

    async function doPoll() {
      try {
        const session = await getGenerationJob(jobId);
        if (!session) { bgPollTimersRef.current.delete(jobId); return; }

        if (session.isPolling) {
          bgPollTimersRef.current.set(jobId, setTimeout(doPoll, 3000));
          return;
        }

        const action = session.suggestedAction ?? "";
        const status = session.status;
        const jobs = readBgJobs();
        const idx = jobs.findIndex(j => j.id === jobId);
        if (idx === -1) { bgPollTimersRef.current.delete(jobId); return; }

        if (action === "REVIEW_QUESTIONS" || status === "COMPLETED") {
          jobs[idx] = { ...jobs[idx], view: "question_review", phase: null };
          writeBgJobs(jobs);
          bgPollTimersRef.current.delete(jobId);
          bgRetryCountRef.current.delete(jobId);
          window.dispatchEvent(new CustomEvent("hr:bg-job-updated"));
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", { detail: { jobId, newStatus: "COMPLETED" } }));
        } else if (action === "REVIEW_PLAN" || status === "PLAN_PROPOSED") {
          const retries = bgRetryCountRef.current.get(jobId) ?? 0;
          if (!session.planDraft?.role && retries < 4) {
            bgRetryCountRef.current.set(jobId, retries + 1);
            bgPollTimersRef.current.set(jobId, setTimeout(doPoll, 2000));
            return;
          }
          bgRetryCountRef.current.delete(jobId);
          const updated: BgJobEntry = { ...jobs[idx], view: "plan_review", phase: null };
          if (session.planDraft) updated.plan = JSON.stringify(session.planDraft);
          jobs[idx] = updated;
          writeBgJobs(jobs);
          bgPollTimersRef.current.delete(jobId);
          window.dispatchEvent(new CustomEvent("hr:bg-job-updated"));
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", { detail: { jobId, newStatus: "PLAN_PROPOSED" } }));
        } else if (status === "FAILED") {
          jobs[idx] = { ...jobs[idx], view: "failed", phase: null };
          writeBgJobs(jobs);
          bgPollTimersRef.current.delete(jobId);
          bgRetryCountRef.current.delete(jobId);
          window.dispatchEvent(new CustomEvent("hr:bg-job-updated"));
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", { detail: { jobId, newStatus: "FAILED" } }));
        } else {
          bgPollTimersRef.current.set(jobId, setTimeout(doPoll, 4000));
        }
      } catch {
        bgPollTimersRef.current.set(jobId, setTimeout(doPoll, 5000));
      }
    }

    bgPollTimersRef.current.set(jobId, setTimeout(doPoll, 3000));
  }

  function cleanupBgPollers(activeIds: string[]) {
    bgPollTimersRef.current.forEach((timer, id) => {
      if (!activeIds.includes(id)) {
        clearTimeout(timer);
        bgPollTimersRef.current.delete(id);
      }
    });
  }

  // ── Sync from localStorage every 800ms ───────────────────────────────────
  useEffect(() => {
    function sync() {
      // Primary: main job
      const dismissedKey = localStorage.getItem("hr_gen_badge_dismissed");
      const pJob   = localStorage.getItem("hr_gen_job");
      const pView  = localStorage.getItem("hr_gen_view");
      const pPhase = localStorage.getItem("hr_gen_polling_phase");
      const effectivePView = pView || (pJob ? "polling" : null);

      if (pJob && effectivePView && (effectivePView as FlowView) !== "form") {
        const shouldBeDismissed = dismissedKey === `${pJob}|${effectivePView}|${pPhase ?? ""}`;
        setDismissed(prev => prev === shouldBeDismissed ? prev : shouldBeDismissed);
        if ((effectivePView as FlowView) !== prevViewRef.current) prevViewRef.current = effectivePView as FlowView;
        setView(effectivePView as FlowView);
        setPhase(pPhase);
      } else {
        setDismissed(false); setView(null); setPhase(null); prevViewRef.current = null;
      }

      // BG jobs: read array
      const rawJobs = readBgJobs();
      const dismissedBgKeys = readDismissedBgKeys();

      const newBgStates: BgJobState[] = rawJobs
        .filter(j => (j.view as FlowView) !== "form")
        .map(j => ({
          id: j.id,
          view: j.view as FlowView,
          phase: j.phase ?? null,
          dismissed: dismissedBgKeys.has(`${j.id}|${j.view}|${j.phase ?? ""}`),
        }));

      setBgJobStates(prev => {
        if (JSON.stringify(prev) === JSON.stringify(newBgStates)) return prev;
        return newBgStates;
      });

      // Start polling for any bg job in polling state
      const pollingIds = rawJobs.filter(j => j.view === "polling").map(j => j.id);
      cleanupBgPollers(pollingIds);
      pollingIds.forEach(id => startBgPoll(id));
    }

    sync();
    const id = setInterval(sync, 800);
    window.addEventListener("hr:bg-job-updated", sync);
    return () => {
      clearInterval(id);
      window.removeEventListener("hr:bg-job-updated", sync);
      bgPollTimersRef.current.forEach(clearTimeout);
      bgPollTimersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGeneratePage]);

  // ── Primary mount/unmount ─────────────────────────────────────────────────
  const shouldShow = !!view && !dismissed && !!getStatusInfo(view, phase);

  useEffect(() => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (shouldShow) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      exitTimerRef.current = setTimeout(() => setMounted(false), ANIM_DURATION);
    }
    return () => { if (exitTimerRef.current) clearTimeout(exitTimerRef.current); };
  }, [shouldShow]);

  // ── Primary server poll (off generate page: polls main job) ──────────────
  useEffect(() => {
    if (view !== "polling" || onGeneratePage) {
      serverPollActiveRef.current = false;
      if (serverPollRef.current) clearTimeout(serverPollRef.current);
      return;
    }

    const jobId = localStorage.getItem("hr_gen_job");
    if (!jobId) return;

    serverPollActiveRef.current = true;
    planReadyRetryRef.current = 0;

    async function checkServer() {
      if (!serverPollActiveRef.current) return;
      try {
        const session = await getGenerationJob(jobId!);
        if (!session || !serverPollActiveRef.current) return;

        if (session.isPolling) { serverPollRef.current = setTimeout(checkServer, 3000); return; }

        const action = session.suggestedAction ?? "";
        const status = session.status;

        if (action === "REVIEW_QUESTIONS" || status === "COMPLETED") {
          localStorage.setItem("hr_gen_view", "question_review");
          localStorage.removeItem("hr_gen_polling_phase");
          setView("question_review"); setPhase(null); prevViewRef.current = "question_review";
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", { detail: { jobId, newStatus: "COMPLETED" } }));
        } else if (action === "REVIEW_PLAN" || status === "PLAN_PROPOSED") {
          if (!session.planDraft?.role && planReadyRetryRef.current < 4) {
            planReadyRetryRef.current += 1;
            serverPollRef.current = setTimeout(checkServer, 2000);
            return;
          }
          planReadyRetryRef.current = 0;
          if (session.planDraft) localStorage.setItem("hr_gen_plan", JSON.stringify(session.planDraft));
          localStorage.setItem("hr_gen_view", "plan_review");
          localStorage.removeItem("hr_gen_polling_phase");
          setView("plan_review"); setPhase(null); prevViewRef.current = "plan_review";
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", { detail: { jobId, newStatus: "PLAN_PROPOSED" } }));
        } else if (status === "FAILED") {
          localStorage.setItem("hr_gen_view", "failed");
          localStorage.removeItem("hr_gen_polling_phase");
          setView("failed"); setPhase(null);
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", { detail: { jobId, newStatus: "FAILED" } }));
        } else {
          serverPollRef.current = setTimeout(checkServer, 4000);
        }
      } catch {
        if (serverPollActiveRef.current) serverPollRef.current = setTimeout(checkServer, 5000);
      }
    }

    serverPollRef.current = setTimeout(checkServer, 3000);
    return () => { serverPollActiveRef.current = false; if (serverPollRef.current) clearTimeout(serverPollRef.current); };
  }, [view, onGeneratePage]);

  // ── Session swap: promote specific bg job into main slot ──────────────────
  function swapSessions(targetJobId: string) {
    const jobs = readBgJobs();
    const targetIdx = jobs.findIndex(j => j.id === targetJobId);
    if (targetIdx === -1) return;

    const target = jobs[targetIdx];

    // Capture main slot before overwriting
    const mainJob   = localStorage.getItem("hr_gen_job");
    const mainView  = localStorage.getItem("hr_gen_view");
    const mainPhase = localStorage.getItem("hr_gen_polling_phase");
    const mainPlan  = localStorage.getItem("hr_gen_plan");

    // Write target as new main
    localStorage.setItem("hr_gen_job",  target.id);
    localStorage.setItem("hr_gen_view", target.view || "polling");
    if (target.phase) localStorage.setItem("hr_gen_polling_phase", target.phase);
    else              localStorage.removeItem("hr_gen_polling_phase");
    if (target.plan)  localStorage.setItem("hr_gen_plan", target.plan);
    else              localStorage.removeItem("hr_gen_plan");
    localStorage.removeItem("hr_gen_jd");

    // Write old main back into the bg jobs array at the same position
    const newJobs = [...jobs];
    if (mainJob) {
      newJobs[targetIdx] = { id: mainJob, view: (mainView ?? "polling") as FlowView, phase: mainPhase ?? null, plan: mainPlan ?? null };
    } else {
      newJobs.splice(targetIdx, 1);
    }
    writeBgJobs(newJobs);

    // Clear per-slot dismissals
    localStorage.removeItem("hr_gen_badge_dismissed");
    localStorage.removeItem("hr_gen_badge_dismissed_bg");

    // Stop the bg poll timer for the promoted job (form takes over polling)
    const existing = bgPollTimersRef.current.get(targetJobId);
    if (existing) { clearTimeout(existing); bgPollTimersRef.current.delete(targetJobId); }
  }

  // ── Click / dismiss handlers ──────────────────────────────────────────────
  function handleClick() {
    if (view === "question_review") {
      const jobId = localStorage.getItem("hr_gen_job");
      if (jobId) { router.push(`/hr/history/${jobId}`); return; }
    }
    if (!onGeneratePage) router.push("/hr/generate");
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    const jobId = localStorage.getItem("hr_gen_job");
    if (jobId) {
      const v  = localStorage.getItem("hr_gen_view") || "polling";
      const ph = localStorage.getItem("hr_gen_polling_phase") ?? "";
      localStorage.setItem("hr_gen_badge_dismissed", `${jobId}|${v}|${ph}`);
    }
    setDismissed(true);
  }

  function handleBgClick(job: BgJobState) {
    if (job.view === "question_review") {
      router.push(`/hr/history/${job.id}`);
      return;
    }
    swapSessions(job.id);
    window.dispatchEvent(new CustomEvent("hr:bg-job-updated"));
    if (onGeneratePage) {
      window.dispatchEvent(new CustomEvent("hr:session-swap"));
    } else {
      router.push("/hr/generate");
    }
  }

  function handleBgDismiss(job: BgJobState) {
    const key = `${job.id}|${job.view}|${job.phase ?? ""}`;
    const existing = readDismissedBgKeys();
    existing.add(key);
    writeDismissedBgKeys(existing);
    setBgJobStates(prev => prev.map(j => j.id === job.id ? { ...j, dismissed: true } : j));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!mounted && bgJobStates.length === 0) return null;

  const primaryStatus = view ? getStatusInfo(view, phase) : null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {/* BG job badges — one per background job, shown above primary */}
      {bgJobStates.map(job => (
        <BgBadge
          key={job.id}
          job={job}
          getStatus={getStatusInfo}
          onClick={() => handleBgClick(job)}
          onDismiss={() => handleBgDismiss(job)}
        />
      ))}

      {/* Primary badge — main job */}
      {mounted && view && primaryStatus && (
        <>
          <BadgeCard
            view={view}
            phase={phase}
            visible={visible}
            status={primaryStatus}
            onClick={handleClick}
            onDismiss={handleDismiss}
          />
          <div
            className={cn(
              "flex items-center gap-1 justify-end pr-1 transition-opacity duration-300",
              visible ? "opacity-100" : "opacity-0"
            )}
          >
            <Sparkles size={9} className="text-violet-400" />
            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">HireGen AI</span>
          </div>
        </>
      )}
    </div>
  );
}
