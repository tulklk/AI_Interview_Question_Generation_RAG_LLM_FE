"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { extractErrorMessage } from "@/core/interceptors/error.interceptor";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { useUser } from "@/features/auth/context/user-context";
import { useCandidateSubscription } from "@/features/candidate/context/candidate-subscription-context";
import { getCv, uploadCv, CvValidationError, type CvInfo } from "@/features/candidate/services/candidate-cv.service";
import {
  acceptCoachRoadmaps,
  cancelCoachJob,
  getActiveCoachJob,
  getCoachContext,
  getCoachJob,
  getCoachReport,
  getCoachRoadmaps,
  rescoreCoachReport,
  resetCoachRun,
  startCoachRoadmap,
  startCvDiagnostic,
  startRoadmapItemDrill,
  startRoadmapReassessment,
  updateCoachContext,
  updateCoachRoadmapDraft,
  updateCoachSkills,
  canStartCoachDiagnostic,
  type CoachAssessment,
  type CoachContext,
  type CoachJob,
  type CoachRoadmap,
  type UpdateCoachContextPayload,
} from "@/features/candidate/services/coach.service";
import { registerCoachJob, writeCoachJobEntry } from "@/features/candidate/utils/coach-job-storage";
import type { CoachStepIndex } from "@/features/candidate/components/coach/coach-steps";

function apiError(e: unknown, fallback: string, lang: "en" | "vi"): string {
  const extracted = extractErrorMessage(e, lang);
  if (extracted && extracted !== "Something went wrong. Please try again.") return extracted;
  const msg = (e as { response?: { data?: { error?: string; Error?: string } } })?.response?.data;
  return msg?.error || msg?.Error || (e instanceof Error ? e.message : fallback);
}

export function jobBusy(job: CoachJob | null): boolean {
  const s = (job?.status ?? "").toUpperCase();
  return s === "QUEUED" || s === "GENERATING";
}

export function jobDone(job: CoachJob | null): boolean {
  return (job?.status ?? "").toUpperCase() === "COMPLETED" && Boolean(job?.questionSetId);
}

export function jobFailed(job: CoachJob | null): boolean {
  return (job?.status ?? "").toUpperCase() === "FAILED";
}

export function reportScored(report: CoachAssessment | null): boolean {
  if (!report) return false;
  const status = (report.status ?? "").toLowerCase();
  if (status !== "scored") return false;
  return report.skills.length > 0 || report.overallReadiness != null;
}

export function useCoachWorkflow() {
  const { t, lang } = useLanguage();
  const p = t.jobseekerCoachPage;
  const { addToast } = useToast();
  const { planType } = useCandidateSubscription();
  const { user } = useUser();
  const isPremium = planType === "PREMIUM";
  const profileSkills = user?.candidateProfile?.techStack ?? [];
  const profileHasCvFile = Boolean(user?.candidateProfile?.cvFileName);

  const [cv, setCv] = useState<CvInfo | null>(null);
  const [hasCv, setHasCv] = useState<boolean | null>(
    profileHasCvFile || profileSkills.length > 0 ? true : null
  );
  const [context, setContext] = useState<CoachContext | null>(null);
  const [report, setReport] = useState<CoachAssessment | null>(null);
  const [roadmaps, setRoadmaps] = useState<CoachRoadmap[]>([]);
  const [job, setJob] = useState<CoachJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingContext, setSavingContext] = useState(false);
  const [editingContext, setEditingContext] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [promotingNextLevel, setPromotingNextLevel] = useState(false);
  const [acceptingRoadmaps, setAcceptingRoadmaps] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<CoachStepIndex | null>(null);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreError, setRescoreError] = useState<string | null>(null);

  // Dashboard deep-link: /candidate/coach?step=1..7
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("step");
    const n = Number(raw);
    if (n >= 1 && n <= 7) setSelectedStep(n as CoachStepIndex);
  }, []);

  const refreshCompetencyData = useCallback(async () => {
    const [reportResult, roadmapsResult] = await Promise.allSettled([
      getCoachReport(),
      getCoachRoadmaps(),
    ]);
    if (reportResult.status === "fulfilled") setReport(reportResult.value);
    if (roadmapsResult.status === "fulfilled") setRoadmaps(roadmapsResult.value);
  }, []);

  useEffect(() => {
    let cancelled = false;

    getCv()
      .then((next) => {
        if (cancelled) return;
        setCv(next);
        const fromFile = Boolean(next);
        const fromSkills = Boolean(
          (next?.skills.length ?? 0) > 0 ||
            (next?.techStack.length ?? 0) > 0 ||
            profileSkills.length > 0
        );
        setHasCv(fromFile || fromSkills || profileHasCvFile);
      })
      .catch(() => {
        if (!cancelled) setHasCv(profileHasCvFile || profileSkills.length > 0);
      });

    Promise.allSettled([
      getCoachContext(),
      getActiveCoachJob(),
      getCoachReport(),
      getCoachRoadmaps(),
    ])
      .then((results) => {
        if (cancelled) return;
        const [ctxResult, jobResult, reportResult, roadmapsResult] = results;
        if (ctxResult.status === "fulfilled") {
          setContext(ctxResult.value);
          if (!ctxResult.value.contextConfirmed) setEditingContext(true);
        }
        if (jobResult.status === "fulfilled" && jobResult.value?.id) {
          setJob(jobResult.value);
          registerCoachJob(jobResult.value);
        }
        if (reportResult.status === "fulfilled") setReport(reportResult.value);
        if (roadmapsResult.status === "fulfilled") setRoadmaps(roadmapsResult.value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profileHasCvFile, profileSkills.length]);

  useEffect(() => {
    if (!job?.id || !jobBusy(job)) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const next = await getCoachJob(job.id);
        if (cancelled) return;
        setJob(next);
        registerCoachJob(next);
        if (jobBusy(next)) setTimeout(tick, 3000);
        else if (jobDone(next)) {
          addToast("success", p.readyBadge);
          // Chỉ nhảy về step 4 cho diagnostic lần đầu.
          // Drill / re-assessment: giữ Lộ trình — CTA mở bài nằm trên panel roadmap.
          const purpose = (next.purpose ?? "").toLowerCase();
          if (purpose.includes("reassess")) setSelectedStep(7);
          else if (purpose.includes("drill")) setSelectedStep(6);
          else setSelectedStep(4);
          await refreshCompetencyData();
        } else if (jobFailed(next)) {
          setError(next.errorMessage || p.generateFailed);
          writeCoachJobEntry(null);
        }
      } catch {
        if (!cancelled) setTimeout(tick, 5000);
      }
    };
    const timer = setTimeout(tick, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [job?.id, addToast, p.readyBadge, p.generateFailed, refreshCompetencyData]);

  // Quay lại tab Coach sau khi nộp bài: poll lại report/roadmap (scoring chạy lúc Complete).
  useEffect(() => {
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refreshCompetencyData();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshCompetencyData]);

  async function enqueueJob(
    start: () => Promise<CoachJob>,
    opts?: { stayOnStep?: CoachStepIndex }
  ) {
    setError(null);
    setOverlayDismissed(false);
    setSubmitting(true);
    writeCoachJobEntry({ id: "__pending__", status: "QUEUED" });
    try {
      const next = await start();
      if (!next.id) throw new Error(p.generateFailed);
      setJob(next);
      registerCoachJob(next);
      addToast("success", p.queuedStayToast);
      // Diagnostic → step 4; drill/reassess từ lộ trình → giữ step hiện tại.
      setSelectedStep(opts?.stayOnStep ?? 4);
    } catch (e) {
      writeCoachJobEntry(null);
      setError(apiError(e, p.generateFailed, lang));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveContext(payload: UpdateCoachContextPayload) {
    setSavingContext(true);
    setError(null);
    try {
      const updated = await updateCoachContext(payload);
      setContext(updated);
      setEditingContext(false);
      addToast("success", p.contextSaved);
      setSelectedStep(4);
    } catch (e) {
      setError(apiError(e, p.contextSaveFailed, lang));
    } finally {
      setSavingContext(false);
    }
  }

  /** SCRUM-463: lưu skill đã chỉnh trên Phân tích CV rồi sang Confirm Goal. */
  async function handleSaveSkills(skills: string[]) {
    if (savingSkills) return;
    setSavingSkills(true);
    setError(null);
    try {
      const updated = await updateCoachSkills(skills);
      setContext(updated);
      addToast("success", p.skillsSaved);
      setSelectedStep(3);
    } catch (e) {
      const msg = apiError(e, p.skillsSaveFailed, lang);
      setError(msg);
      addToast("error", msg);
    } finally {
      setSavingSkills(false);
    }
  }

  async function runDiagnostic() {
    if (!isPremium) {
      setUpgradeOpen(true);
      return;
    }
    if (!context?.contextConfirmed) {
      setError(p.confirmContextFirst);
      setEditingContext(true);
      setSelectedStep(3);
      return;
    }
    if (!hasCv && !context.hasCv) {
      setError(p.needCv);
      setSelectedStep(1);
      return;
    }
    if (!canStartCoachDiagnostic(context)) {
      setError(p.unsupportedRole);
      setEditingContext(true);
      setSelectedStep(3);
      return;
    }
    await enqueueJob(() => startCvDiagnostic());
  }

  /** SCRUM-461: READY → xác nhận lên level kế → PUT context + diagnostic mới. */
  async function promoteToNextLevel() {
    const next = report?.suggestedNextLevel?.trim();
    if (!next || !report?.suggestedNextLevelAvailable) {
      setError(report?.suggestedNextLevelMessage || p.nextLevelUnavailable);
      return;
    }
    if (!isPremium) {
      setUpgradeOpen(true);
      return;
    }

    const LEVELS = ["Fresher", "Junior", "Middle", "Senior"] as const;
    const rank = (level: string) => {
      const i = LEVELS.findIndex((l) => l.toLowerCase() === level.trim().toLowerCase());
      return i < 0 ? 0 : i;
    };
    const currentTarget = report.targetLevel || context?.targetLevel || "Junior";
    const self = context?.selfAssessedLevel || currentTarget;
    const selfAssessedLevel = rank(self) >= rank(currentTarget) ? self : currentTarget;

    setPromotingNextLevel(true);
    setError(null);
    try {
      const updated = await updateCoachContext({
        targetRole: context?.targetRole || undefined,
        selfAssessedLevel,
        targetLevel: next,
        yearsOfExperience: context?.yearsOfExperience ?? undefined,
      });
      setContext(updated);
      addToast("success", fillPromoteToast(p.nextLevelStarted, next));
      await enqueueJob(() => startCvDiagnostic());
    } catch (e) {
      setError(apiError(e, p.nextLevelFailed, lang));
    } finally {
      setPromotingNextLevel(false);
    }
  }

  function fillPromoteToast(template: string, next: string): string {
    return template.replace(/\{\{\s*next\s*\}\}/g, next);
  }

  async function cancelJob() {
    if (!job?.id || job.id === "__pending__" || !jobBusy(job)) return;
    setCancelling(true);
    setError(null);
    try {
      const next = await cancelCoachJob(job.id);
      setJob(next);
      writeCoachJobEntry(null);
      addToast("success", p.cancelled);
      setOverlayDismissed(true);
    } catch (e) {
      setError(apiError(e, p.generateFailed, lang));
    } finally {
      setCancelling(false);
    }
  }

  async function handleStartRoadmap(id: string) {
    try {
      const updated = await startCoachRoadmap(id);
      setRoadmaps((prev) => prev.map((r) => (r.id === id ? updated : r)));
      addToast("success", p.roadmapStarted);
      setSelectedStep(6);
    } catch (e) {
      setError(apiError(e, p.roadmapStartFailed, lang));
    }
  }

  /** SCRUM-462: toggle topic trên draft — optimistic local rồi sync PATCH. */
  async function handleUpdateDraftItem(itemId: string, isIncluded: boolean) {
    setRoadmaps((prev) =>
      prev.map((r) => ({
        ...r,
        items: r.items.map((i) => (i.id === itemId ? { ...i, isIncluded } : i)),
      }))
    );
    try {
      const next = await updateCoachRoadmapDraft([{ itemId, isIncluded }]);
      setRoadmaps(next);
    } catch (e) {
      addToast("error", apiError(e, p.roadmapDraftFailed, lang));
      await refreshCompetencyData();
    }
  }

  async function handleAcceptRoadmaps() {
    if (acceptingRoadmaps) return;
    setAcceptingRoadmaps(true);
    setError(null);
    try {
      const next = await acceptCoachRoadmaps();
      setRoadmaps(next);
      addToast("success", p.roadmapAccepted);
      setSelectedStep(6);
    } catch (e) {
      const msg = apiError(e, p.roadmapAcceptFailed, lang);
      setError(msg);
      addToast("error", msg);
    } finally {
      setAcceptingRoadmaps(false);
    }
  }

  async function handleDrillItem(roadmapId: string, itemId: string) {
    await enqueueJob(() => startRoadmapItemDrill(roadmapId, itemId), { stayOnStep: 6 });
  }

  async function handleReassessment(roadmapId: string) {
    // Giữ UI ở Lộ trình / Đánh giá lại — không kéo về step chẩn đoán.
    await enqueueJob(() => startRoadmapReassessment(roadmapId), { stayOnStep: 7 });
  }

  /** SCRUM-459: soft-reset BE + clear state FE → Confirm Goal. */
  async function startNewRun() {
    if (resetting) return;

    setResetting(true);
    setError(null);
    try {
      const next = await resetCoachRun();
      writeCoachJobEntry(null);
      setJob(null);
      setReport(null);
      setRoadmaps([]);
      setRescoring(false);
      setRescoreError(null);
      setOverlayDismissed(true);
      setContext(next);
      setEditingContext(true);
      setSelectedStep(3);
      addToast("success", p.newCoachRunDone);
    } catch (e) {
      setError(apiError(e, p.newCoachRunFailed, lang));
    } finally {
      setResetting(false);
    }
  }

  async function handleUploadCv(file: File) {
    setUploadingCv(true);
    setError(null);
    try {
      const result = await uploadCv(file);
      setCv(result.cv);
      setHasCv(true);
      const ctx = await getCoachContext().catch(() => null);
      if (ctx) setContext(ctx);
      addToast("success", result.analysisFailed ? p.cvAnalysisFailed : p.cvUploaded);
      setSelectedStep(2);
    } catch (e) {
      if (e instanceof CvValidationError) setError(e.message);
      else setError(apiError(e, p.generateFailed, lang));
    } finally {
      setUploadingCv(false);
    }
  }

  const busy = submitting || jobBusy(job);
  const ready = jobDone(job);
  const failed = jobFailed(job) || Boolean(error && !busy && !ready);
  const hasScoredReport = reportScored(report);
  const hasReadyForReassessment = roadmaps.some((r) =>
    r.items.some((i) => i.status === "ReadyForReassessment")
  );
  /** Cổng re-assessment đang mở hoặc đang làm — neo UI ở bước 7 / lộ trình. */
  const hasReassessmentPhase = roadmaps.some((r) =>
    r.items.some(
      (i) =>
        i.isReassessmentGate &&
        (i.status === "ReadyForReassessment" || i.status === "InProgress")
    )
  );
  const hasActiveRoadmap = roadmaps.some((r) => Boolean(r.acceptedAt) || r.status === "Active");
  const hasDraftRoadmap = roadmaps.some((r) => r.status === "Suggested" && !r.acceptedAt);
  const hasRoadmapStep = hasActiveRoadmap || hasDraftRoadmap || roadmaps.length > 0;
  /** Đã vào lộ trình / reassess → khóa step 1–5; chỉ chọn 6–7 (Reset mở lại). */
  const minSelectableStep: CoachStepIndex = useMemo(() => {
    if (hasDraftRoadmap || hasActiveRoadmap || hasReassessmentPhase) return 6;
    return 1;
  }, [hasDraftRoadmap, hasActiveRoadmap, hasReassessmentPhase]);

  const maxUnlockedStep: CoachStepIndex = useMemo(() => {
    const cvReady = Boolean(hasCv || context?.hasCv);
    if (!cvReady) return 1;
    if (!context?.contextConfirmed) return 3;
    const later: CoachStepIndex =
      hasReassessmentPhase || roadmaps.some((r) => r.status === "Completed")
        ? 7
        : hasScoredReport || hasRoadmapStep
          ? 6
          : rescoring
            ? 5
            : 4;
    if (busy || ready || failed) return Math.max(4, later) as CoachStepIndex;
    if (hasReassessmentPhase || roadmaps.some((r) => r.status === "Completed")) return 7;
    if (hasScoredReport || hasRoadmapStep) return 6;
    if (rescoring) return 5;
    return 4;
  }, [
    hasCv,
    context?.hasCv,
    context?.contextConfirmed,
    hasReassessmentPhase,
    hasScoredReport,
    hasRoadmapStep,
    rescoring,
    ready,
    busy,
    failed,
    roadmaps,
  ]);

  const derivedStep: CoachStepIndex = useMemo(() => {
    const cvReady = Boolean(hasCv || context?.hasCv);
    if (!cvReady) return 1;
    if (!context?.contextConfirmed) return 3;
    // Đã vào lộ trình / re-assessment → neo UI ở đó (không kéo về chẩn đoán
    // chỉ vì job cũ còn COMPLETED trong state).
    if (hasReassessmentPhase) return 7;
    if (hasDraftRoadmap || hasActiveRoadmap) return 6;
    if (hasScoredReport) return 5;
    if (rescoring) return 5;
    if (busy || ready) return 4;
    return 4;
  }, [
    hasCv,
    context?.hasCv,
    context?.contextConfirmed,
    busy,
    ready,
    hasReassessmentPhase,
    hasDraftRoadmap,
    hasActiveRoadmap,
    hasScoredReport,
    rescoring,
  ]);

  const activeStep: CoachStepIndex = selectedStep
    ? (Math.min(
        Math.max(selectedStep, minSelectableStep),
        maxUnlockedStep
      ) as CoachStepIndex)
    : derivedStep;

  function selectStep(step: CoachStepIndex) {
    if (step < minSelectableStep || step > maxUnlockedStep) return;
    setSelectedStep(step);
  }

  // Khi lộ trình xuất hiện mà đang đứng ở step sớm → kéo về min (6).
  useEffect(() => {
    if (selectedStep != null && selectedStep < minSelectableStep) {
      setSelectedStep(minSelectableStep);
    }
  }, [selectedStep, minSelectableStep]);

  useEffect(() => {
    if (loading) return;
    const wantsReport =
      selectedStep === 5 || selectedStep === 6 || selectedStep === 7;
    if (!wantsReport) return;
    if (hasScoredReport && (selectedStep !== 6 || hasRoadmapStep || roadmaps.length > 0)) {
      setRescoring(false);
      setRescoreError(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    setRescoring(true);
    setRescoreError(null);

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        if (attempts === 1 && !hasScoredReport) {
          const rescored = await rescoreCoachReport();
          if (!cancelled && rescored) {
            setReport(rescored);
            if (reportScored(rescored)) {
              setSelectedStep(selectedStep === 6 || selectedStep === 7 ? selectedStep : 5);
            }
          }
        }
        if (!cancelled) await refreshCompetencyData();
      } catch (e) {
        if (!cancelled) {
          setRescoreError(apiError(e, p.rescoreFailed, lang));
          await refreshCompetencyData();
        }
      }
      if (cancelled) return;
      // Sau refresh: nếu đã có report thì dừng; không thì poll thêm.
      // Dùng getCoachReport trực tiếp ở lần cuối để tránh stale closure.
      if (attempts < 6) {
        setTimeout(tick, 2500);
      } else {
        setRescoring(false);
        if (!cancelled) {
          const latest = await getCoachReport().catch(() => null);
          if (!reportScored(latest)) {
            setRescoreError((prev) => prev || p.rescoreFailed);
          }
        }
      }
    };
    const timer = setTimeout(tick, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    loading,
    selectedStep,
    hasScoredReport,
    hasActiveRoadmap,
    hasDraftRoadmap,
    hasRoadmapStep,
    roadmaps.length,
    refreshCompetencyData,
    lang,
    p.rescoreFailed,
  ]);

  // Khi đã có report sau poll — tắt spinner rescoring.
  useEffect(() => {
    if (hasScoredReport) {
      setRescoring(false);
      setRescoreError(null);
    }
  }, [hasScoredReport]);

  const purposeLabel =
    (job?.purpose ?? "").toLowerCase().includes("reassess")
      ? p.purposeReassessment
      : (job?.purpose ?? "").toLowerCase().includes("drill")
        ? p.purposeDrill
        : p.purposeDiagnostic;

  const diagnosticDisabled =
    (hasCv === false && !context?.hasCv) || !context?.contextConfirmed || !canStartCoachDiagnostic(context);

  return {
    p,
    lang,
    isPremium,
    cv,
    hasCv,
    context,
    report,
    roadmaps,
    job,
    loading,
    savingContext,
    editingContext,
    setEditingContext,
    upgradeOpen,
    setUpgradeOpen,
    submitting,
    cancelling,
    resetting,
    overlayDismissed,
    setOverlayDismissed,
    uploadingCv,
    promotingNextLevel,
    acceptingRoadmaps,
    savingSkills,
    error,
    setError,
    busy,
    ready,
    failed,
    hasScoredReport,
    hasReadyForReassessment,
    hasActiveRoadmap,
    hasDraftRoadmap,
    rescoring,
    rescoreError,
    maxUnlockedStep,
    minSelectableStep,
    activeStep,
    selectStep,
    purposeLabel,
    diagnosticDisabled,
    handleSaveContext,
    handleSaveSkills,
    handleUploadCv,
    runDiagnostic,
    promoteToNextLevel,
    cancelJob,
    startNewRun,
    handleStartRoadmap,
    handleUpdateDraftItem,
    handleAcceptRoadmaps,
    handleDrillItem,
    handleReassessment,
    refreshCompetencyData,
  };
}
