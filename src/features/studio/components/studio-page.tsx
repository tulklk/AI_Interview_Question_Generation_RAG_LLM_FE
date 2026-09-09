"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Clock, CreditCard, Database, MessageSquare, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { useStudio } from "@/features/studio/hooks/use-studio";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { StudioTopBar } from "@/features/studio/components/studio-top-bar";
import { StudioProgressBar } from "@/features/studio/components/studio-progress";
import { SourcesPanel } from "@/features/studio/components/sources-panel";
import { ChatPanel } from "@/features/studio/components/chat-panel";
import { StudioSettingsPanel } from "@/features/studio/components/studio-settings-panel";
import { useStudioConfig } from "@/features/studio/hooks/use-studio-config";
import { StudioActionBar } from "@/features/studio/components/studio-action-bar";
import { isPublishReady, normalizeFromJson, normalizeFromUnknown } from "@/shared/rubric";
import type { PlanOutlineItem, StudioQuestion, StudioSettings } from "@/features/studio/types/studio.types";
import { normalizeOutlineItems } from "@/features/studio/components/plan-question-preview-list";
import { PublishDialog } from "@/features/question/components/publish-dialog";
import type { PublishDialogConfirmPayload } from "@/features/question/components/publish-dialog";
import { MIN_QUESTIONS_TO_PUBLISH } from "@/features/interview/components/generate/question-builder-set-panel";
import { pollGenerationRun } from "@/features/studio/utils/poll-generation-run";

/** SCRUM-431: đã xem hướng dẫn viền vàng 2 cột (bỏ qua lần sau). */
const STUDIO_CONFIG_GUIDE_SEEN_KEY = "studio_config_guide_seen";

// localStorage can throw (private mode, quota, disabled storage) — one place to
// swallow that instead of three separate try/catch blocks with drifting fallbacks.
function isConfigGuideSeen(): boolean {
  try {
    return localStorage.getItem(STUDIO_CONFIG_GUIDE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function setConfigGuideSeen(): void {
  try {
    localStorage.setItem(STUDIO_CONFIG_GUIDE_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

function studioQuestionRubricReady(q: StudioQuestion): boolean {
  const doc = q.rubricJson?.trim()
    ? normalizeFromJson(q.rubricJson)
    : normalizeFromUnknown(q.scoringRubric);
  return isPublishReady(doc);
}

function renderBold(text: string, boldClassName: string) {
  return text.split(/<strong>(.*?)<\/strong>/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className={boldClassName}>{part}</strong>
      : part,
  );
}

export function StudioPage() {
  const studio = useStudio();
  const studioConfig = useStudioConfig({
    settings: studio.settings,
    currentPlan: studio.currentPlan,
  });

  /** Session: đã Áp dụng bước 1 → mở Live Preview. Reset khi plan mới (RAG) chưa Apply. */
  const [planConfigAppliedOnce, setPlanConfigAppliedOnce] = useState(false);
  useEffect(() => {
    const byModel = (studio.currentPlan?.generatedByModelName ?? "").trim();
    const fromSettingsApply =
      byModel === "StudioSettingsPatch" || byModel === "RAG-SettingsApply";
    setPlanConfigAppliedOnce(fromSettingsApply);
  }, [studio.currentPlan?.id, studio.currentPlan?.revision, studio.currentPlan?.generatedByModelName]);

  const outlineDirty = useMemo(() => {
    const draftItems = normalizeOutlineItems(studioConfig.draft?.outlineItems);
    const planItems = normalizeOutlineItems(studio.currentPlan?.outlineItems);
    if (draftItems.length === 0 && planItems.length === 0) return false;
    return JSON.stringify(draftItems) !== JSON.stringify(planItems);
  }, [studioConfig.draft?.outlineItems, studio.currentPlan?.outlineItems]);

  /** Cấu hình cơ bản (cột phải) + draft trên plan — chỉ PUT khi Áp dụng. */
  const displaySettings = useMemo((): StudioSettings | null => {
    if (!studio.settings) return null;
    if (!studioConfig.draft) return studio.settings;
    return { ...studio.settings, ...studioConfig.draft };
  }, [studio.settings, studioConfig.draft]);

  const { t, lang } = useLanguage();
  const { addToast } = useToast();
  const s = t.studioPage;
  const hs = t.hrSubscription;
  const router = useRouter();
  const {
    canGenerateNow,
    cooldownEndsAt,
    subscription,
    refresh: refreshSubscription,
  } = useHrSubscription();
  const [mounted, setMounted] = useState(false);
  /** SCRUM-429: câu đang regen nền (badge + chặn double-click) */
  const [regeneratingQuestionIds, setRegeneratingQuestionIds] = useState<string[]>([]);
  const regenCancelledRef = useRef(false);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  /** SCRUM-431: viền vàng hướng dẫn lần đầu — false sau khi dismiss / tạo plan / đã quen. */
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const planCollapseDoneRef = useRef(false);
  const TAB_ORDER = ["sources", "main", "settings"] as const;
  type MobileTab = typeof TAB_ORDER[number];
  const [mobileTab, setMobileTab] = useState<MobileTab>("main");
  const [tabAnimDir, setTabAnimDir] = useState<"left" | "right">("right");
  const mobileTabRef = useRef<MobileTab>("main");

  const switchMobileTab = useCallback((newTab: MobileTab) => {
    const curTab = mobileTabRef.current;
    const oldIdx = ["sources", "main", "settings"].indexOf(curTab);
    const newIdx = ["sources", "main", "settings"].indexOf(newTab);
    setTabAnimDir(newIdx >= oldIdx ? "right" : "left");
    setMobileTab(newTab);
    mobileTabRef.current = newTab;
  }, []);

  useEffect(() => {
    setMounted(true);
    regenCancelledRef.current = false;
    // SCRUM-431: hiện guide nếu chưa từng dismiss (chỉ desktop — class lg:hidden trên chip)
    setShowConfigGuide(!isConfigGuideSeen());
    return () => {
      regenCancelledRef.current = true;
    };
  }, []);

  const markConfigGuideSeen = useCallback(() => {
    setConfigGuideSeen();
    setShowConfigGuide(false);
  }, []);

  // SCRUM-431: reload khi đã có plan → thu gọn 2 cột (1 lần / mount có plan)
  useEffect(() => {
    if (!studio.currentPlan) {
      planCollapseDoneRef.current = false;
      return;
    }
    if (planCollapseDoneRef.current) return;
    planCollapseDoneRef.current = true;
    setSourcesCollapsed(true);
    setInspectorCollapsed(true);
    setShowConfigGuide(false);
  }, [studio.currentPlan]);

  // quotaBlocked gates canGenerate / canCreatePlan AND drives the dialog. canGenerateNow defaults
  // to true before any data arrives, so key off `subscription` rather than the context's `loading`
  // flag: the latter flips back to true on every refresh, which would make the dialog blink.
  const quotaBlocked = subscription !== null && !canGenerateNow;

  // A generation run is "in flight" when:
  //   (a) the while-loop inside generateQuestions() is actively polling  → isGeneratingQuestions=true
  //   (b) the page was reloaded mid-run and the bootstrap useEffect is   → generationRun.status=Generating|Pending
  //       polling via setInterval (isGeneratingQuestions stays false here)
  // Both paths must suppress the quota dialog so we never block an already-started run.
  const isRunInProgress =
    studio.isGeneratingQuestions ||
    studio.generationRun?.status === "Generating" ||
    studio.generationRun?.status === "Pending";

  // P2b: Replace-questions confirm dialog — shown when BE rejects generateQuestions with
  // QUESTIONS_ALREADY_EXIST so the user can decide before their edits are overwritten.
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  useEffect(() => {
    if (studio.questionsAlreadyExist) setReplaceDialogOpen(true);
  }, [studio.questionsAlreadyExist]);

  // Quota dialog — shown only when:
  //   (a) user explicitly triggers an action (handleNewSession / handleGenerateQuestions)
  //       while quota is already blocked, OR
  //   (b) a generation/streaming run that started in THIS session completes and the
  //       subscription refresh reveals the quota is now exhausted.
  // It is NEVER auto-shown on page load so users can still view existing work.
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);

  // hadGenerationRef is set ONLY when the user explicitly clicks "Sinh câu hỏi" in this session
  // (see handleGenerateQuestions below). Restored runs from previous sessions (bootstrap) never
  // set this flag, so the dialog does not auto-appear on page reload or after plan approval.
  const hadGenerationRef = useRef(false);

  // quotaDialogTriggeredRef — set true the first time the user clicks a generate/plan action
  // while blocked. After that, any tab re-focus while still blocked will re-open the dialog
  // so they always see it until the cooldown actually resets.
  const quotaDialogTriggeredRef = useRef(false);

  // Auto-show on page load / initial data arrival: fire once when BOTH subscription and the studio
  // bootstrap have finished. We must wait for studio.loading to become false because generationRun
  // is populated just before setLoading(false) — if we check isRunInProgress before that point we
  // see null/undefined and incorrectly treat an active run as "not in flight".
  const initialQuotaCheckRef = useRef(false);
  useEffect(() => {
    if (subscription === null) return;          // subscription still loading
    if (studio.loading) return;                 // studio bootstrap not done — generationRun unknown
    if (initialQuotaCheckRef.current) return;  // already ran
    initialQuotaCheckRef.current = true;
    if (quotaBlocked && !isRunInProgress) {
      quotaDialogTriggeredRef.current = true;
      setQuotaDialogOpen(true);
    }
  }, [subscription, studio.loading, quotaBlocked, isRunInProgress]);

  // Track the PREVIOUS value of isRunInProgress so we can detect the true→false TRANSITION
  // (generation just completed). Without this, the effect would re-fire whenever isStreaming
  // toggles (plan creation, apply-settings, chat refine, approve-plan all set isStreaming
  // true→false), causing the dialog to pop up unexpectedly after every such action.
  const prevIsRunInProgressRef = useRef(false);
  useEffect(() => {
    const wasRunning = prevIsRunInProgressRef.current;
    prevIsRunInProgressRef.current = isRunInProgress;

    // Auto-show ONLY when a generation the user started THIS session just finished (true→false)
    // AND quota is now exhausted. We deliberately exclude isStreaming from deps/condition so the
    // dialog does NOT re-fire when plan creation / apply-settings / chat / approve-plan toggle
    // isStreaming independently of the generation run.
    if (wasRunning && !isRunInProgress && hadGenerationRef.current) {
      // SCRUM-445: Free trừ lượt khi sinh câu xong — refresh để cập nhật 1/24h.
      void refreshSubscription();
      if (quotaBlocked) setQuotaDialogOpen(true);
    }
  }, [isRunInProgress, quotaBlocked, refreshSubscription]);

  // Show dialog when BE explicitly returns a quota / cooldown error for this session's generation.
  // This is the PRIMARY trigger — dialog only appears because BE said so, not from FE cache.
  useEffect(() => {
    if (!studio.quotaExceeded) return;
    quotaDialogTriggeredRef.current = true;
    setQuotaDialogOpen(true);
    // Refresh subscription so cooldownEndsAt and billing card update immediately.
    void refreshSubscription();
  }, [studio.quotaExceeded, refreshSubscription]);

  // Auto-hide the moment quota clears (user upgraded or cooldown expired)
  useEffect(() => {
    if (!quotaBlocked) setQuotaDialogOpen(false);
  }, [quotaBlocked]);

  // Escape key closes the dialog
  useEffect(() => {
    if (!quotaDialogOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setQuotaDialogOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quotaDialogOpen]);

  // Re-check the subscription when the cooldown expires and whenever the tab regains focus
  // (e.g. the user upgraded in another tab), so the dialog auto-hides if quota clears.
  // Also re-opens the dialog on focus if the user had already triggered it this session.
  useEffect(() => {
    if (!quotaBlocked) {
      // Quota just cleared — reset the trigger so the dialog doesn't reappear
      quotaDialogTriggeredRef.current = false;
      return;
    }

    const onFocus = () => {
      void refreshSubscription();
      // Re-open dialog if user had triggered it before switching tabs
      if (quotaDialogTriggeredRef.current) setQuotaDialogOpen(true);
    };
    window.addEventListener("focus", onFocus);

    const msLeft = cooldownEndsAt ? cooldownEndsAt.getTime() - Date.now() : -1;
    const timer = msLeft > 0
      ? window.setTimeout(() => void refreshSubscription(), msLeft + 1_000)
      : undefined;

    return () => {
      window.removeEventListener("focus", onFocus);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [quotaBlocked, cooldownEndsAt, refreshSubscription]);

  // Auto-switch to main tab on mobile when plan streaming starts
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (studio.isStreaming && !wasStreamingRef.current) switchMobileTab("main");
    wasStreamingRef.current = studio.isStreaming;
  }, [studio.isStreaming, switchMobileTab]);

  // Auto-switch to main tab on mobile when question generation starts
  const wasGeneratingRef = useRef(false);
  useEffect(() => {
    if (studio.isGeneratingQuestions && !wasGeneratingRef.current) switchMobileTab("main");
    wasGeneratingRef.current = studio.isGeneratingQuestions;
  }, [studio.isGeneratingQuestions, switchMobileTab]);

  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const cooldownTimeStr = cooldownEndsAt
    ? cooldownEndsAt.toLocaleString(locale)
    : "";
  // SCRUM-445: sinh câu hỏi Free trừ 1/24h — cần còn lượt.
  const canGenerate = useMemo(
    () =>
      !quotaBlocked &&
      (studio.settings?.readiness?.canGenerateQuestions ?? false),
    [quotaBlocked, studio.settings?.readiness?.canGenerateQuestions]
  );

  // SCRUM-417 / SCRUM-422: JD + position + seniority — AI config seed khi tạo plan (BE)
  const canCreatePlan = useMemo(
    () =>
      !quotaBlocked &&
      (Boolean(studio.jdSummary) || Boolean(studio.settings?.readiness?.hasJobDescription)) &&
      Boolean(studio.jdSummary?.position?.trim()) &&
      Boolean(studio.jdSummary?.detectedSeniority?.trim()),
    [
      studio.jdSummary,
      studio.settings?.readiness?.hasJobDescription,
      quotaBlocked,
    ]
  );

  // "Tạo bộ câu hỏi mới" — ALWAYS create a new (empty) session to clear existing questions.
  // After the new session loads, show the quota dialog if the account has no generation quota,
  // so the user knows immediately they can't generate yet without blocking the reset itself.
  const handleNewSession = useCallback(() => {
    // Cancel any in-flight regen-poll from the outgoing session before switching —
    // otherwise a stale poll can resolve later and overwrite the new session's
    // question list with the old project's data.
    regenCancelledRef.current = true;
    // SCRUM-431: mở lại 2 cột để cấu hình phiên mới
    setSourcesCollapsed(false);
    setInspectorCollapsed(false);
    planCollapseDoneRef.current = false;
    if (!isConfigGuideSeen()) setShowConfigGuide(true);
    void studio.createNewSession().then(() => {
      // Re-arm for the new session now that it's active.
      regenCancelledRef.current = false;
      if (quotaBlocked) setQuotaDialogOpen(true);
    });
  }, [quotaBlocked, studio]);

  /** Lưu draft settings (ngôn ngữ / advanced / …) lên BE — silent. Tránh lệch UI sau duyệt. */
  const flushConfigDraftSilent = useCallback(async (): Promise<boolean> => {
    if (!studioConfig.isDirty) {
      studioConfig.acceptServerSettings();
      return true;
    }
    const payload = studioConfig.buildApplyPayload();
    if (!payload) return true;
    const ok = await studio.applyConfiguration(payload, false);
    if (ok) studioConfig.acceptServerSettings();
    return ok;
  }, [studio, studioConfig]);

  // Wrap plan creation to immediately switch to main tab on mobile.
  // FE-side quota gate: if blocked, open the dialog immediately instead of hitting BE.
  const handleCreatePlan = useCallback(() => {
    if (quotaBlocked) {
      quotaDialogTriggeredRef.current = true;
      setQuotaDialogOpen(true);
      return;
    }
    // SCRUM-431: thu gọn 2 cột + đánh dấu đã xem hướng dẫn
    setSourcesCollapsed(true);
    setInspectorCollapsed(true);
    planCollapseDoneRef.current = true;
    markConfigGuideSeen();
    switchMobileTab("main");
    void (async () => {
      // Persist ngôn ngữ + tùy chọn nâng cao trước generate (tránh chỉ nằm ở draft FE)
      const flushed = await flushConfigDraftSilent();
      if (!flushed) return;
      await studio.generateInitialPlan();
      studioConfig.acceptServerSettings();
      void refreshSubscription();
    })();
  }, [flushConfigDraftSilent, markConfigGuideSeen, quotaBlocked, studio, switchMobileTab, studioConfig, refreshSubscription]);

  const handleApprovePlan = useCallback(() => {
    void (async () => {
      const flushed = await flushConfigDraftSilent();
      if (!flushed) return;
      await studio.approveCurrentPlan();
      studioConfig.acceptServerSettings();
    })();
  }, [flushConfigDraftSilent, studio, studioConfig]);

  const handleGenerateQuestions = useCallback(() => {
    // SCRUM-445: Free 1/24h trừ khi sinh câu thành công — chặn nếu đã hết lượt.
    if (quotaBlocked) {
      quotaDialogTriggeredRef.current = true;
      setQuotaDialogOpen(true);
      return;
    }
    hadGenerationRef.current = true;
    void studio.generateQuestions();
  }, [quotaBlocked, studio]);

  /** Bước 1: lưu settings + patch local plan → mở Live Preview. */
  const handleApplyPlanConfig = useCallback(async () => {
    const payload = studioConfig.buildApplyPayload();
    if (payload && studioConfig.isSettingsDirty) {
      const { outlineItems: _omit, ...settingsOnly } = payload as typeof payload & {
        outlineItems?: unknown;
      };
      const ok = await studio.applyConfiguration(settingsOnly);
      if (!ok) return;
    }
    await studio.applySettingsToPlan(undefined);
    setPlanConfigAppliedOnce(true);
    // Draft lấy outline mới từ plan đã patch
    studioConfig.acceptServerSettings();
  }, [studio, studioConfig]);

  /** Bước 2: Áp dụng Live Preview outline vào plan. */
  const handleApplyOutline = useCallback(async () => {
    const payload = studioConfig.buildApplyPayload() as
      | (Partial<StudioSettings> & { outlineItems?: PlanOutlineItem[] })
      | null;
    const outlineItems = normalizeOutlineItems(payload?.outlineItems ?? studio.currentPlan?.outlineItems);
    if (outlineItems.length < 5) {
      addToast("error", s.outlineMinItemsToast);
      return;
    }
    if (payload && studioConfig.isDirty) {
      const { outlineItems: _omit, ...settingsOnly } = payload;
      const ok = await studio.applyConfiguration({
        ...settingsOnly,
        numberOfQuestions: outlineItems.length,
      });
      if (!ok) return;
    }
    await studio.applySettingsToPlan(outlineItems);
    studioConfig.acceptServerSettings();
  }, [studio, studioConfig, addToast, s.outlineMinItemsToast]);

  const hasJd = Boolean(studio.jdContent?.trim()) || Boolean(studio.settings?.readiness?.hasJobDescription);
  const skillCount = studio.jdSummary?.skills?.length ?? 0;
  const readyCount = useMemo(
    () =>
      studio.questions.filter(
        (q) => Boolean(q.expectedAnswer?.trim()) && studioQuestionRubricReady(q)
      ).length,
    [studio.questions]
  );

  const requestPublish = useCallback(() => {
    if (studio.project?.isPublished) {
      void studio.togglePublish();
      return;
    }
    if (readyCount < MIN_QUESTIONS_TO_PUBLISH) {
      addToast(
        "error",
        s.publishBlockedToast
          .replace("{{ready}}", String(readyCount))
          .replace("{{total}}", String(studio.questions.length))
      );
      return;
    }
    setPublishDialogOpen(true);
  }, [addToast, readyCount, s.publishBlockedToast, studio]);

  const confirmPublish = useCallback(
    async (payload: PublishDialogConfirmPayload) => {
      setPublishing(true);
      try {
        const success = await studio.togglePublish({
          interviewQuestionIds: payload.questionIds,
          timeLimitMinutes: payload.timeLimitMinutes,
          autoRecommendEnabled: payload.autoRecommendEnabled,
          recommendationMinScore: payload.recommendationMinScore,
        });
        // Only close on success — togglePublish already toasted the error, and
        // closing on failure would silently discard the user's selection.
        if (success) setPublishDialogOpen(false);
      } finally {
        setPublishing(false);
      }
    },
    [studio]
  );

  // Settings: khóa khi có plan (giống Sources) hoặc đang busy
  const sideColumnsLocked = studio.isGeneratingQuestions || studio.questions.length > 0;
  const settingsLocked =
    sideColumnsLocked ||
    Boolean(studio.currentPlan) ||
    studio.isApplyingSettings ||
    studio.isStreaming;
  // Sources: khóa ngay sau khi đã có plan (mở lại bằng Tạo bộ mới)
  const sourcesLocked = sideColumnsLocked || Boolean(studio.currentPlan);

  // SCRUM-431: bước 1 xong khi đã có JD (upload/dán/analyze) — không bắt buộc Position/Level
  // (Position/Level vẫn cần để bấm Tạo kế hoạch; Knowledge là tùy chọn)
  const sourcesStepReady = useMemo(
    () =>
      Boolean(studio.jdContent?.trim()) ||
      Boolean(studio.settings?.readiness?.hasJobDescription) ||
      Boolean(studio.jdSummary),
    [
      studio.jdContent,
      studio.settings?.readiness?.hasJobDescription,
      studio.jdSummary,
    ]
  );

  // Viền chạy theo từng bước — tắt khi bước đó xong (không vàng cả 2 cột hoài)
  const guideBase = showConfigGuide && !studio.currentPlan && !studio.isStreaming;
  const showSourcesGuide = guideBase && !sourcesStepReady;
  const showSettingsGuide = guideBase && sourcesStepReady;

  // Quota-exceeded dialog — portal to body, flex layout masks sidebar+header.
  // Rendered outside the main tree so it also shows while the studio is still bootstrapping.
  // Dismissible via X button, backdrop click, or Escape (dialog is now user-triggered, not auto-shown).
  const quotaDialog = quotaDialogOpen && mounted
    ? createPortal(
        <div className="fixed inset-0 z-50 flex pointer-events-none">
          {/* Transparent spacer matching sidebar width (desktop) */}
          <div className="hidden lg:block w-62.5 shrink-0" aria-hidden />

          {/* Right column — mirrors the AppShell right pane */}
          <div className="flex flex-1 flex-col">
            {/* Transparent spacer matching header height */}
            <div className="h-14 shrink-0" aria-hidden />

            {/* Content area overlay — click backdrop to dismiss */}
            <div
              className="pointer-events-auto flex flex-1 items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
              onClick={() => setQuotaDialogOpen(false)}
            >
              <div
                role="alertdialog"
                aria-modal
                aria-labelledby="quota-dialog-title"
                aria-describedby="quota-dialog-desc"
                className="relative w-full max-w-md animate-scale-in rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* X close button */}
                <button
                  type="button"
                  onClick={() => setQuotaDialogOpen(false)}
                  aria-label="Đóng"
                  className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  <X size={15} />
                </button>

                <div className="px-6 pb-5 pt-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-charcoal dark:text-gray-100">
                    <Clock size={26} />
                  </div>
                  <h3
                    id="quota-dialog-title"
                    className="text-lg font-bold text-charcoal dark:text-gray-100"
                  >
                    {hs.quotaExceededTitle}
                  </h3>
                  <p
                    id="quota-dialog-desc"
                    className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400"
                  >
                    {renderBold(
                      hs.quotaExceededBody.replace("{{time}}", cooldownTimeStr),
                      "font-semibold text-gray-800 dark:text-gray-100",
                    )}
                  </p>
                </div>
                <div className="border-t border-border dark:border-gray-700 px-6 py-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => router.push("/hr/settings?tab=billing")}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
                  >
                    <CreditCard size={15} />
                    {hs.goToSubscription}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/hr/generate-question/manual")}
                    className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {t.generatePage.quota.createManuallyBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  // P2b: Replace-questions confirm dialog — backdrop portal, simpler than quota dialog.
  const replaceDialog = replaceDialogOpen && mounted
    ? createPortal(
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setReplaceDialogOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal
            aria-labelledby="replace-dialog-title"
            aria-describedby="replace-dialog-desc"
            className="relative w-full max-w-sm animate-scale-in rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setReplaceDialogOpen(false)}
              aria-label="Đóng"
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              <X size={15} />
            </button>
            <div className="px-6 pb-5 pt-6 text-center">
              <h3 id="replace-dialog-title" className="text-[15px] font-bold text-charcoal dark:text-gray-100">
                {s.toasts.replaceQuestionsTitle}
              </h3>
              <p id="replace-dialog-desc" className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {s.toasts.replaceQuestionsBody}
              </p>
            </div>
            <div className="border-t border-border dark:border-gray-700 px-6 py-4 flex gap-2">
              <button
                type="button"
                onClick={() => setReplaceDialogOpen(false)}
                className="flex-1 inline-flex min-h-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {s.toasts.replaceQuestionsCancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplaceDialogOpen(false);
                  void studio.confirmReplaceQuestions();
                }}
                className="flex-1 inline-flex min-h-9 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
              >
                {s.toasts.replaceQuestionsConfirm}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  // Both branches return a root <div> whose first child is the portal, so React reconciles the
  // dialog in place when `loading` flips — otherwise it remounts and its enter animation replays.
  if (studio.loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        {quotaDialog}
        {replaceDialog}
        <AiLoadingSpinner text={s.loading} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-16">
      {quotaDialog}
      {replaceDialog}

      {/* Top bar */}
      <div style={{ animation: "slideUpFade 0.38s ease-out both" }}>
        <StudioTopBar
          projectName={studio.project?.name}
          onNewSession={handleNewSession}
          onCreateManually={() => router.push("/hr/generate-question/manual")}
          onSaveDraft={studio.saveDraftAction}
          onShare={studio.createShare}
          isGenerating={studio.isGeneratingQuestions}
          isSaving={studio.isSavingDraft}
          isSaved={studio.isDraftSaved}
          questionCount={studio.questions.length}
          hasJd={hasJd}
        />
      </div>

      {/* Workflow stepper */}
      <div style={{ animation: "slideUpFade 0.38s ease-out 0.07s both" }}>
        <StudioProgressBar
          hasJd={hasJd}
          plan={studio.currentPlan}
          questionCount={studio.questions.length}
          isGenerating={studio.isGeneratingQuestions}
          isStreaming={studio.isStreaming}
          isApplying={studio.isApplyingSettings}
          generationRun={studio.generationRun}
        />
      </div>

      {/* ── Mobile tab switcher (< lg) ─────────────────────────── */}
      <div className="flex lg:hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1 gap-1">
        {(
          [
            { id: "sources",  icon: Database,          label: s.sourcesHeader  },
            { id: "main",     icon: MessageSquare,     label: s.steps.plan     },
            { id: "settings", icon: SlidersHorizontal, label: s.settingsHeader },
          ] as const
        ).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchMobileTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all duration-200",
              mobileTab === id
                ? "bg-primary text-white shadow-sm scale-[1.02]"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xs:inline truncate">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Workspace (3-col desktop / tab mobile) ─────────────── */}
      <div className="flex min-h-105 gap-3">

        {/* Sources panel */}
        <div
          style={{ animation: "slideInLeft 0.42s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s both" }}
          className={cn(
            "relative flex-col transition-all duration-300",
            // Mobile: show only when active tab (with slide animation)
            mobileTab === "sources" ? cn("flex w-full lg:w-auto", tabAnimDir === "right" ? "slide-tab-right" : "slide-tab-left") : "hidden",
            // Desktop: always visible, collapsible width
            "lg:flex",
            sourcesCollapsed ? "lg:w-9 lg:shrink-0" : "lg:w-75 lg:shrink-0",
            // SCRUM-431: viền vàng chạy liên tục — tắt khi bước JD xong
            showSourcesGuide && !sourcesCollapsed && "studio-guide-border-run",
          )}
        >
          {sourcesCollapsed ? (
            <button
              type="button"
              onClick={() => setSourcesCollapsed(false)}
              title={s.aria.viewSources ?? s.aria.expandSource}
              aria-label={s.aria.viewSources ?? s.aria.expandSource}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-1 py-4 text-gray-400 transition-colors hover:border-primary/30 hover:text-primary dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40 dark:hover:text-primary"
            >
              <Database className="h-4 w-4 shrink-0" />
              <span
                className="max-h-28 overflow-hidden text-[9px] font-semibold uppercase leading-tight tracking-wide"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                {s.aria.viewSources ?? s.aria.expandSource}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </button>
          ) : (
            <>
              {showSourcesGuide && (
                <div className="mb-1.5 hidden items-center justify-between gap-2 px-1 lg:flex">
                  <span
                    className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
                    title={s.guide.hint}
                  >
                    {s.guide.stepSources}
                  </span>
                  <button
                    type="button"
                    onClick={markConfigGuideSeen}
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
                  >
                    {s.guide.dismiss}
                  </button>
                </div>
              )}
              <div className="mb-2 hidden lg:flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {s.sourcesHeader}
                </span>
                <button
                  type="button"
                  onClick={() => setSourcesCollapsed(true)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label={s.aria.collapseSource}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>
              <SourcesPanel
                locked={sourcesLocked}
                jdLocked={quotaBlocked}
                jdLockedTitle={t.hrSubscription.quotaExceededTitle}
                jdContent={studio.jdContent}
                onJdChange={studio.setJdContent}
                onSaveJd={studio.saveJobDescription}
                onUploadJd={studio.uploadJobDescription}
                jdInputWarning={studio.jdInputWarning}
                onSaveMetadata={studio.saveJobDescriptionMetadata}
                onSavePosition={studio.saveJobDescriptionPosition}
                jdFileName={studio.jdFileName}
                summary={studio.jdSummary}
                documents={studio.documents}
                onUploadDocument={studio.uploadDocument}
                onAttachFromLibrary={studio.attachLibraryDocuments}
                onFetchSuggestions={studio.fetchKnowledgeSuggestions}
                onToggleDocument={studio.toggleDocument}
                projectId={studio.project?.id}
              />
            </>
          )}
        </div>

        {/* Main workspace */}
        <div
          className={cn(
            "flex-col transition-all duration-300",
            // Mobile: show only when active tab (with slide animation)
            mobileTab === "main" ? cn("flex w-full lg:w-auto", tabAnimDir === "right" ? "slide-tab-right" : "slide-tab-left") : "hidden",
            // Desktop: always visible, flex-1
            "lg:flex min-w-0 flex-1",
            studio.currentPlan && !studio.isStreaming ? "lg:self-start" : "",
          )}
          style={{ animation: "slideUpFade 0.42s cubic-bezier(0.25,0.46,0.45,0.94) 0.14s both" }}
        >
          <ChatPanel
            messages={studio.messages}
            isStreaming={studio.isStreaming}
            plan={studio.currentPlan}
            canCreatePlan={canCreatePlan && !sideColumnsLocked}
            questions={studio.questions}
            numberOfQuestions={studio.settings?.numberOfQuestions ?? 15}
            generationRun={studio.generationRun}
            isGeneratingQuestions={studio.isGeneratingQuestions}
            canGenerateQuestions={canGenerate}
            hasJd={hasJd}
            skillCount={skillCount}
            hrSkills={studio.jdSummary?.skills ?? []}
            settings={studio.settings}
            configDraft={studioConfig.draft}
            configDirty={studioConfig.isSettingsDirty}
            isConfigValidForPlan={studioConfig.isConfigValidForPlan}
            canApplyConfig={studioConfig.canApplyConfig}
            isApplyingPlanConfig={studio.isApplyingSettings || studio.isApplyingConfig}
            onConfigDraftChange={studioConfig.updateDraft}
            onApplyPlanConfig={handleApplyPlanConfig}
            onApplyOutline={handleApplyOutline}
            planConfigAppliedOnce={planConfigAppliedOnce}
            outlineDirty={outlineDirty}
            onRefreshGenerationStatus={() => void studio.refreshGenerationStatus()}
            onCreatePlan={handleCreatePlan}
            onSendMessage={studio.sendMessage}
            onApprovePlan={handleApprovePlan}
            onRenamePlanTitle={studio.renameCurrentPlanTitle}
            onRefinePlan={studio.refineCurrentPlan}
            onGenerateQuestions={handleGenerateQuestions}
            onUpdateQuestion={async (q) => {
              if (!studio.project) return;
              const api = await import("@/features/studio/services/studio.service");
              await api.updateQuestion(studio.project.id, q.id, {
                content: q.content,
                difficulty: q.difficulty,
                type: q.type,
                estimatedMinutes: 5,
                expectedAnswer: q.expectedAnswer ?? undefined,
                scoringRubric: q.scoringRubric ?? undefined,
                rubricJson: q.rubricJson ?? undefined,
              });
              studio.setQuestions((prev) =>
                prev.map((item) =>
                  item.id === q.id
                    ? {
                        ...item,
                        content: q.content,
                        expectedAnswer: q.expectedAnswer,
                        scoringRubric: q.scoringRubric,
                        rubricJson: q.rubricJson,
                      }
                    : item
                )
              );
            }}
            onDeleteQuestion={async (questionId) => {
              if (!studio.project) return;
              const api = await import("@/features/studio/services/studio.service");
              await api.deleteQuestion(studio.project.id, questionId);
              studio.setQuestions((prev) => prev.filter((item) => item.id !== questionId));
            }}
            onRegenerateQuestion={async (questionId, instruction) => {
              if (!studio.project) return;
              // SCRUM-445: regen Free tối đa 2 lần / plan — không chặn bằng túi 1/24h.
              if (regeneratingQuestionIds.includes(questionId)) {
                throw new Error(s.chat.regeneratingBadge ?? "Đang regen…");
              }
              const api = await import("@/features/studio/services/studio.service");
              const { extractErrorMessage } = await import("@/core/interceptors/error.interceptor");
              const q = studio.questions.find((item) => item.id === questionId);
              const displayN = q
                ? [...studio.questions].sort((a, b) => a.orderIndex - b.orderIndex).findIndex((item) => item.id === questionId) + 1
                : 0;
              const nLabel = displayN > 0 ? String(displayN) : "?";

              let run;
              try {
                run = await api.regenerateQuestion(studio.project.id, questionId, {
                  includeSampleAnswers: studio.settings?.includeSampleAnswers ?? true,
                  includeScoringRubric: studio.settings?.includeScoringRubric ?? true,
                  instruction: instruction ?? null,
                });
              } catch (err) {
                const { getSubscriptionErrorCode } = await import(
                  "@/features/subscription/services/subscription.service"
                );
                const code = getSubscriptionErrorCode(err);
                if (code === "COOLDOWN_ACTIVE" || code === "QUOTA_EXCEEDED") {
                  quotaDialogTriggeredRef.current = true;
                  setQuotaDialogOpen(true);
                  void refreshSubscription();
                }
                throw err instanceof Error ? err : new Error(extractErrorMessage(err, lang));
              }

              setRegeneratingQuestionIds((prev) =>
                prev.includes(questionId) ? prev : [...prev, questionId]
              );
              addToast(
                "success",
                (s.chat.regenQueuedToast ?? "Đang tạo lại câu #{{n}}…").replace("{{n}}", nLabel)
              );

              // Poll nền — không block modal
              const projectId = studio.project.id;
              const planId = studio.currentPlan?.id;
              void (async () => {
                try {
                  const pollResult = await pollGenerationRun({
                    initialRun: run,
                    getGenerationRun: () => api.getGenerationRun(projectId, run.id),
                    isCancelled: () => regenCancelledRef.current,
                  });
                  if (pollResult.cancelled) return;
                  const latest = pollResult.latest;

                  if (latest.status === "Failed") {
                    addToast(
                      "error",
                      (s.chat.regenFailedToast ?? "Tạo lại câu #{{n}} thất bại")
                        .replace("{{n}}", nLabel) +
                        (latest.errorMessage ? `: ${latest.errorMessage}` : "")
                    );
                    return;
                  }
                  if (latest.status !== "Completed") {
                    addToast(
                      "error",
                      (s.chat.regenFailedToast ?? "Tạo lại câu #{{n}} thất bại").replace(
                        "{{n}}",
                        nLabel
                      ) + " (timeout)"
                    );
                    return;
                  }
                  if (planId) {
                    const result = await api.listQuestions(projectId, {
                      page: 1,
                      pageSize: 100,
                      planId,
                    });
                    if (regenCancelledRef.current) return;
                    studio.setQuestions(result.items);
                  }
                  addToast(
                    "success",
                    (s.chat.regenDoneToast ?? "Đã tạo lại câu #{{n}}").replace("{{n}}", nLabel)
                  );
                  void refreshSubscription();
                } catch (error) {
                  if (regenCancelledRef.current) return;
                  addToast("error", extractErrorMessage(error, lang) || "Regen failed");
                } finally {
                  setRegeneratingQuestionIds((prev) => prev.filter((id) => id !== questionId));
                }
              })();
            }}
            regeneratingQuestionIds={regeneratingQuestionIds}
            onUploadQuestionImage={async (questionId, file) => {
              if (!studio.project) return;
              const api = await import("@/features/studio/services/studio.service");
              const updated = await api.uploadQuestionImage(studio.project.id, questionId, file);
              studio.setQuestions((prev) =>
                prev.map((item) =>
                  item.id === questionId
                    ? {
                        ...item,
                        imageHint: updated.imageHint ?? item.imageHint,
                        attachedImageUrl: updated.attachedImageUrl ?? null,
                        codeTemplateType: updated.codeTemplateType ?? item.codeTemplateType,
                        codeSnippet: updated.codeSnippet ?? item.codeSnippet,
                      }
                    : item
                )
              );
            }}
            onDeleteQuestionImage={async (questionId) => {
              if (!studio.project) return;
              const api = await import("@/features/studio/services/studio.service");
              const updated = await api.deleteQuestionImage(studio.project.id, questionId);
              studio.setQuestions((prev) =>
                prev.map((item) =>
                  item.id === questionId
                    ? {
                        ...item,
                        imageHint: updated.imageHint ?? item.imageHint,
                        attachedImageUrl: null,
                      }
                    : item
                )
              );
            }}
            onSaveDraft={() => void studio.saveDraftAction()}
            onPublish={requestPublish}
            onPublishBlocked={requestPublish}
            isSavingDraft={studio.isSavingDraft}
            isDraftSaved={studio.isDraftSaved}
            isPublished={studio.project?.isPublished ?? false}
          />
        </div>

        {/* Inspector / Settings panel */}
        <div
          style={{ animation: "slideInRight 0.42s cubic-bezier(0.25,0.46,0.45,0.94) 0.18s both" }}
          className={cn(
            "relative flex-col transition-all duration-300",
            // Mobile: show only when active tab (with slide animation)
            mobileTab === "settings" ? cn("flex w-full lg:w-auto", tabAnimDir === "right" ? "slide-tab-right" : "slide-tab-left") : "hidden",
            // Desktop: always visible, collapsible width
            "lg:flex",
            inspectorCollapsed ? "lg:w-9 lg:shrink-0" : "lg:w-[320px] lg:shrink-0",
            // SCRUM-431: viền chạy sau khi bước JD xong — tắt khi tạo plan / dismiss
            showSettingsGuide && !inspectorCollapsed && "studio-guide-border-run",
          )}
        >
          {inspectorCollapsed ? (
            <button
              type="button"
              onClick={() => setInspectorCollapsed(false)}
              title={s.aria.viewConfig ?? s.aria.expandSetting}
              aria-label={s.aria.viewConfig ?? s.aria.expandSetting}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-1 py-4 text-gray-400 transition-colors hover:border-primary/30 hover:text-primary dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40 dark:hover:text-primary"
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" />
              <span
                className="max-h-28 overflow-hidden text-[9px] font-semibold uppercase leading-tight tracking-wide"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                {s.aria.viewConfig ?? s.aria.expandSetting}
              </span>
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
            </button>
          ) : (
            <>
              {showSettingsGuide && (
                <div className="mb-1.5 hidden items-center justify-between gap-2 px-1 lg:flex">
                  <span
                    className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
                    title={s.guide.hint}
                  >
                    {s.guide.stepSettings}
                  </span>
                  <button
                    type="button"
                    onClick={markConfigGuideSeen}
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
                  >
                    {s.guide.dismiss}
                  </button>
                </div>
              )}
              <div className="mb-2 hidden lg:flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {s.settingsHeader}
                </span>
                <button
                  type="button"
                  onClick={() => setInspectorCollapsed(true)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label={s.aria.collapseSetting}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <StudioSettingsPanel
                locked={settingsLocked}
                settings={displaySettings}
                configDirty={studioConfig.isSettingsDirty}
                plan={studio.currentPlan}
                onChangeSetting={studioConfig.updateDraft}
              />
            </>
          )}
        </div>
      </div>

      {/* Sticky action bar */}
      <StudioActionBar
        hasJd={hasJd}
        plan={studio.currentPlan}
        questionCount={studio.questions.length}
        readyCount={readyCount}
        isStreaming={studio.isStreaming}
        isGeneratingQuestions={studio.isGeneratingQuestions}
        canCreatePlan={canCreatePlan && !sideColumnsLocked}
        configValid={studioConfig.isConfigValidForPlan && studioConfig.isApplied}
        canGenerate={canGenerate}
        skillCount={skillCount}
        isPublished={studio.project?.isPublished ?? false}
        questionSetId={studio.project?.questionSetId ?? null}
        isSavingDraft={studio.isSavingDraft}
        isDraftSaved={studio.isDraftSaved}
        onCreatePlan={handleCreatePlan}
        onApprovePlan={handleApprovePlan}
        onGenerateQuestions={handleGenerateQuestions}
        onSaveDraft={studio.saveDraftAction}
        onTogglePublish={requestPublish}
        onCopyShareLink={() => void studio.createShare()}
        onPublishBlocked={requestPublish}
      />

      {publishDialogOpen && (
        <PublishDialog
          questions={studio.questions.map((q) => ({
            id: q.id,
            preview: q.content,
            ready: Boolean(q.expectedAnswer?.trim()) && studioQuestionRubricReady(q),
          }))}
          minQuestions={MIN_QUESTIONS_TO_PUBLISH}
          saving={publishing}
          onConfirm={(payload) => void confirmPublish(payload)}
          onClose={() => {
            if (!publishing) setPublishDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}


