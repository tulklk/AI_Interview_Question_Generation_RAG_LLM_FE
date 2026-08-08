"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Clock, CreditCard, Database, MessageSquare, SlidersHorizontal } from "lucide-react";
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

  // The quota dialog is derived state, not user-dismissible: it stays up until the cooldown
  // expires or the user upgrades. The only ways out are its two navigation buttons.
  const showQuotaDialog = quotaBlocked;

  // Since the dialog can't be dismissed, re-check the subscription when the cooldown expires and
  // whenever the tab regains focus (e.g. the user upgraded in another tab), so it lifts by itself.
  useEffect(() => {
    if (!quotaBlocked) return;

    const onFocus = () => void refreshSubscription();
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
  const canGenerate = useMemo(
    () =>
      !quotaBlocked &&
      (studio.settings?.readiness?.canGenerateQuestions ?? false),
    [studio.settings?.readiness?.canGenerateQuestions, quotaBlocked]
  );

  // Only allow creating plan after JD is saved & analyzed (jdSummary set) or backend confirms it exists
  const canCreatePlan = useMemo(
    () =>
      !quotaBlocked &&
      (Boolean(studio.jdSummary) || Boolean(studio.settings?.readiness?.hasJobDescription)),
    [studio.jdSummary, studio.settings?.readiness?.hasJobDescription, quotaBlocked]
  );

  // "Tạo bộ câu hỏi mới" — the dialog is already covering the page when quota is exhausted,
  // so just refuse to start a brand new session.
  const handleNewSession = useCallback(() => {
    if (quotaBlocked) return;
    void studio.createNewSession();
  }, [quotaBlocked, studio]);

  // Wrap plan creation to immediately switch to main tab on mobile
  const handleCreatePlan = useCallback(() => {
    switchMobileTab("main");
    studio.generateInitialPlan();
  }, [studio, switchMobileTab]);

  const handleGenerateQuestions = useCallback(() => {
    if (quotaBlocked) return;
    void studio.generateQuestions();
  }, [quotaBlocked, studio]);

  const hasJd = Boolean(studio.jdContent?.trim()) || Boolean(studio.settings?.readiness?.hasJobDescription);
  const skillCount = studio.jdSummary?.skills?.length ?? 0;

  // Sources and inspector lock when questions are generated
  const sideColumnsLocked = studio.isGeneratingQuestions || studio.questions.length > 0;

  // Quota-exceeded dialog — portal to body, flex layout masks sidebar+header.
  // Rendered outside the main tree so it also shows while the studio is still bootstrapping.
  // Not dismissible: no close button, no backdrop click, no Escape.
  const quotaDialog = showQuotaDialog && mounted
    ? createPortal(
        <div className="fixed inset-0 z-50 flex pointer-events-none">
          {/* Transparent spacer matching sidebar width (desktop) */}
          <div className="hidden lg:block w-62.5 shrink-0" aria-hidden />

          {/* Right column — mirrors the AppShell right pane */}
          <div className="flex flex-1 flex-col">
            {/* Transparent spacer matching header height */}
            <div className="h-14 shrink-0" aria-hidden />

            {/* Content area overlay — blocks every interaction behind it */}
            <div className="pointer-events-auto flex flex-1 items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div
                role="alertdialog"
                aria-modal
                aria-labelledby="quota-dialog-title"
                aria-describedby="quota-dialog-desc"
                className="relative w-full max-w-md animate-scale-in rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
              >
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

  // Both branches return a root <div> whose first child is the portal, so React reconciles the
  // dialog in place when `loading` flips — otherwise it remounts and its enter animation replays.
  if (studio.loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        {quotaDialog}
        <AiLoadingSpinner text={s.loading} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-16">
      {quotaDialog}

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
