"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Database, SlidersHorizontal } from "lucide-react";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { cn } from "@/lib/cn";
import { useStudio } from "@/features/studio/hooks/use-studio";
import { StudioTopBar } from "@/features/studio/components/studio-top-bar";
import { StudioProgressBar } from "@/features/studio/components/studio-progress";
import { SourcesPanel } from "@/features/studio/components/sources-panel";
import { ChatPanel } from "@/features/studio/components/chat-panel";
import { StudioSettingsPanel } from "@/features/studio/components/studio-settings-panel";
import { StudioActionBar } from "@/features/studio/components/studio-action-bar";

export function StudioPage() {
  const studio = useStudio();
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  const canGenerate = useMemo(
    () => studio.settings?.readiness?.canGenerateQuestions ?? false,
    [studio.settings?.readiness?.canGenerateQuestions]
  );

  const canCreatePlan = useMemo(
    () => Boolean(studio.jdContent?.trim()) || Boolean(studio.settings?.readiness?.hasJobDescription),
    [studio.jdContent, studio.settings?.readiness?.hasJobDescription]
  );

  const hasJd = Boolean(studio.jdContent?.trim()) || Boolean(studio.settings?.readiness?.hasJobDescription);
  const skillCount = studio.jdSummary?.skills?.length ?? 0;

  // Sources and inspector lock when questions are generated
  const sideColumnsLocked = studio.isGeneratingQuestions || studio.questions.length > 0;

  if (studio.loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <AiLoadingSpinner text="Đang tải Studio…" />
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
              title="Nguồn dữ liệu"
              aria-label="Mở rộng nguồn dữ liệu"
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
                  Nguồn dữ liệu
                </span>
                <button
                  type="button"
                  onClick={() => setSourcesCollapsed(true)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label="Thu gọn Sources"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>
              <SourcesPanel
                locked={sideColumnsLocked}
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
        <div className="flex min-w-0 flex-1 flex-col" style={{ animation: "slideUpFade 0.42s cubic-bezier(0.25,0.46,0.45,0.94) 0.14s both" }}>
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
              title="Cấu hình kế hoạch"
              aria-label="Mở rộng cấu hình"
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
                  Cấu hình kế hoạch
                </span>
                <button
                  type="button"
                  onClick={() => setInspectorCollapsed(true)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label="Thu gọn Inspector"
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
    </div>
  );
}
