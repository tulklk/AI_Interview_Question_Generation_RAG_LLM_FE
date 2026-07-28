"use client";

import { useMemo } from "react";
import { useStudio } from "@/features/studio/hooks/use-studio";
import { StudioTopBar } from "@/features/studio/components/studio-top-bar";
import { StudioProgressBar } from "@/features/studio/components/studio-progress";
import { SourcesPanel } from "@/features/studio/components/sources-panel";
import { ChatPanel } from "@/features/studio/components/chat-panel";
import { StudioSettingsPanel } from "@/features/studio/components/studio-settings-panel";

export function StudioPage() {
  const studio = useStudio();

  const canGenerate = useMemo(
    () => studio.settings?.readiness?.canGenerateQuestions ?? false,
    [studio.settings?.readiness?.canGenerateQuestions]
  );

  const canCreatePlan = useMemo(() => {
    // Chỉ cần JD — knowledge documents là optional (làm giàu RAG)
    return Boolean(studio.jdContent?.trim()) || Boolean(studio.settings?.readiness?.hasJobDescription);
  }, [studio.jdContent, studio.settings?.readiness?.hasJobDescription]);

  const hasJd = Boolean(studio.jdContent?.trim()) || Boolean(studio.settings?.readiness?.hasJobDescription);

  // Khóa Sources + Studio khi đang sinh / đã có câu hỏi (mở lại bằng Tạo bộ mới)
  const sideColumnsLocked = studio.isGeneratingQuestions || studio.questions.length > 0;

  if (studio.loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm dark:border-gray-800 dark:bg-gray-900">Đang tải Studio...</div>;
  }

  return (
    <div className="space-y-4">
      <StudioTopBar
        projectName={studio.project?.name}
        onNewSession={() => void studio.createNewSession()}
        onSaveDraft={studio.saveDraftAction}
        onShare={studio.createShare}
        onGenerateQuestions={() => void studio.generateQuestions()}
        generateDisabled={studio.isGeneratingQuestions || !canGenerate}
        isGenerating={studio.isGeneratingQuestions}
        questionCount={studio.questions.length}
        generateLabel={
          studio.isGeneratingQuestions
            ? "Đang sinh…"
            : studio.questions.length > 0
              ? "Tạo lại câu hỏi"
              : "Sinh câu hỏi"
        }
      />

      <StudioProgressBar
        hasJd={hasJd}
        plan={studio.currentPlan}
        questionCount={studio.questions.length}
        isGenerating={studio.isGeneratingQuestions}
        isStreaming={studio.isStreaming}
        isApplying={studio.isApplyingSettings}
        generationRun={studio.generationRun}
      />

      {/* Cột ngoài cố định hẹp; chat chiếm toàn bộ phần còn lại */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(220px,260px)] xl:gap-3">
        <div className="min-w-0">
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
        </div>

        <div className="min-w-0">
          <ChatPanel
            messages={studio.messages}
            isStreaming={studio.isStreaming}
            plan={studio.currentPlan}
            canCreatePlan={canCreatePlan && !sideColumnsLocked}
            questions={studio.questions}
            generationRun={studio.generationRun}
            isGeneratingQuestions={studio.isGeneratingQuestions}
            canGenerateQuestions={canGenerate}
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
                    ? {
                        ...item,
                        content: q.content,
                        expectedAnswer: q.expectedAnswer,
                        scoringRubric: q.scoringRubric,
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
            onRegenerateQuestion={async (questionId) => {
              if (!studio.project) return;
              const api = await import("@/features/studio/services/studio.service");
              await api.regenerateQuestion(studio.project.id, questionId, {
                includeSampleAnswers: studio.settings?.includeSampleAnswers ?? true,
                includeScoringRubric: studio.settings?.includeScoringRubric ?? true,
              });
              // Mock regen trên BE — refresh list để lấy content mới
              if (studio.currentPlan) {
                const result = await api.listQuestions(studio.project.id, {
                  page: 1,
                  pageSize: 100,
                  planId: studio.currentPlan.id,
                });
                studio.setQuestions(result.items);
              }
            }}
          />
        </div>

        <div className="min-w-0">
          <StudioSettingsPanel
            locked={sideColumnsLocked || studio.isApplyingSettings || studio.isStreaming}
            settings={studio.settings}
            plan={studio.currentPlan}
            isApplying={studio.isApplyingSettings}
            onChangeSetting={studio.updateSettingField}
            onApplyToPlan={studio.applySettingsToPlan}
          />
          <p className="mt-2 px-1 text-xs text-gray-500">
            {sideColumnsLocked
              ? "Sources & Studio đã khóa sau khi tạo câu hỏi. Bấm Tạo bộ mới để chỉnh lại."
              : canGenerate
                ? "Ready to generate questions."
                : "Cần thêm dữ liệu trước khi generate questions."}
          </p>
        </div>
      </div>
    </div>
  );
}
