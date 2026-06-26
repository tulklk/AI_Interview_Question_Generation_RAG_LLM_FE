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

export function GenerationProgressBadge() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const b = t.generationProgressBadge;

  const [view, setView] = useState<FlowView | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const prevViewRef = useRef<FlowView | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const serverPollActiveRef = useRef(false);
  const planReadyRetryRef = useRef(0);

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

  // ── Sync view from localStorage ───────────────────────────────────────────
  useEffect(() => {
    function sync() {
      const job = localStorage.getItem("hr_gen_job");
      const v   = localStorage.getItem("hr_gen_view") as FlowView | null;
      const p   = localStorage.getItem("hr_gen_polling_phase");
      // hr_gen_badge_dismissed persists across navigation so dismiss survives page changes
      const dismissedForJob = localStorage.getItem("hr_gen_badge_dismissed");

      if (job && v && v !== "form") {
        const shouldBeDismissed = dismissedForJob === job;
        // Use functional updater to avoid re-render when value unchanged
        setDismissed(prev => prev === shouldBeDismissed ? prev : shouldBeDismissed);
        if (v !== prevViewRef.current) {
          prevViewRef.current = v;
        }
        setView(v);
        setPhase(p);
      } else {
        setDismissed(false);
        setView(null);
        setPhase(null);
        prevViewRef.current = null;
      }
    }
    sync();
    const id = setInterval(sync, 800);
    return () => clearInterval(id);
  }, []);

  // ── Handle mount / unmount with animation ────────────────────────────────
  const onGeneratePage = pathname === "/hr/generate" || pathname.startsWith("/hr/generate/");
  const shouldShow = !onGeneratePage && !!view && !dismissed && !!getStatusInfo(view, phase);

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

  // ── Server polling when view is "polling" and off generate page ──────────
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

        if (session.isPolling) {
          serverPollRef.current = setTimeout(checkServer, 3000);
          return;
        }

        const action = session.suggestedAction ?? "";
        const status = session.status;

        if (action === "REVIEW_QUESTIONS" || status === "COMPLETED") {
          localStorage.setItem("hr_gen_view", "question_review");
          localStorage.removeItem("hr_gen_polling_phase");
          setView("question_review");
          setPhase(null);
          prevViewRef.current = "question_review";
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", {
            detail: { jobId, newStatus: "COMPLETED" },
          }));
        } else if (action === "REVIEW_PLAN" || status === "PLAN_PROPOSED") {
          if (!session.planDraft?.role && planReadyRetryRef.current < 4) {
            planReadyRetryRef.current += 1;
            serverPollRef.current = setTimeout(checkServer, 2000);
            return;
          }
          planReadyRetryRef.current = 0;
          if (session.planDraft) {
            localStorage.setItem("hr_gen_plan", JSON.stringify(session.planDraft));
          }
          localStorage.setItem("hr_gen_view", "plan_review");
          localStorage.removeItem("hr_gen_polling_phase");
          setView("plan_review");
          setPhase(null);
          prevViewRef.current = "plan_review";
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", {
            detail: { jobId, newStatus: "PLAN_PROPOSED" },
          }));
        } else if (status === "FAILED") {
          localStorage.setItem("hr_gen_view", "failed");
          localStorage.removeItem("hr_gen_polling_phase");
          setView("failed");
          setPhase(null);
          window.dispatchEvent(new CustomEvent("hr:job-status-changed", {
            detail: { jobId, newStatus: "FAILED" },
          }));
        } else {
          serverPollRef.current = setTimeout(checkServer, 4000);
        }
      } catch {
        if (serverPollActiveRef.current) {
          serverPollRef.current = setTimeout(checkServer, 5000);
        }
      }
    }

    serverPollRef.current = setTimeout(checkServer, 3000);
    return () => {
      serverPollActiveRef.current = false;
      if (serverPollRef.current) clearTimeout(serverPollRef.current);
    };
  }, [view, onGeneratePage]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!mounted || !view) return null;

  const status = getStatusInfo(view, phase);
  if (!status) return null;

  function handleClick() {
    if (view === "question_review") {
      const jobId = localStorage.getItem("hr_gen_job");
      if (jobId) { router.push(`/hr/history/${jobId}`); return; }
    }
    router.push("/hr/generate");
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    const jobId = localStorage.getItem("hr_gen_job");
    if (jobId) {
      // Persist dismissed state in localStorage so it survives page navigation
      localStorage.setItem("hr_gen_badge_dismissed", jobId);
    }
    setDismissed(true);
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-6 scale-95 pointer-events-none"
      )}
      style={{ transitionDuration: `${ANIM_DURATION}ms` }}
    >
      {/* Card */}
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
        {/* Pulse dot */}
        {status.pulse && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
          </span>
        )}

        {/* Status transition overlay */}
        <div
          key={view}
          className="absolute inset-0 rounded-2xl bg-white/30 dark:bg-white/5 animate-[ping_0.4s_ease-out_1]"
          style={{ animationFillMode: "forwards" }}
        />

        {/* Icon */}
        <div
          key={`icon-${view}`}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
            status.iconBg
          )}
        >
          {status.icon}
        </div>

        {/* Text */}
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

        {/* Arrow */}
        <ArrowRight size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />

        {/* Dismiss */}
        <button
          className={cn(
            "absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center",
            "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600",
            "transition-all duration-150 hover:scale-110"
          )}
          onClick={handleDismiss}
        >
          <X size={10} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* HireGen label */}
      <div
        className={cn(
          "flex items-center gap-1 mt-1.5 justify-end pr-1",
          "transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
      >
        <Sparkles size={9} className="text-violet-400" />
        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">HireGen AI</span>
      </div>
    </div>
  );
}
