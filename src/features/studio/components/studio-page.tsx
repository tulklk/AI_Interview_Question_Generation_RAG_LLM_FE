"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Clock, CreditCard, Database, SlidersHorizontal } from "lucide-react";
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
  const { canGenerateNow, cooldownEndsAt } = useHrSubscription();
  const [mounted, setMounted] = useState(false);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  // Main: dialog portal; WIP: cũng chặn action + JD input khi hết quota
  const showQuotaDialog = !canGenerateNow;
  const quotaBlocked = !canGenerateNow;
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const cooldownTimeStr = cooldownEndsAt
    ? cooldownEndsAt.toLocaleString(locale)
    : "";
  const quotaBody = cooldownEndsAt
    ? t.hrSubscription.quotaExceededBody.replace("{{time}}", cooldownTimeStr)
    : t.hrSubscription.quotaExceededBody;

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

  const hasJd = Boolean(studio.jdContent?.trim()) || Boolean(studio.settings?.readiness?.hasJobDescription);
  const skillCount = studio.jdSummary?.skills?.length ?? 0;

  // Sources and inspector lock when questions are generated
  const sideColumnsLocked = studio.isGeneratingQuestions || studio.questions.length > 0;

  if (studio.loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <AiLoadingSpinner text={s.loading} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-16">
      {/* Top bar */}
      <div style={{ animation: "slideUpFade 0.38s ease-out both" }}>
        <StudioTopBar
          projectName={studio.project?.name}
          onNewSession={() => void studio.createNewSession()}
          onSaveDraft={studio.saveDraftAction}
          onShare={studio.createShare}
          isGenerating={studio.isGeneratingQuestions}
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

      {/* 3-column workspace */}
      <div className="flex min-h-105 gap-3">
        {/* Sources panel (collapsible) */}
        <div
          style={{ animation: "slideInLeft 0.42s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s both" }}
          className={cn(
            "flex flex-col transition-all duration-300",
            sourcesCollapsed ? "w-9 shrink-0" : "w-75 shrink-0"
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
              <div className="mb-2 flex items-center justify-between px-1">
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
                jdLockedBody={quotaBody}
                billingHref="/hr/settings?tab=billing"
                billingLabel={t.hrSubscription.goToSubscription}
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

        {/* Main workspace — self-start only when plan content exists to avoid empty space below sections */}
        <div className={cn("flex min-w-0 flex-1 flex-col", studio.currentPlan && !studio.isStreaming ? "self-start" : "")} style={{ animation: "slideUpFade 0.42s cubic-bezier(0.25,0.46,0.45,0.94) 0.14s both" }}>
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
            onCreatePlan={studio.generateInitialPlan}
            onSendMessage={studio.sendMessage}
            onApprovePlan={studio.approveCurrentPlan}
            onRenamePlanTitle={studio.renameCurrentPlanTitle}
            onRefinePlan={studio.refineCurrentPlan}
            onGenerateQuestions={() => void studio.generateQuestions()}
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

        {/* Inspector (collapsible) */}
        <div
          style={{ animation: "slideInRight 0.42s cubic-bezier(0.25,0.46,0.45,0.94) 0.18s both" }}
          className={cn(
            "flex flex-col transition-all duration-300",
            inspectorCollapsed ? "w-9 shrink-0" : "w-[320px] shrink-0"
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
              <div className="mb-2 flex items-center justify-between px-1">
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
        onCreatePlan={studio.generateInitialPlan}
        onApprovePlan={studio.approveCurrentPlan}
        onGenerateQuestions={() => void studio.generateQuestions()}
        onSaveDraft={studio.saveDraftAction}
        onTogglePublish={() => void studio.togglePublish()}
      />

      {/* Quota-exceeded dialog — portal to body, flex layout masks sidebar+header */}
      {showQuotaDialog && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex pointer-events-none">
          {/* Transparent spacer matching sidebar width (desktop) */}
          <div className="hidden lg:block w-62.5 shrink-0" aria-hidden />

          {/* Right column — mirrors the AppShell right pane */}
          <div className="flex flex-1 flex-col">
            {/* Transparent spacer matching header height */}
            <div className="h-14 shrink-0" aria-hidden />

            {/* Content area overlay — only this region is blurred and interactive */}
            <div className="pointer-events-auto flex flex-1 items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div
                role="alertdialog"
                aria-modal
                aria-labelledby="quota-dialog-title"
                aria-describedby="quota-dialog-desc"
                className="w-full max-w-md animate-scale-in rounded-2xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 pb-5 pt-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
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
                    className="mt-3 text-sm leading-relaxed text-gray-400 dark:text-gray-500"
                  >
                    {renderBold(
                      hs.quotaExceededBody.replace("{{time}}", cooldownTimeStr),
                      "font-bold text-gray-800 dark:text-gray-100",
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
                    onClick={() => router.push("/hr/generate/manual")}
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
      )}
    </div>
  );
}
