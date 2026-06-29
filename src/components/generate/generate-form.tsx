"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  BookMarked,
} from "lucide-react";
import { JdInputCard } from "./jd-input-card";
import { KbDocPicker } from "./kb-doc-picker";
import { PlanEditCard } from "./plan-edit-card";
import { ReviewQuestionsSection } from "@/components/results/review-questions-section";
import type { PlanDraft, QuestionType, GeneratedQuestion } from "@/types/generation-session";
import type { KnowledgeDocument } from "@/types/knowledge";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { isOverPlanUsageQuota } from "@/data/hr-subscription";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import {
  portalCard,
  portalHeading,
  portalSubtext,
  portalInput,
  portalMutedBg,
} from "@/lib/portal-ui";
import {
  createGenerationJob,
  getGenerationJob,
  updateJobPlan,
  approvePlan,
  retryPlan,
  retryQuestions,
  updateJobInput,
  getJobQuestions,
} from "@/lib/api/generation";

// ── Step indicator ───────────────────────────────────────────────────────────

type FlowView = "form" | "polling" | "plan_review" | "question_review" | "failed" | "draft_view";

function viewToStep(view: FlowView, pollingPhase: "plan" | "questions"): number {
  switch (view) {
    case "form":            return 1;
    case "polling":         return pollingPhase === "plan" ? 2 : 4;
    case "plan_review":     return 3;
    case "question_review": return 5;
    case "failed":          return 2;
    case "draft_view":      return 5;
    default:                return 1;
  }
}

function FlowStepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="flex items-center w-full mb-6 select-none">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const done   = stepNum < currentStep;
        const active = stepNum === currentStep;
        return (
          <div key={i} className={cn("flex items-center min-w-0", i < steps.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300",
                  done
                    ? "hr-stepper-done text-white"
                    : active
                    ? "hr-stepper-active text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                )}
              >
                {done ? <CheckCircle2 size={14} /> : stepNum}
              </div>
              <span
                className={cn(
                  "hidden sm:block text-[9px] font-medium text-center leading-tight whitespace-nowrap",
                  active
                    ? "text-[#7C3AED] dark:text-[#a78bff]"
                    : done
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400 dark:text-gray-500"
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mb-4 transition-all duration-300",
                  stepNum < currentStep
                    ? "hr-stepper-connector-done"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
                style={
                  stepNum < currentStep
                    ? ({
                        "--connector-delay": i === 0
                          ? "0s"
                          : `-${((steps.length - 1 - i) * 0.9).toFixed(1)}s`,
                      } as React.CSSProperties)
                    : undefined
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Session persistence keys ──────────────────────────────────────────────────

const SESSION_KEY       = "hr_gen_job";
const SESSION_KEY_VIEW  = "hr_gen_view";
const SESSION_KEY_PLAN  = "hr_gen_plan";
const SESSION_KEY_JD    = "hr_gen_jd";
const SESSION_KEY_PHASE = "hr_gen_polling_phase";

function readSavedView(): FlowView {
  if (typeof window === "undefined") return "form";
  const v = localStorage.getItem(SESSION_KEY_VIEW);
  return (v as FlowView) ?? "form";
}

function readSavedPlan(): PlanDraft | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY_PLAN) ?? "null"); }
  catch { return null; }
}

function clearAllSessionKeys() {
  [SESSION_KEY, SESSION_KEY_VIEW, SESSION_KEY_PLAN, SESSION_KEY_JD, SESSION_KEY_PHASE].forEach(
    (k) => localStorage.removeItem(k)
  );
}

// ── Background jobs list (for multi-job creation) ────────────────────────────
const BG_JOBS_KEY = "hr_gen_bg_jobs";

interface BgJobEntry { id: string; view: string; phase: string | null; plan?: string | null }

function readBgJobs(): BgJobEntry[] {
  try { return JSON.parse(localStorage.getItem(BG_JOBS_KEY) ?? "[]"); } catch { return []; }
}

function writeBgJobs(jobs: BgJobEntry[]) {
  if (jobs.length === 0) localStorage.removeItem(BG_JOBS_KEY);
  else localStorage.setItem(BG_JOBS_KEY, JSON.stringify(jobs));
}

function clearBgJobKeys() {
  localStorage.removeItem(BG_JOBS_KEY);
  localStorage.removeItem("hr_gen_badge_dismissed_bg");
  // Clean up legacy single-slot keys
  ["hr_gen_bg_job", "hr_gen_bg_view", "hr_gen_bg_phase", "hr_gen_bg_plan"].forEach(k => localStorage.removeItem(k));
}

// ── Main component ───────────────────────────────────────────────────────────

export function GenerateForm() {
  const { t }  = useLanguage();
  const { planId, limits, hasFeature } = useHrSubscription();

  // ── Form inputs — always default for SSR, restored from localStorage in useEffect ──
  const [view,        setView]        = useState<FlowView>("form");
  const [jdText,      setJdText]      = useState("");
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null);
  const [note,        setNote]        = useState("");

  // ── Job state ──
  const [jobId,  setJobId] = useState<string | null>(null);
  const [plan,   setPlan]  = useState<PlanDraft | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);

  // ── Polling state ──
  const [pollingPhase,   setPollingPhase]   = useState<"plan" | "questions">("plan");
  const [statusLabel,    setStatusLabel]    = useState<string>("Đang xử lý...");
  const [isApproving,    setIsApproving]    = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingActiveRef = useRef(false);
  // Track which phase we're polling so REVIEW_PLAN is ignored while waiting for questions
  const pollingPhaseRef = useRef<"plan" | "questions">("plan");

  // ── Error / recovery state ──
  const [formError,      setFormError]      = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [canRetryPlan,   setCanRetryPlan]   = useState(false);
  const [canRetryQs,     setCanRetryQs]     = useState(false);
  const [canEditInput,   setCanEditInput]   = useState(false);

  // ── Session restore state ──
  const [isRestoring, setIsRestoring] = useState(false);
  // Guard: persistence effects must not clear localStorage before restore runs
  const hasRestoredRef = useRef(false);

  const quotaBlocked     = isOverPlanUsageQuota(planId);
  const aiBlocked        = !hasFeature("aiPoweredGeneration");
  const generateDisabled = quotaBlocked || aiBlocked;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingActiveRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  // Handle session swap: badge promoted a bg job into the main slot
  useEffect(() => {
    async function handleSessionSwap() {
      pollingActiveRef.current = false;
      if (pollingRef.current) clearTimeout(pollingRef.current);

      const savedId = localStorage.getItem(SESSION_KEY);
      if (!savedId) { handleReset(); return; }

      const savedView  = readSavedView();
      const savedPlan  = readSavedPlan();
      const savedPhase = (localStorage.getItem(SESSION_KEY_PHASE) ?? "plan") as "plan" | "questions";

      setJobId(savedId);
      setJdText(localStorage.getItem(SESSION_KEY_JD) ?? "");
      setSelectedDoc(null);
      setNote("");
      setFormError(null);
      setFailureMessage(null);
      setCanRetryPlan(false);
      setCanRetryQs(false);
      setCanEditInput(false);

      if (savedView === "plan_review") {
        if (savedPlan) {
          setPlan(savedPlan);
          setView("plan_review");
        } else {
          try {
            const session = await getGenerationJob(savedId);
            setPlan(session?.planDraft ?? buildDefaultPlan());
          } catch { setPlan(buildDefaultPlan()); }
          setView("plan_review");
        }
      } else if (savedView === "polling") {
        pollingPhaseRef.current = savedPhase;
        setPollingPhase(savedPhase);
        setStatusLabel(savedPhase === "questions"
          ? t.generatePage.statusGeneratingQuestions
          : t.generatePage.statusGeneratingPlan);
        startPolling(savedId, savedPhase);
      } else if (savedView === "question_review") {
        try {
          const qs = await getJobQuestions(savedId);
          setQuestions(qs.length ? qs : []);
        } catch { /* ignore */ }
        setView("question_review");
      } else if (savedView === "failed") {
        setView("failed");
      } else {
        setView("form");
      }
    }

    window.addEventListener("hr:session-swap", handleSessionSwap);
    return () => window.removeEventListener("hr:session-swap", handleSessionSwap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist session to localStorage — skip until restore has run to avoid wiping saved data
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    if (jobId) localStorage.setItem(SESSION_KEY, jobId);
    else localStorage.removeItem(SESSION_KEY);
  }, [jobId]);

  useEffect(() => {
    if (!hasRestoredRef.current) return;
    if (jobId && view !== "form") localStorage.setItem(SESSION_KEY_VIEW, view);
    else localStorage.removeItem(SESSION_KEY_VIEW);
  }, [view, jobId]);

  useEffect(() => {
    if (!hasRestoredRef.current) return;
    if (plan) localStorage.setItem(SESSION_KEY_PLAN, JSON.stringify(plan));
    else localStorage.removeItem(SESSION_KEY_PLAN);
  }, [plan]);

  useEffect(() => {
    if (!hasRestoredRef.current) return;
    if (jdText) localStorage.setItem(SESSION_KEY_JD, jdText);
    else localStorage.removeItem(SESSION_KEY_JD);
  }, [jdText]);

  // Restore session on mount: read localStorage first (optimistic), then verify with API
  useEffect(() => {
    // Mark restore as started so persistence effects no longer clear localStorage
    hasRestoredRef.current = true;

    const savedId = localStorage.getItem(SESSION_KEY);
    if (!savedId) return;

    // Optimistic restore from localStorage — happens before API round-trip
    const savedView = readSavedView();
    const savedPlan = readSavedPlan();
    const savedJd   = localStorage.getItem(SESSION_KEY_JD) ?? "";
    const savedPhase = (localStorage.getItem(SESSION_KEY_PHASE) ?? "plan") as "plan" | "questions";

    setJobId(savedId);
    if (savedJd)               setJdText(savedJd);
    if (savedPlan)             setPlan(savedPlan);
    if (savedView !== "form")  setView(savedView);

    // If the saved view is polling, do an initial server check first.
    // The plan may already be ready (badge updated localStorage after user left),
    // so we check immediately rather than blindly starting the polling loop.
    if (savedView === "polling") {
      setPollingPhase(savedPhase);
      pollingPhaseRef.current = savedPhase;
      setStatusLabel(savedPhase === "questions" ? t.generatePage.statusGeneratingQuestions : t.generatePage.statusGeneratingPlan);
      pollingActiveRef.current = true;

      (async () => {
        try {
          const session = await getGenerationJob(savedId);
          if (!session || !pollingActiveRef.current) return;

          // BE still working — keep polling instead of showing an empty plan early
          if (session.isPolling) {
            pollJob(savedId);
            return;
          }

          const action = session.suggestedAction ?? "";
          const status = session.status;

          // Plan already ready — show review immediately with same merge logic
          if ((action === "REVIEW_PLAN" || status === "PLAN_PROPOSED") && savedPhase !== "questions") {
            pollingActiveRef.current = false;
            const localPlan = readSavedPlan();
            const serverPlan = session.planDraft;
            const merged = localPlan
              ? {
                  ...localPlan,
                  role:          localPlan.role          || serverPlan?.role          || "",
                  level:         localPlan.level         || serverPlan?.level         || "",
                  difficulty:    localPlan.difficulty    || serverPlan?.difficulty    || "",
                  questionCount: localPlan.questionCount || serverPlan?.questionCount || Math.min(10, limits.maxQuestionsPerRun),
                  questionTypes: localPlan.questionTypes?.length ? localPlan.questionTypes : (serverPlan?.questionTypes ?? ["Technical", "Behavioral"] as QuestionType[]),
                  topics:        localPlan.topics?.length        ? localPlan.topics        : (serverPlan?.topics ?? []),
                }
              : serverPlan;
            setPlan(merged ?? {
              role: "", level: "",
              questionCount: Math.min(10, limits.maxQuestionsPerRun),
              questionTypes: ["Technical", "Behavioral"] as QuestionType[],
              topics: [],
            });
            setView("plan_review");
            return;
          }

          // Questions already ready — show review immediately
          if ((action === "REVIEW_QUESTIONS" || status === "COMPLETED") && savedPhase === "questions") {
            pollingActiveRef.current = false;
            const qs = await getJobQuestions(savedId);
            setQuestions(qs.length ? qs : session.generatedQuestions ?? []);
            setView("question_review");
            return;
          }

          // Still processing — start the polling loop
          pollJob(savedId);
        } catch {
          // Network error — fall back to polling loop
          if (pollingActiveRef.current) pollJob(savedId);
        }
      })();
      return;
    }

    // If the saved view is question_review (badge updated localStorage), load questions and show immediately
    if (savedView === "question_review") {
      setIsRestoring(true);
      (async () => {
        try {
          const qs = await getJobQuestions(savedId);
          if (qs.length > 0) {
            setQuestions(qs);
            setView("question_review");
          } else {
            // Fallback to API verification
            const session = await getGenerationJob(savedId);
            if (session) {
              setQuestions(session.generatedQuestions ?? []);
              setView("question_review");
            }
          }
        } catch { /* keep current view */ }
        finally { setIsRestoring(false); }
      })();
      return;
    }

    // Then verify actual server state (silently updates if status changed)
    const hadView = savedView !== "form";
    if (!hadView) setIsRestoring(true);

    (async () => {
      try {
        const session = await getGenerationJob(savedId);
        if (!session) {
          localStorage.removeItem(SESSION_KEY);
          return;
        }

        setJobId(savedId);
        const action = session.suggestedAction ?? "";
        const status = session.status;

        // BE still working — start polling instead of showing a plan with empty fields
        if (session.isPolling) {
          startPolling(savedId, savedPhase);
          return;
        }

        if (action === "REVIEW_PLAN" || status === "PLAN_PROPOSED") {
          // Merge: keep user edits from localStorage but fill empty BE-derived fields from server
          const localPlan = readSavedPlan();
          const serverPlan = session.planDraft;
          const merged = localPlan
            ? {
                ...localPlan,
                role:          localPlan.role          || serverPlan?.role          || "",
                level:         localPlan.level         || serverPlan?.level         || "",
                difficulty:    localPlan.difficulty    || serverPlan?.difficulty    || "",
                questionCount: localPlan.questionCount || serverPlan?.questionCount || Math.min(10, limits.maxQuestionsPerRun),
                questionTypes: localPlan.questionTypes?.length ? localPlan.questionTypes : (serverPlan?.questionTypes ?? ["Technical", "Behavioral"] as QuestionType[]),
                topics:        localPlan.topics?.length        ? localPlan.topics        : (serverPlan?.topics ?? []),
              }
            : serverPlan;
          setPlan(merged ?? {
            role: "", level: "",
            questionCount: Math.min(10, limits.maxQuestionsPerRun),
            questionTypes: ["Technical", "Behavioral"] as QuestionType[],
            topics: [],
          });
          setView("plan_review");
        } else if (action === "REVIEW_QUESTIONS" || status === "COMPLETED") {
          const qs = await getJobQuestions(savedId);
          setQuestions(qs.length ? qs : session.generatedQuestions ?? []);
          setView("question_review");
        } else if (action === "VIEW_DRAFT" || status === "DRAFT") {
          setView("draft_view");
        } else if (action === "RETRY_PLAN") {
          setFailureMessage(session.failureMessage ?? t.generatePage.defaultPlanFailed);
          setCanRetryPlan(true);
          setView("failed");
        } else if (action === "RETRY_QUESTIONS") {
          setFailureMessage(session.failureMessage ?? t.generatePage.defaultQuestionsFailed);
          setCanRetryQs(true);
          setView("failed");
        } else if (action === "EDIT_INPUT") {
          setFailureMessage(session.failureMessage ?? "Có lỗi xảy ra với input.");
          setCanEditInput(true);
          setView("failed");
        } else if (status === "FAILED") {
          setFailureMessage(session.failureMessage ?? t.generatePage.defaultError);
          setCanRetryPlan(session.canRetryPlan ?? false);
          setCanRetryQs(session.canRetryQuestions ?? false);
          setCanEditInput(session.canEditInput ?? false);
          setView("failed");
        } else if (session.isPolling || ["QUEUED", "PLAN_QUEUED"].includes(status)) {
          startPolling(savedId, "plan");
        } else if (["QUESTION_QUEUED", "QUESTION_PROCESSING", "PROCESSING", "CONFIRMED"].includes(status)) {
          startPolling(savedId, "questions");
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      } finally {
        setIsRestoring(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Polling loop ──────────────────────────────────────────────────────────

  const pollJob = useCallback(async (jId: string) => {
    if (!pollingActiveRef.current) return;

    try {
      const session = await getGenerationJob(jId);
      if (!session || !pollingActiveRef.current) return;

      if (session.isPolling) {
        setStatusLabel(session.statusLabel ?? "Đang xử lý...");
        pollingRef.current = setTimeout(() => pollJob(jId), 3000);
        return;
      }

      const action = session.suggestedAction ?? "";
      const inQuestionsPhase = pollingPhaseRef.current === "questions";

      // REVIEW_PLAN: only honour when waiting for plan, not when waiting for questions
      if (action === "REVIEW_PLAN" && !inQuestionsPhase) {
        setPlan(session.planDraft ?? buildDefaultPlan());
        setView("plan_review");
        return;
      }

      if (action === "REVIEW_QUESTIONS") {
        const qs = await getJobQuestions(jId);
        setQuestions(qs.length ? qs : session.generatedQuestions ?? []);
        setView("question_review");
        return;
      }

      if (action === "EDIT_INPUT") {
        setFailureMessage(session.failureMessage ?? "Có lỗi xảy ra với input.");
        setCanEditInput(true);
        setCanRetryPlan(false);
        setCanRetryQs(false);
        setView("failed");
        return;
      }

      if (action === "RETRY_PLAN" && !inQuestionsPhase) {
        setFailureMessage(session.failureMessage ?? t.generatePage.defaultPlanFailed);
        setCanRetryPlan(true);
        setCanEditInput(false);
        setCanRetryQs(false);
        setView("failed");
        return;
      }

      if (action === "RETRY_QUESTIONS") {
        setFailureMessage(session.failureMessage ?? t.generatePage.defaultQuestionsFailed);
        setCanRetryQs(true);
        setCanRetryPlan(false);
        setCanEditInput(false);
        setView("failed");
        return;
      }

      if (action === "VIEW_DRAFT") {
        setView("draft_view");
        return;
      }

      // Fallback: inspect status when BE does not send expected suggestedAction
      const s = session.status;
      if (s === "COMPLETED") {
        const qs = await getJobQuestions(jId);
        setQuestions(qs.length ? qs : session.generatedQuestions ?? []);
        setView("question_review");
      } else if (s === "FAILED") {
        setFailureMessage(session.failureMessage ?? t.generatePage.defaultError);
        setCanRetryPlan(session.canRetryPlan ?? false);
        setCanRetryQs(session.canRetryQuestions ?? false);
        setCanEditInput(session.canEditInput ?? false);
        setView("failed");
      } else if (s === "PLAN_PROPOSED" && !inQuestionsPhase) {
        setPlan(session.planDraft ?? buildDefaultPlan());
        setView("plan_review");
      } else {
        // Still processing — keep polling
        pollingRef.current = setTimeout(() => pollJob(jId), 3000);
      }
    } catch {
      if (pollingActiveRef.current) {
        pollingRef.current = setTimeout(() => pollJob(jId), 5000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPolling(jId: string, phase: "plan" | "questions") {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    pollingActiveRef.current = true;
    pollingPhaseRef.current = phase;
    setPollingPhase(phase);
    setView("polling");
    localStorage.setItem(SESSION_KEY_PHASE, phase);
    pollJob(jId);
  }

  // ── Step 1: Submit form ───────────────────────────────────────────────────

  function buildDefaultPlan(): PlanDraft {
    return {
      role:          "",
      level:         "",
      questionCount: Math.min(10, limits.maxQuestionsPerRun),
      questionTypes: ["Technical", "Behavioral"] as QuestionType[],
      topics:        [],
      constraints:   note || undefined,
    };
  }

  async function handleSubmitForm() {
    if (!jdText.trim()) {
      setFormError("Vui lòng nhập mô tả công việc.");
      return;
    }
    const wordCount = jdText.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 100) {
      setFormError(`Mô tả công việc cần ít nhất 100 từ (hiện tại: ${wordCount} từ).`);
      return;
    }

    setFormError(null);
    setStatusLabel("Đang tạo job...");

    let jId: string | null = null;
    try {
      jId = await createGenerationJob({
        jobDescription:    jdText               || undefined,
        hrNote:            note                 || undefined,
        numberOfQuestions: Math.min(10, limits.maxQuestionsPerRun),
        difficulty:        "medium",
        questionTypes:     ["technical", "behavioral"],
        ...(selectedDoc ? { knowledgeDocumentId: selectedDoc.id } : {}),
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không thể tạo job. Vui lòng kiểm tra lại nội dung JD và thử lại.");
      return;
    }

    if (!jId) {
      setFormError("Không thể tạo job. Vui lòng kiểm tra lại nội dung JD và thử lại.");
      return;
    }

    setJobId(jId);
    startPolling(jId, "plan");
  }

  // ── Step 3: Approve plan ──────────────────────────────────────────────────

  async function handleApprovePlan() {
    if (!jobId || !plan) return;
    setIsApproving(true);
    setFormError(null);

    try {
      // Push edited plan fields to BE first
      // level = difficulty (easy/medium/hard), experienceLevel = experience (intern/junior/mid...)
      const experienceLevelBE = plan.level
        ? plan.level.toLowerCase().replace("-level", "").replace("-", "")
        : "mid";
      await updateJobPlan(jobId, {
        roleTitle:       plan.role,
        totalQuestions:  plan.questionCount,
        questionTypes:   plan.questionTypes,
        skills:          plan.topics,
        notes:           plan.constraints ?? "",
        level:           plan.difficulty?.toLowerCase() ?? "medium",
        experienceLevel: experienceLevelBE,
      });
      await approvePlan(jobId);
      startPolling(jobId, "questions");
    } catch {
      setFormError("Không thể approve plan. Vui lòng thử lại.");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleRetryPlanFromReview() {
    if (!jobId) return;
    const ok = await retryPlan(jobId);
    if (ok) {
      startPolling(jobId, "plan");
    } else {
      setFormError("Không thể retry plan. Vui lòng thử lại.");
    }
  }

  // ── Recovery from failed state ────────────────────────────────────────────

  async function handleRetryPlanFromFailed() {
    if (!jobId) return;
    setFormError(null);
    const ok = await retryPlan(jobId);
    if (ok) startPolling(jobId, "plan");
    else setFormError(t.generatePage.retryFailed);
  }

  async function handleRetryQuestionsFromFailed() {
    if (!jobId) return;
    setFormError(null);
    const ok = await retryQuestions(jobId);
    if (ok) startPolling(jobId, "questions");
    else setFormError(t.generatePage.retryFailed);
  }

  async function handleEditInputResubmit() {
    if (!jobId) return;
    if (!jdText.trim()) {
      setFormError("Vui lòng nhập JD.");
      return;
    }
    setFormError(null);
    const ok = await updateJobInput(jobId, {
      jobDescription: jdText || undefined,
      hrNote:         note   || undefined,
    });
    if (ok) startPolling(jobId, "plan");
    else setFormError("Cập nhật input thất bại.");
  }

  function handleStartNewJob() {
    if (jobId) {
      const existing = readBgJobs().filter(e => e.id !== jobId);
      writeBgJobs([...existing, { id: jobId, view, phase: pollingPhaseRef.current ?? null, plan: null }]);
      localStorage.removeItem("hr_gen_badge_dismissed");
      window.dispatchEvent(new CustomEvent("hr:bg-job-updated"));
    }
    pollingActiveRef.current = false;
    if (pollingRef.current) clearTimeout(pollingRef.current);
    clearAllSessionKeys();
    setView("form");
    setJobId(null);
    setPlan(null);
    setQuestions([]);
    setFormError(null);
    setFailureMessage(null);
    setStatusLabel("Đang xử lý...");
    setCanRetryPlan(false);
    setCanRetryQs(false);
    setCanEditInput(false);
    setJdText("");
    setNote("");
    setSelectedDoc(null);
  }

  function handleReset() {
    pollingActiveRef.current = false;
    if (pollingRef.current) clearTimeout(pollingRef.current);
    clearAllSessionKeys();
    clearBgJobKeys();
    setView("form");
    setJdText("");
    setSelectedDoc(null);
    setNote("");
    setJobId(null);
    setPlan(null);
    setQuestions([]);
    setFormError(null);
    setFailureMessage(null);
    setIsApproving(false);
    setCanRetryPlan(false);
    setCanRetryQs(false);
    setCanEditInput(false);
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const currentStep = viewToStep(view, pollingPhase);

  // ── Render: Restoring session ─────────────────────────────────────────────

  if (isRestoring) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 size={28} className="text-[#7C3AED] dark:text-[#a78bff] animate-spin" />
        <p className={cn("text-sm", portalSubtext)}>Đang khôi phục phiên làm việc…</p>
      </div>
    );
  }

  // ── Render: Polling ───────────────────────────────────────────────────────

  if (view === "polling") {
    return (
      <div className="space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={currentStep} steps={t.generatePage.flowSteps} />
        <div className="hr-glass-card p-12 flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-2xl hr-loader-box flex items-center justify-center">
            <Sparkles size={26} className="text-[#7C3AED] dark:text-[#a78bff] animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className={cn("text-base font-semibold", portalHeading)}>
              {pollingPhase === "plan"
                ? t.generatePage.pollingPlanTitle
                : t.generatePage.pollingQuestionsTitle}
            </p>
            <p className={cn("text-sm", portalSubtext)}>{statusLabel}</p>
          </div>
          <Loader2 size={22} className="text-[#7C3AED] dark:text-[#a78bff] animate-spin" />
          <button
            type="button"
            onClick={handleStartNewJob}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
          >
            <Plus size={14} />
            {t.generatePage.startNewJobBtn}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Plan Review ───────────────────────────────────────────────────

  if (view === "plan_review" && plan) {
    return (
      <div className="space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={currentStep} steps={t.generatePage.flowSteps} />

        {formError && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {formError}
          </div>
        )}

        <PlanEditCard
          plan={plan}
          isApproving={isApproving}
          onPlanChange={setPlan}
          onApprove={handleApprovePlan}
          onRetryPlan={handleRetryPlanFromReview}
          onBack={() => setView("form")}
        />
      </div>
    );
  }

  // ── Render: Question Review ───────────────────────────────────────────────

  if (view === "question_review" && jobId) {
    return (
      <div className="space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={currentStep} steps={t.generatePage.flowSteps} />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <div>
            <h2 className={cn("text-base font-semibold", portalHeading)}>
              {questions.length} câu hỏi đã được tạo
            </h2>
            <p className={cn("text-xs", portalSubtext)}>
              Review và chỉnh sửa trước khi lưu bản nháp
            </p>
          </div>
        </div>

        <ReviewQuestionsSection
          sessionId={jobId}
          initialQuestions={questions}
          status="COMPLETED"
        />

        <button
          type="button"
          onClick={handleReset}
          className={cn(
            "w-full py-2.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
            portalHeading
          )}
        >
          Tạo bộ câu hỏi mới
        </button>
      </div>
    );
  }

  // ── Render: Failed ────────────────────────────────────────────────────────

  if (view === "failed") {
    return (
      <div className="space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={currentStep} steps={t.generatePage.flowSteps} />

        <div className="hr-glass-card p-8 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className={cn("text-base font-semibold", portalHeading)}>
                Đã xảy ra lỗi
              </p>
              {failureMessage && (
                <p className={cn("text-sm mt-1", portalSubtext)}>{failureMessage}</p>
              )}
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {formError}
            </div>
          )}

          {canEditInput && (
            <div className="space-y-3 border-t pt-4">
              <p className={cn("text-sm font-medium", portalHeading)}>
                {t.generatePage.editJdRetry}
              </p>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={6}
                className={cn(
                  "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
                  portalInput
                )}
              />
              <button
                type="button"
                onClick={handleEditInputResubmit}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-[#5535dd] transition-colors"
              >
                <RotateCcw size={14} />
                Gửi lại
              </button>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {canRetryPlan && (
              <button
                type="button"
                onClick={handleRetryPlanFromFailed}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
              >
                <RotateCcw size={14} />
                {t.generatePage.retryPlanBtn}
              </button>
            )}
            {canRetryQs && (
              <button
                type="button"
                onClick={handleRetryQuestionsFromFailed}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-[#5535dd] transition-colors"
              >
                <RotateCcw size={14} />
                {t.generatePage.retryQuestionsBtn}
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                portalHeading
              )}
            >
              Bắt đầu lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Draft View ────────────────────────────────────────────────────

  if (view === "draft_view") {
    return (
      <div className="space-y-4 animate-fade-up">
        <FlowStepIndicator currentStep={5} steps={t.generatePage.flowSteps} />
        <div className="hr-glass-card p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
            <BookMarked size={22} className="text-emerald-500" />
          </div>
          <p className={cn("text-base font-semibold", portalHeading)}>
            Bản nháp đã được lưu
          </p>
          <p className={cn("text-sm", portalSubtext)}>
            Câu hỏi đã lưu vào lịch sử. Bạn có thể xem lại ở trang History.
          </p>
          <div className="flex gap-3">
            <Link
              href="/hr/history"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-[#5535dd] transition-colors"
            >
              Xem History
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                portalHeading
              )}
            >
              Tạo mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Form (Step 1) ─────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <FlowStepIndicator currentStep={1} steps={t.generatePage.flowSteps} />

      {aiBlocked && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/90 dark:bg-indigo-950/40 px-4 py-3 text-sm text-indigo-950 dark:text-indigo-200 animate-fade-up">
          <p className="font-semibold mb-1">{t.generatePage.noAiPlan.title}</p>
          <p className="mb-2">{t.generatePage.noAiPlan.body}</p>
          <Link href="/hr/settings#billing" className="inline-flex font-semibold text-primary hover:underline">
            {t.generatePage.noAiPlan.goToPlans}
          </Link>
        </div>
      )}

      {quotaBlocked && !aiBlocked && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-200 animate-fade-up">
          <p className="font-semibold mb-1">{t.generatePage.quota.exceededTitle}</p>
          <p className="mb-2">{t.generatePage.quota.exceededBody}</p>
          <Link href="/hr/settings#billing" className="inline-flex font-semibold text-primary hover:underline">
            {t.generatePage.quota.goToBilling}
          </Link>
        </div>
      )}

      {formError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400 animate-fade-up">
          {formError}
        </div>
      )}

      <div className="animate-fade-up">
        <JdInputCard value={jdText} onChange={setJdText} />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <KbDocPicker selectedDocId={selectedDoc?.id ?? null} onSelect={setSelectedDoc} />
      </div>

      <div
        className="hr-glass-card p-6 space-y-2 animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-base font-semibold", portalHeading)}>{t.generatePage.aiNoteSection.title}</span>
          <span className={cn("text-xs", portalSubtext)}>{t.generatePage.aiNoteSection.optional}</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.generatePage.aiNoteSection.placeholder}
          rows={3}
          className={cn(
            "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
            portalInput
          )}
        />
      </div>

      {(() => {
        const MIN_CHARS = 400;
        const trimmed = jdText.trim();
        const charCount = trimmed.length;
        const tooShort = charCount > 0 && charCount < MIN_CHARS;
        const remaining = MIN_CHARS - charCount;
        const jdValid = charCount >= MIN_CHARS;
        const submitDisabled = generateDisabled || !jdValid;
        return (
          <>
            {tooShort && (
              <p className="text-xs text-orange-500 font-medium -mt-1 animate-fade-up" style={{ animationDelay: "160ms" }}>
                {t.generatePage.jdInput.needMoreChars.replace("{{n}}", String(remaining))}
              </p>
            )}
            {!trimmed && (
              <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1" style={{ animationDelay: "160ms" }}>
                {t.generatePage.jdInput.minCharsHint}
              </p>
            )}
            <button
              type="button"
              onClick={handleSubmitForm}
              disabled={submitDisabled}
              title={tooShort ? `Cần thêm ${remaining} ký tự nữa` : undefined}
              className={cn(
                "shimmer-button w-full flex items-center justify-center gap-2 font-semibold text-sm px-6 py-3.5 rounded-xl transition-all animate-fade-up text-white",
                !submitDisabled && "hr-cta-btn",
                submitDisabled && "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none"
              )}
              style={{ animationDelay: "180ms" }}
            >
              <Sparkles size={15} />
              {t.generatePage.createPlanBtn}
            </button>
          </>
        );
      })()}
    </div>
  );
}

// ── Inline question card ──────────────────────────────────────────────────────

export function GeneratedQuestionCard({
  question,
  index,
}: {
  question: GeneratedQuestion;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const diffColor =
    question.difficulty === "Hard"
      ? "text-red-600 bg-red-50 dark:bg-red-950/30"
      : question.difficulty === "Easy"
      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
      : "text-amber-600 bg-amber-50 dark:bg-amber-950/30";

  const hasDetails = question.rationale || question.sampleAnswer;

  return (
    <div className={cn(portalCard, "p-4 space-y-2 shadow-sm")}>
      <div className="flex items-start gap-3">
        <span className={cn("text-xs font-bold mt-0.5 shrink-0 w-6 text-right", portalSubtext)}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
              {question.questionType}
            </span>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", diffColor)}>
              {question.difficulty}
            </span>
          </div>
          <p className={cn("text-sm font-medium leading-relaxed", portalHeading)}>
            {question.question}
          </p>
        </div>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              portalSubtext
            )}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>

      {expanded && hasDetails && (
        <div className={cn("ml-9 space-y-2 border-t pt-2 rounded-lg p-3", portalMutedBg, "bg-transparent")}>
          {question.rationale && (
            <div>
              <p className={cn("text-xs font-semibold mb-0.5", portalSubtext)}>Lý do</p>
              <p className={cn("text-sm leading-relaxed", portalHeading)}>{question.rationale}</p>
            </div>
          )}
          {question.sampleAnswer && (
            <div>
              <p className={cn("text-xs font-semibold mb-0.5", portalSubtext)}>Câu trả lời mẫu</p>
              <p className={cn("text-sm leading-relaxed", portalHeading)}>{question.sampleAnswer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
