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

const ANIM_DURATION = 350;

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
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
            status.iconBg
          )}
        >
          {status.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p
            key={`title-${view}`}
            className="text-xs font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate"
          >
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

// ── Main component ────────────────────────────────────────────────────────────

export function GenerationProgressBadge() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const b = t.generationProgressBadge;

  // Compute early so we can initialize the ref with the correct value on first mount
  const onGeneratePage = pathname === "/hr/generate" || pathname.startsWith("/hr/generate/");

  // ── Primary badge state (main job off-page / bg job on-page) ─────────────
  const [view, setView] = useState<FlowView | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // ── Secondary badge state (bg job off-page only) ──────────────────────────
  const [secView, setSecView] = useState<FlowView | null>(null);
  const [secPhase, setSecPhase] = useState<string | null>(null);
  const [secDismissed, setSecDismissed] = useState(false);
  const [secMounted, setSecMounted] = useState(false);
  const [secVisible, setSecVisible] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const prevViewRef = useRef<FlowView | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverPollActiveRef = useRef(false);
  const planReadyRetryRef = useRef(0);

  const secExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secServerPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secServerPollActiveRef = useRef(false);
  const secPlanReadyRetryRef = useRef(0);

  // ── Status info helper ────────────────────────────────────────────────────
  function getStatusInfo(v: FlowView, p: string | null): StatusInfo | null {
    switch (v) {
      case "polling":
        return p === "questions"
          ? {
              title: b.generatingQuestionsTitle,
              subtitle: b.generatingQuestionsSubtitle,
              icon: <Loader2 size={16} className="animate-spin text-white" />,
              iconBg: "bg-violet-600",
              pulse: true,
            }
          : {
              title: b.generatingPlanTitle,
              subtitle: b.generatingPlanSubtitle,
              icon: <Loader2 size={16} className="animate-spin text-white" />,
              iconBg: "bg-violet-600",
              pulse: true,
            };
      case "plan_review":
        return {
          title: b.planReviewTitle,
          subtitle: b.planReviewSubtitle,
          icon: <Clock size={16} className="text-white" />,
          iconBg: "bg-amber-500",
          pulse: false,
        };
      case "question_review":
        return {
          title: b.questionsReadyTitle,
          subtitle: b.questionsReadySubtitle,
          icon: <CheckCircle2 size={16} className="text-white" />,
          iconBg: "bg-emerald-500",
          pulse: false,
        };
      case "failed":
        return {
          title: b.failedTitle,
          subtitle: b.failedSubtitle,
          icon: <AlertCircle size={16} className="text-white" />,
          iconBg: "bg-red-500",
          pulse: false,
        };
      default:
        return null;
    }
  }

  // ── Sync both slots from localStorage every 800ms ─────────────────────────
  // onGeneratePage is in deps so sync() re-runs immediately on navigation change.
  // The "hr:bg-job-updated" event makes the badge respond instantly when
  // handleStartNewJob() promotes the current job to the bg slot.
  useEffect(() => {
    function sync() {
      const dismissedKey    = localStorage.getItem("hr_gen_badge_dismissed");
      const dismissedBgKey  = localStorage.getItem("hr_gen_badge_dismissed_bg");

      // Primary: always the main job (hr_gen_job) — shown on every page, including
      // the generate page so progress is visible while Tạo Plan / sinh câu hỏi runs.
      const pJob   = localStorage.getItem("hr_gen_job");
      const pView  = localStorage.getItem("hr_gen_view");
      const pPhase = localStorage.getItem("hr_gen_polling_phase");
      // If job exists but view key is missing (e.g. async persistence lag), fall back to "polling"
      const effectivePView = pView || (pJob ? "polling" : null);

      if (pJob && effectivePView && (effectivePView as FlowView) !== "form") {
        // Dismissal is per-stage (job + view + phase) so the badge re-appears when
        // the job advances to a new state (e.g. plan polling → question polling).
        const shouldBeDismissed = dismissedKey === `${pJob}|${effectivePView}|${pPhase ?? ""}`;
        setDismissed(prev => prev === shouldBeDismissed ? prev : shouldBeDismissed);
        if ((effectivePView as FlowView) !== prevViewRef.current) prevViewRef.current = effectivePView as FlowView;
        setView(effectivePView as FlowView);
        setPhase(pPhase);
      } else {
        setDismissed(false);
        setView(null);
        setPhase(null);
        prevViewRef.current = null;
      }

      // Secondary: always the background job (hr_gen_bg_job) — shown on every page
      const bgJob   = localStorage.getItem("hr_gen_bg_job");
      const bgView  = localStorage.getItem("hr_gen_bg_view");
      const bgPhase = localStorage.getItem("hr_gen_bg_phase");
      const effectiveBgView = bgView || (bgJob ? "polling" : null);

      if (bgJob && effectiveBgView && (effectiveBgView as FlowView) !== "form") {
        const shouldBeDismissed = dismissedBgKey === `${bgJob}|${effectiveBgView}|${bgPhase ?? ""}`;
        setSecDismissed(prev => prev === shouldBeDismissed ? prev : shouldBeDismissed);
        setSecView(effectiveBgView as FlowView);
        setSecPhase(bgPhase);
      } else {
        setSecDismissed(false);
        setSecView(null);
        setSecPhase(null);
      }
    }
    sync();
    const id = setInterval(sync, 800);
    // Respond immediately when handleStartNewJob() promotes a job to bg slot
    window.addEventListener("hr:bg-job-updated", sync);
    return () => {
      clearInterval(id);
      window.removeEventListener("hr:bg-job-updated", sync);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGeneratePage]);

  // ── Derived visibility ────────────────────────────────────────────────────

  const shouldShow    = !!view    && !dismissed    && !!getStatusInfo(view,    phase);
  const shouldShowSec = !!secView && !secDismissed && !!getStatusInfo(secView, secPhase);

  // ── Primary mount/unmount ─────────────────────────────────────────────────
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

  // ── Secondary mount/unmount ───────────────────────────────────────────────
  useEffect(() => {
    if (secExitTimerRef.current) clearTimeout(secExitTimerRef.current);
    if (shouldShowSec) {
      setSecMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setSecVisible(true)));
    } else {
      setSecVisible(false);
      secExitTimerRef.current = setTimeout(() => setSecMounted(false), ANIM_DURATION);
    }
    return () => { if (secExitTimerRef.current) clearTimeout(secExitTimerRef.current); };
  }, [shouldShowSec]);

  // ── Primary server polling ────────────────────────────────────────────────
  // Off generate page: polls main job. On generate page: polls bg job.
  useEffect(() => {
    // On the generate page the form itself polls and updates localStorage; the badge
    // just mirrors that state via sync(). Off-page (form unmounted), the badge polls.
    if (view !== "polling" || onGeneratePage) {
      serverPollActiveRef.current = false;
      if (serverPollRef.current) clearTimeout(serverPollRef.current);
      return;
    }

    const jobId = localStorage.getItem("hr_gen_job");
    if (!jobId) return;

    const viewKey  = "hr_gen_view";
    const phaseKey = "hr_gen_polling_phase";

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
          localStorage.setItem(viewKey, "question_review");
          localStorage.removeItem(phaseKey);
          setView("question_review");
          setPhase(null);
          prevViewRef.current = "question_review";
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", { detail: { jobId, newStatus: "COMPLETED" } }));
        } else if (action === "REVIEW_PLAN" || status === "PLAN_PROPOSED") {
          if (!session.planDraft?.role && planReadyRetryRef.current < 4) {
            planReadyRetryRef.current += 1;
            serverPollRef.current = setTimeout(checkServer, 2000);
            return;
          }
          planReadyRetryRef.current = 0;
          if (session.planDraft) localStorage.setItem("hr_gen_plan", JSON.stringify(session.planDraft));
          localStorage.setItem(viewKey, "plan_review");
          localStorage.removeItem(phaseKey);
          setView("plan_review");
          setPhase(null);
          prevViewRef.current = "plan_review";
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", { detail: { jobId, newStatus: "PLAN_PROPOSED" } }));
        } else if (status === "FAILED") {
          localStorage.setItem(viewKey, "failed");
          localStorage.removeItem(phaseKey);
          setView("failed");
          setPhase(null);
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

  // ── Secondary server polling (bg job when off generate page) ─────────────
  useEffect(() => {
    if (secView !== "polling") {
      secServerPollActiveRef.current = false;
      if (secServerPollRef.current) clearTimeout(secServerPollRef.current);
      return;
    }

    const bgJobId = localStorage.getItem("hr_gen_bg_job");
    if (!bgJobId) return;

    secServerPollActiveRef.current = true;
    secPlanReadyRetryRef.current = 0;

    async function checkSecServer() {
      if (!secServerPollActiveRef.current) return;
      try {
        const session = await getGenerationJob(bgJobId!);
        if (!session || !secServerPollActiveRef.current) return;

        if (session.isPolling) { secServerPollRef.current = setTimeout(checkSecServer, 3000); return; }

        const action = session.suggestedAction ?? "";
        const status = session.status;

        if (action === "REVIEW_QUESTIONS" || status === "COMPLETED") {
          localStorage.setItem("hr_gen_bg_view", "question_review");
          localStorage.removeItem("hr_gen_bg_phase");
          setSecView("question_review");
          setSecPhase(null);
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", { detail: { jobId: bgJobId, newStatus: "COMPLETED" } }));
        } else if (action === "REVIEW_PLAN" || status === "PLAN_PROPOSED") {
          if (!session.planDraft?.role && secPlanReadyRetryRef.current < 4) {
            secPlanReadyRetryRef.current += 1;
            secServerPollRef.current = setTimeout(checkSecServer, 2000);
            return;
          }
          secPlanReadyRetryRef.current = 0;
          localStorage.setItem("hr_gen_bg_view", "plan_review");
          localStorage.removeItem("hr_gen_bg_phase");
          setSecView("plan_review");
          setSecPhase(null);
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", { detail: { jobId: bgJobId, newStatus: "PLAN_PROPOSED" } }));
        } else if (status === "FAILED") {
          localStorage.setItem("hr_gen_bg_view", "failed");
          localStorage.removeItem("hr_gen_bg_phase");
          setSecView("failed");
          setSecPhase(null);
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", { detail: { jobId: bgJobId, newStatus: "FAILED" } }));
        } else {
          secServerPollRef.current = setTimeout(checkSecServer, 4000);
        }
      } catch {
        if (secServerPollActiveRef.current) secServerPollRef.current = setTimeout(checkSecServer, 5000);
      }
    }

    secServerPollRef.current = setTimeout(checkSecServer, 3000);
    return () => { secServerPollActiveRef.current = false; if (secServerPollRef.current) clearTimeout(secServerPollRef.current); };
  }, [secView]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!mounted && !secMounted) return null;

  const primaryStatus = view ? getStatusInfo(view, phase) : null;
  const secStatus     = secView ? getStatusInfo(secView, secPhase) : null;

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

  function handleSecClick() {
    if (secView === "question_review") {
      const bgJobId = localStorage.getItem("hr_gen_bg_job");
      if (bgJobId) { router.push(`/hr/history/${bgJobId}`); return; }
    }
    router.push("/hr/generate");
  }

  function handleSecDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    const bgJobId = localStorage.getItem("hr_gen_bg_job");
    if (bgJobId) {
      const v  = localStorage.getItem("hr_gen_bg_view") || "polling";
      const ph = localStorage.getItem("hr_gen_bg_phase") ?? "";
      localStorage.setItem("hr_gen_badge_dismissed_bg", `${bgJobId}|${v}|${ph}`);
    }
    setSecDismissed(true);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {/* Secondary badge — bg job (shown above primary, off generate page only) */}
      {secMounted && secView && secStatus && (
        <BadgeCard
          view={secView}
          phase={secPhase}
          visible={secVisible}
          status={secStatus}
          onClick={handleSecClick}
          onDismiss={handleSecDismiss}
        />
      )}

      {/* Primary badge — main job (or bg job on generate page) */}
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
              "flex items-center gap-1 justify-end pr-1",
              "transition-opacity duration-300",
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
