"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Clock, CreditCard, Database, MessageSquare, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useStudio } from "@/features/studio/hooks/use-studio";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { StudioTopBar } from "@/features/studio/components/studio-top-bar";
import { StudioProgressBar } from "@/features/studio/components/studio-progress";
import { SourcesPanel } from "@/features/studio/components/sources-panel";
import { ChatPanel } from "@/features/studio/components/chat-panel";
import { StudioSettingsPanel } from "@/features/studio/components/studio-settings-panel";
import { StudioActionBar } from "@/features/studio/components/studio-action-bar";

function renderBold(text: string, boldClassName: string) {
  return text.split(/<strong>(.*?)<\/strong>/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className={boldClassName}>{part}</strong>
      : part,
  );
}

export function StudioPage() {
  const studio = useStudio();
  const { t, lang } = useLanguage();
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
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
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

  useEffect(() => { setMounted(true); }, []);

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
    if (wasRunning && !isRunInProgress && hadGenerationRef.current && quotaBlocked) {
      setQuotaDialogOpen(true);
    }
  }, [isRunInProgress, quotaBlocked]);

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
  // Note: quotaBlocked is intentionally excluded — the button stays enabled when the session
  // is ready so users can click it and see the quota dialog explaining why it's blocked.
  // handleGenerateQuestions guards the actual generation call.
  const canGenerate = useMemo(
    () => studio.settings?.readiness?.canGenerateQuestions ?? false,
    [studio.settings?.readiness?.canGenerateQuestions]
  );

  // Only allow creating plan after JD is saved & analyzed (jdSummary set) or backend confirms it exists
  const canCreatePlan = useMemo(
    () =>
      !quotaBlocked &&
      (Boolean(studio.jdSummary) || Boolean(studio.settings?.readiness?.hasJobDescription)),
    [studio.jdSummary, studio.settings?.readiness?.hasJobDescription, quotaBlocked]
  );

  // "Tạo bộ câu hỏi mới" — ALWAYS create a new (empty) session to clear existing questions.
  // After the new session loads, show the quota dialog if the account has no generation quota,
  // so the user knows immediately they can't generate yet without blocking the reset itself.
  const handleNewSession = useCallback(() => {
    void studio.createNewSession().then(() => {
      if (quotaBlocked) setQuotaDialogOpen(true);
    });
  }, [quotaBlocked, studio]);

  // Wrap plan creation to immediately switch to main tab on mobile.
  // FE-side quota gate: if blocked, open the dialog immediately instead of hitting BE.
  const handleCreatePlan = useCallback(() => {
    if (quotaBlocked) {
      quotaDialogTriggeredRef.current = true;
      setQuotaDialogOpen(true);
      return;
    }
    switchMobileTab("main");
    studio.generateInitialPlan();
  }, [quotaBlocked, studio, switchMobileTab]);

  const handleGenerateQuestions = useCallback(() => {
    // FE-side quota gate: show dialog immediately when we already know quota is blocked.
    // This gives instant feedback without a round-trip. The BE still guards the actual call —
    // if the local cache is stale, studio.quotaExceeded fires and shows the dialog too.
    if (quotaBlocked) {
      quotaDialogTriggeredRef.current = true;
      setQuotaDialogOpen(true);
      return;
    }
    hadGenerationRef.current = true;
    void studio.generateQuestions();
  }, [quotaBlocked, studio]);

  const hasJd = Boolean(studio.jdContent?.trim()) || Boolean(studio.settings?.readiness?.hasJobDescription);
  const skillCount = studio.jdSummary?.skills?.length ?? 0;

  // Sources and inspector lock when questions are generated
  const sideColumnsLocked = studio.isGeneratingQuestions || studio.questions.length > 0;

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
            "flex-col transition-all duration-300",
            // Mobile: show only when active tab (with slide animation)
            mobileTab === "sources" ? cn("flex w-full lg:w-auto", tabAnimDir === "right" ? "slide-tab-right" : "slide-tab-left") : "hidden",
            // Desktop: always visible, collapsible width
            "lg:flex",
            sourcesCollapsed ? "lg:w-9 lg:shrink-0" : "lg:w-75 lg:shrink-0",
          )}
        >
          {sourcesCollapsed ? (
            <button
              type="button"
              onClick={() => setSourcesCollapsed(false)}
              title={s.sourcesHeader}
              aria-label={s.aria.expandSource}
              className="flex w-full flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-4 text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:text-gray-200"
            >
              <Database className="h-4 w-4" />
              <div className="h-px w-5 bg-gray-100 dark:bg-gray-800" aria-hidden />
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
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
                locked={sideColumnsLocked}
                jdLocked={quotaBlocked}
                jdLockedTitle={t.hrSubscription.quotaExceededTitle}
                jdContent={studio.jdContent}
                onJdChange={studio.setJdContent}
                onSaveJd={studio.saveJobDescription}
                onUploadJd={studio.uploadJobDescription}
                jdFileName={studio.jdFileName}
                summary={studio.jdSummary}
                documents={studio.documents}
                onUploadDocument={studio.uploadDocument}
                onAttachFromLibrary={studio.attachLibraryDocuments}
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
            onRefreshGenerationStatus={() => void studio.refreshGenerationStatus()}
            onCreatePlan={handleCreatePlan}
            onSendMessage={studio.sendMessage}
            onApprovePlan={studio.approveCurrentPlan}
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
              });
              studio.setQuestions((prev) =>
                prev.map((item) =>
                  item.id === q.id
                    ? { ...item, content: q.content, expectedAnswer: q.expectedAnswer, scoringRubric: q.scoringRubric }
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
            onRegenerateQuestion={async (questionId) => {
              if (!studio.project) return;
              const api = await import("@/features/studio/services/studio.service");
              await api.regenerateQuestion(studio.project.id, questionId, {
                includeSampleAnswers: studio.settings?.includeSampleAnswers ?? true,
                includeScoringRubric: studio.settings?.includeScoringRubric ?? true,
              });
              if (studio.currentPlan) {
                const result = await api.listQuestions(studio.project.id, { page: 1, pageSize: 100, planId: studio.currentPlan.id });
                studio.setQuestions(result.items);
              }
            }}
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
          />
        </div>

        {/* Inspector / Settings panel */}
        <div
          style={{ animation: "slideInRight 0.42s cubic-bezier(0.25,0.46,0.45,0.94) 0.18s both" }}
          className={cn(
            "flex-col transition-all duration-300",
            // Mobile: show only when active tab (with slide animation)
            mobileTab === "settings" ? cn("flex w-full lg:w-auto", tabAnimDir === "right" ? "slide-tab-right" : "slide-tab-left") : "hidden",
            // Desktop: always visible, collapsible width
            "lg:flex",
            inspectorCollapsed ? "lg:w-9 lg:shrink-0" : "lg:w-[320px] lg:shrink-0",
          )}
        >
          {inspectorCollapsed ? (
            <button
              type="button"
              onClick={() => setInspectorCollapsed(false)}
              title={s.settingsHeader}
              aria-label={s.aria.expandSetting}
              className="flex w-full flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-4 text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:text-gray-200"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <div className="h-px w-5 bg-gray-100 dark:bg-gray-800" aria-hidden />
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
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
                locked={sideColumnsLocked || studio.isApplyingSettings || studio.isStreaming}
                settings={studio.settings}
                plan={studio.currentPlan}
                isApplying={studio.isApplyingSettings}
                onChangeSetting={studio.updateSettingField}
                onApplyToPlan={studio.applySettingsToPlan}
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
        isStreaming={studio.isStreaming}
        isGeneratingQuestions={studio.isGeneratingQuestions}
        canCreatePlan={canCreatePlan && !sideColumnsLocked}
        canGenerate={canGenerate}
        skillCount={skillCount}
        isPublished={studio.project?.isPublished ?? false}
        isSavingDraft={studio.isSavingDraft}
        isDraftSaved={studio.isDraftSaved}
        onCreatePlan={handleCreatePlan}
        onApprovePlan={studio.approveCurrentPlan}
        onGenerateQuestions={handleGenerateQuestions}
        onSaveDraft={studio.saveDraftAction}
        onTogglePublish={() => void studio.togglePublish()}
      />
    </div>
  );
}
