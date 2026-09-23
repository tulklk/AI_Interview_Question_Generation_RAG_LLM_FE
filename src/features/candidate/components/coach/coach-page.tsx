"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Loader2,
  Map,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { UpgradeModal } from "@/features/candidate/components/billing/upgrade-modal";
import { CoachHero } from "@/features/candidate/components/coach/coach-hero";
import { CoachSteps } from "@/features/candidate/components/coach/coach-steps";
import { CoachStatusCard } from "@/features/candidate/components/coach/coach-status-card";
import { CoachContextPanel } from "@/features/candidate/components/coach/coach-context-panel";
import { CoachCvUploadPanel } from "@/features/candidate/components/coach/coach-cv-upload-panel";
import { CoachAnalysisPanel } from "@/features/candidate/components/coach/coach-analysis-panel";
import { CoachReportPanel } from "@/features/candidate/components/coach/coach-report-panel";
import { CoachRoadmapsPanel } from "@/features/candidate/components/coach/coach-roadmaps-panel";
import { CoachRoadmapPreviewPanel } from "@/features/candidate/components/coach/coach-roadmap-preview-panel";
import { CoachMarketplacePanel } from "@/features/candidate/components/coach/coach-marketplace-panel";
import { CoachInsightCards } from "@/features/candidate/components/coach/coach-insight-cards";
import { useCoachWorkflow } from "@/features/candidate/hooks/use-coach-workflow";

export function CoachPage() {
  const router = useRouter();
  const w = useCoachWorkflow();
  const { p } = w;

  const statusKind = w.busy
    ? "generating"
    : w.ready
      ? "ready"
      : w.failed
        ? "error"
        : "idle";

  const showGeneratingOverlay = w.busy && !w.overlayDismissed;

  // Hiện CTA khi đã vào vòng Coach (không chỉ khi có báo cáo).
  const showNewRun =
    Boolean(w.context?.contextConfirmed) ||
    w.hasScoredReport ||
    w.hasActiveRoadmap ||
    w.busy ||
    w.ready ||
    w.failed;

  function goTakeTest() {
    if (!w.job?.questionSetId) return;
    router.push(`/candidate/practice/${w.job.questionSetId}?mode=coach`);
  }

  const generatingOverlay =
    showGeneratingOverlay && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin text-primary" />
                  <p className={cn("text-[14px] font-semibold", portalHeadingAlt)}>
                    {p.generatingBackground}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => w.setOverlayDismissed(true)}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
              <p className={cn("text-[12px]", portalSubtextAlt)}>{p.pollingStay}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={w.cancelling || !w.job?.id || w.job.id === "__pending__"}
                  onClick={() => void w.cancelJob()}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold border border-red-200 text-red-600 disabled:opacity-50"
                >
                  {w.cancelling ? <Loader2 size={12} className="animate-spin" /> : null}
                  {p.cancelGeneration}
                </button>
                <Link
                  href="/candidate/practice"
                  className="inline-flex items-center h-9 px-3 rounded-lg text-[12px] font-semibold text-primary hover:underline"
                >
                  {p.browseWhileWaiting} →
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="space-y-5 pb-10">
      {generatingOverlay}

      <CoachHero
        isPremium={w.isPremium}
        onUpgrade={() => w.setUpgradeOpen(true)}
        showNewRun={showNewRun}
        newRunBusy={w.resetting}
        onNewRun={() => void w.startNewRun()}
      />

      <CoachSteps
        activeStep={w.activeStep}
        maxUnlockedStep={w.maxUnlockedStep}
        minSelectableStep={w.minSelectableStep}
        onSelect={w.selectStep}
      />

      <div className="grid lg:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-5 min-w-0">
          {w.activeStep === 1 && (
            <CoachCvUploadPanel
              cv={w.cv}
              uploading={w.uploadingCv}
              onUpload={w.handleUploadCv}
            />
          )}

          {w.activeStep === 2 && (
            <CoachAnalysisPanel
              context={w.context}
              cv={w.cv}
              savingSkills={w.savingSkills}
              onContinue={(skills) => void w.handleSaveSkills(skills)}
            />
          )}

          {w.activeStep === 3 && (
            <CoachContextPanel
              context={w.context}
              loading={w.loading}
              saving={w.savingContext}
              editing={w.editingContext || !w.context?.contextConfirmed}
              onEdit={() => w.setEditingContext(true)}
              onCancelEdit={() => w.setEditingContext(false)}
              onSave={w.handleSaveContext}
              hasExistingReport={w.hasScoredReport}
            />
          )}

          {w.activeStep === 4 && (
            <div className="space-y-4">
              {!w.context?.matchedFrameworkId &&
                w.context?.contextConfirmed &&
                w.context.resolutionMode === "UNSUPPORTED" && (
                <div className="rounded-[14px] border border-amber-200 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 px-5 py-4 text-[13px] text-amber-900 dark:text-amber-100">
                  {p.unsupportedRole}
                  {w.context.supportedRoles.length > 0 && (
                    <p className="mt-1">
                      {p.supportedRolesLabel}: {w.context.supportedRoles.join(", ")}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      w.setEditingContext(true);
                      w.selectStep(3);
                    }}
                    className="ml-2 font-semibold underline"
                  >
                    {p.editGoal}
                  </button>
                </div>
              )}
              {w.context?.resolutionMode === "ADAPTIVE" && w.context?.contextConfirmed && (
                <div className="rounded-[14px] border border-violet-200 dark:border-violet-800/50 bg-violet-50/70 dark:bg-violet-950/20 px-5 py-4 text-[13px] text-violet-900 dark:text-violet-100">
                  {p.adaptivePersonalized}
                </div>
              )}
              <CoachStatusCard
                status={statusKind}
                purposeLabel={w.purposeLabel}
                errorMessage={w.error || w.job?.errorMessage}
                kbSource={w.job?.kbSource}
                onTake={goTakeTest}
                onRetry={() => void w.runDiagnostic()}
                onCancel={() => void w.cancelJob()}
                onStart={() => void w.runDiagnostic()}
                cancelling={w.cancelling}
                startDisabled={w.diagnosticDisabled || w.busy}
              />
              {w.hasScoredReport && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => w.selectStep(5)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-700 hover:border-primary/40"
                  >
                    {p.reportTitle}
                    <ArrowRight size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => w.selectStep(6)}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12px] font-semibold text-white hr-cta-btn"
                  >
                    <Map size={13} />
                    {p.roadmapsTitle}
                  </button>
                </div>
              )}
            </div>
          )}

          {w.activeStep === 5 && (
            <div className="space-y-4">
              {w.hasScoredReport && w.report ? (
                <>
                  <CoachReportPanel
                    report={w.report}
                    promotingNextLevel={w.promotingNextLevel}
                    onPromoteNextLevel={() => w.promoteToNextLevel()}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => w.selectStep(6)}
                      className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[12px] font-semibold text-white hr-cta-btn"
                    >
                      <Map size={14} />
                      {p.roadmapsTitle}
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void w.startNewRun()}
                      disabled={w.resetting}
                      className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[12px] font-semibold border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300 hover:border-primary/40 hover:text-primary disabled:opacity-60"
                    >
                      {w.resetting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {p.newCoachRun}
                    </button>
                  </div>
                </>
              ) : w.rescoring ? (
                <div className="hr-glass-card px-5 py-8 text-center space-y-3">
                  <Loader2 size={22} className="mx-auto animate-spin text-primary" />
                  <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>
                    {p.scoringCompetencyTitle}
                  </p>
                  <p className={cn("text-[12px]", portalSubtextAlt)}>{p.scoringCompetencyBody}</p>
                </div>
              ) : (
                <div className="hr-glass-card px-5 py-8 text-center space-y-2">
                  <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>
                    {p.reportEmptyTitle}
                  </p>
                  <p className={cn("text-[12px]", portalSubtextAlt)}>
                    {w.rescoreError || p.reportEmptyBody}
                  </p>
                  <button
                    type="button"
                    onClick={() => w.selectStep(4)}
                    className="text-[12px] font-semibold text-primary hover:underline"
                  >
                    {p.startDiagnostic} →
                  </button>
                </div>
              )}
            </div>
          )}

          {w.activeStep === 6 && (
            <div className="space-y-4">
              {w.hasDraftRoadmap ? (
                <CoachRoadmapPreviewPanel
                  roadmaps={w.roadmaps}
                  busy={w.busy}
                  accepting={w.acceptingRoadmaps}
                  onToggleItem={(itemId, isIncluded) =>
                    void w.handleUpdateDraftItem(itemId, isIncluded)
                  }
                  onAccept={() => void w.handleAcceptRoadmaps()}
                />
              ) : w.roadmaps.some((r) => Boolean(r.acceptedAt) || r.status === "Active") ? (
                <CoachRoadmapsPanel
                  roadmaps={w.roadmaps.filter(
                    (r) => Boolean(r.acceptedAt) || r.status === "Active" || r.status === "Completed"
                  )}
                  isPremium={w.isPremium}
                  busy={w.busy}
                  job={w.job}
                  onStart={(id) => void w.handleStartRoadmap(id)}
                  onDrillItem={(rid, iid) => void w.handleDrillItem(rid, iid)}
                  onReassessment={(id) => void w.handleReassessment(id)}
                  onUpgrade={() => w.setUpgradeOpen(true)}
                />
              ) : w.rescoring ? (
                <div className="hr-glass-card px-5 py-8 text-center space-y-3">
                  <Loader2 size={22} className="mx-auto animate-spin text-primary" />
                  <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>
                    {p.scoringCompetencyTitle}
                  </p>
                  <p className={cn("text-[12px]", portalSubtextAlt)}>{p.scoringCompetencyBody}</p>
                </div>
              ) : (
                <div className="hr-glass-card px-5 py-8 text-center space-y-2">
                  <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>
                    {p.roadmapEmptyTitle}
                  </p>
                  <p className={cn("text-[12px]", portalSubtextAlt)}>
                    {w.rescoreError || p.roadmapEmptyBody}
                  </p>
                </div>
              )}
            </div>
          )}

          {w.activeStep === 7 && (
            <div className="space-y-4">
              <div className="hr-glass-card px-5 py-4 space-y-1">
                <p className={cn("text-[14px] font-bold", portalHeadingAlt)}>{p.phaseReassessTitle}</p>
                <p className={cn("text-[12px]", portalSubtextAlt)}>{p.phaseReassessDesc}</p>
              </div>

              {(w.busy || w.ready || w.failed) && (
                <CoachStatusCard
                  status={statusKind}
                  purposeLabel={w.purposeLabel}
                  errorMessage={w.error || w.job?.errorMessage}
                  kbSource={w.job?.kbSource}
                  onTake={goTakeTest}
                  onRetry={() => {
                    const rid = w.roadmaps.find((r) =>
                      r.items.some((i) => i.isReassessmentGate)
                    )?.id;
                    if (rid) void w.handleReassessment(rid);
                  }}
                  onCancel={() => void w.cancelJob()}
                  cancelling={w.cancelling}
                  startDisabled={w.busy}
                />
              )}

              {w.hasScoredReport && w.report && (
                <div className="hr-glass-card px-5 py-4 space-y-2">
                  <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>{p.reportTitle}</p>
                  <div className="flex flex-wrap items-center gap-3 text-[12px]">
                    {w.report.overallReadiness != null && (
                      <span className={cn("font-semibold", portalHeadingAlt)}>
                        {p.overallReadiness}: {Math.round(w.report.overallReadiness)}%
                      </span>
                    )}
                    {w.report.achievedLevel && (
                      <span className="inline-flex text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {w.report.achievedLevel}
                      </span>
                    )}
                    {w.report.overallDelta != null && (
                      <span
                        className={
                          (w.report.overallDelta ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                        }
                      >
                        {p.deltaLabel}: {(w.report.overallDelta ?? 0) >= 0 ? "+" : ""}
                        {w.report.overallDelta.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {w.report.levelExplanation && (
                    <p className={cn("text-[11px] leading-relaxed", portalSubtextAlt)}>
                      {w.report.levelExplanation}
                    </p>
                  )}
                </div>
              )}

              {w.hasReadyForReassessment ||
              w.roadmaps.some((r) =>
                r.items.some((i) => i.isReassessmentGate && i.status === "InProgress")
              ) ? (
                <CoachRoadmapsPanel
                  roadmaps={w.roadmaps.filter((r) =>
                    r.items.some(
                      (i) =>
                        i.status === "ReadyForReassessment" ||
                        (i.isReassessmentGate && i.status === "InProgress")
                    )
                  )}
                  isPremium={w.isPremium}
                  busy={w.busy}
                  job={w.job}
                  onStart={(id) => void w.handleStartRoadmap(id)}
                  onDrillItem={(rid, iid) => void w.handleDrillItem(rid, iid)}
                  onReassessment={(id) => void w.handleReassessment(id)}
                  onUpgrade={() => w.setUpgradeOpen(true)}
                />
              ) : !(w.busy || w.ready || w.failed) ? (
                <div className="hr-glass-card px-5 py-8 text-center space-y-2">
                  <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>
                    {p.reassessEmptyTitle}
                  </p>
                  <p className={cn("text-[12px]", portalSubtextAlt)}>{p.reassessEmptyBody}</p>
                  <button
                    type="button"
                    onClick={() => w.selectStep(6)}
                    className="text-[12px] font-semibold text-primary hover:underline"
                  >
                    {p.phaseRoadmapTitle} →
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <CoachInsightCards context={w.context} report={w.report} />

          <CoachMarketplacePanel skills={w.roadmaps.map((r) => r.skill)} />

          {!w.isPremium && (
            <button
              type="button"
              onClick={() => w.setUpgradeOpen(true)}
              className="w-full hr-glass-card px-4 py-4 text-left hover:border-primary/30 transition-colors"
            >
              <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.upgradeTitle}</p>
              <p className={cn("text-[11px] mt-1", portalSubtextAlt)}>{p.upgradeDesc}</p>
            </button>
          )}
        </aside>
      </div>

      {w.upgradeOpen && <UpgradeModal onClose={() => w.setUpgradeOpen(false)} />}
    </div>
  );
}
