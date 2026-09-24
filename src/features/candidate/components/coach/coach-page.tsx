"use client";

import { useState, type ReactNode } from "react";
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
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { CoachNewRunConfirmModal } from "@/features/candidate/components/coach/coach-new-run-confirm-modal";
import { CoachPageSkeleton } from "@/features/candidate/components/coach/coach-page-skeleton";
import {
  fadeUp,
  motionSafe,
  overlayBackdropVariants,
  overlayPanelVariants,
  staggerContainer,
  staggerItem,
  stepContentVariants,
} from "@/features/candidate/components/coach/coach-motion";
import { useCoachWorkflow } from "@/features/candidate/hooks/use-coach-workflow";

export function CoachPage() {
  const router = useRouter();
  const w = useCoachWorkflow();
  const { p } = w;
  const reduced = useReducedMotion();
  const safe = motionSafe(reduced);
  const [newRunConfirmOpen, setNewRunConfirmOpen] = useState(false);

  const statusKind = w.busy
    ? "generating"
    : w.ready
      ? "ready"
      : w.failed
        ? "error"
        : "idle";

  const showGeneratingOverlay = w.busy && !w.overlayDismissed;

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

  let stepBody: ReactNode = null;

  if (w.activeStep === 1) {
    stepBody = (
      <CoachCvUploadPanel cv={w.cv} uploading={w.uploadingCv} onUpload={w.handleUploadCv} />
    );
  } else if (w.activeStep === 2) {
    stepBody = (
      <CoachAnalysisPanel
        context={w.context}
        cv={w.cv}
        savingSkills={w.savingSkills}
        onContinue={(skills) => void w.handleSaveSkills(skills)}
      />
    );
  } else if (w.activeStep === 3) {
    stepBody = (
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
    );
  } else if (w.activeStep === 4) {
    stepBody = (
      <div className="space-y-4">
        {!w.context?.matchedFrameworkId &&
          w.context?.contextConfirmed &&
          w.context.resolutionMode === "UNSUPPORTED" && (
            <div className="rounded-[14px] border border-amber-200 bg-amber-50/70 px-5 py-4 text-[13px] text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100">
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
          <div className="rounded-[14px] border border-violet-200 bg-violet-50/70 px-5 py-4 text-[13px] text-violet-900 dark:border-violet-800/50 dark:bg-violet-950/20 dark:text-violet-100">
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
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 text-[12px] font-semibold dark:border-gray-700 hover:border-primary/40"
            >
              {p.reportTitle}
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => w.selectStep(6)}
              className="hr-cta-btn inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[12px] font-semibold text-white"
            >
              <Map size={13} />
              {p.roadmapsTitle}
            </button>
          </div>
        )}
      </div>
    );
  } else if (w.activeStep === 5) {
    stepBody = (
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
                className="hr-cta-btn inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12px] font-semibold text-white"
              >
                <Map size={14} />
                {p.roadmapsTitle}
                <ArrowRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => setNewRunConfirmOpen(true)}
                disabled={w.resetting}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3.5 text-[12px] font-semibold text-gray-600 hover:border-primary/40 hover:text-primary disabled:opacity-60 dark:border-gray-700 dark:text-gray-300"
              >
                {w.resetting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {p.newCoachRun}
              </button>
            </div>
          </>
        ) : w.rescoring ? (
          <div className="hr-glass-card space-y-3 px-5 py-8 text-center">
            <Loader2 size={22} className="mx-auto animate-spin text-primary" />
            <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>
              {p.scoringCompetencyTitle}
            </p>
            <p className={cn("text-[12px]", portalSubtextAlt)}>{p.scoringCompetencyBody}</p>
          </div>
        ) : (
          <div className="hr-glass-card space-y-2 px-5 py-8 text-center">
            <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.reportEmptyTitle}</p>
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
    );
  } else if (w.activeStep === 6) {
    stepBody = (
      <div className="space-y-4">
        {w.hasDraftRoadmap ? (
          <CoachRoadmapPreviewPanel
            roadmaps={w.roadmaps}
            busy={w.busy}
            accepting={w.acceptingRoadmaps}
            onToggleItem={(itemId, isIncluded) => void w.handleUpdateDraftItem(itemId, isIncluded)}
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
          <div className="hr-glass-card space-y-3 px-5 py-8 text-center">
            <Loader2 size={22} className="mx-auto animate-spin text-primary" />
            <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>
              {p.scoringCompetencyTitle}
            </p>
            <p className={cn("text-[12px]", portalSubtextAlt)}>{p.scoringCompetencyBody}</p>
          </div>
        ) : (
          <div className="hr-glass-card space-y-2 px-5 py-8 text-center">
            <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.roadmapEmptyTitle}</p>
            <p className={cn("text-[12px]", portalSubtextAlt)}>
              {w.rescoreError || p.roadmapEmptyBody}
            </p>
          </div>
        )}
      </div>
    );
  } else if (w.activeStep === 7) {
    stepBody = (
      <div className="space-y-4">
        <div className="hr-glass-card space-y-1 px-5 py-4">
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
          <div className="hr-glass-card space-y-2 px-5 py-4">
            <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>{p.reportTitle}</p>
            <div className="flex flex-wrap items-center gap-3 text-[12px]">
              {w.report.overallReadiness != null && (
                <span className={cn("font-semibold", portalHeadingAlt)}>
                  {p.overallReadiness}: {Math.round(w.report.overallReadiness)}%
                </span>
              )}
              {w.report.achievedLevel && (
                <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase text-primary">
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
          <div className="hr-glass-card space-y-2 px-5 py-8 text-center">
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
    );
  }

  const generatingOverlay =
    typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            {showGeneratingOverlay && (
              <motion.div
                key="coach-gen-overlay"
                className="fixed inset-0 z-9999 flex items-center justify-center p-4"
                initial={reduced ? false : "hidden"}
                animate="visible"
                exit="exit"
              >
                <motion.div
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  aria-hidden
                  variants={overlayBackdropVariants}
                  initial={reduced ? false : "hidden"}
                  animate="visible"
                  exit="exit"
                />
                <motion.div
                  className="relative z-10 w-full max-w-md space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900"
                  variants={overlayPanelVariants}
                  initial={reduced ? false : "hidden"}
                  animate="visible"
                  exit="exit"
                >
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
                      className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
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
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-[12px] font-semibold text-red-600 disabled:opacity-50"
                    >
                      {w.cancelling ? <Loader2 size={12} className="animate-spin" /> : null}
                      {p.cancelGeneration}
                    </button>
                    <Link
                      href="/candidate/practice"
                      className="inline-flex h-9 items-center rounded-lg px-3 text-[12px] font-semibold text-primary hover:underline"
                    >
                      {p.browseWhileWaiting} →
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )
      : null;

  if (w.loading) {
    return <CoachPageSkeleton />;
  }

  return (
    <motion.div
      className="space-y-3 pb-10"
      variants={staggerContainer}
      {...safe}
    >
      {generatingOverlay}

      <motion.div variants={staggerItem}>
        <CoachHero
          isPremium={w.isPremium}
          onUpgrade={() => w.setUpgradeOpen(true)}
          showNewRun={showNewRun}
          newRunBusy={w.resetting}
          onNewRun={() => setNewRunConfirmOpen(true)}
        />
      </motion.div>

      <motion.div variants={staggerItem}>
        <CoachSteps
          activeStep={w.activeStep}
          maxUnlockedStep={w.maxUnlockedStep}
          minSelectableStep={w.minSelectableStep}
          onSelect={w.selectStep}
        />
      </motion.div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.55fr)]">
        <div className="min-w-0 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={w.activeStep}
              variants={stepContentVariants}
              initial={reduced ? false : "initial"}
              animate="animate"
              exit="exit"
            >
              {stepBody}
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.aside
          className="space-y-2.5 self-start lg:sticky lg:top-20"
          variants={fadeUp}
          {...safe}
          transition={{ delay: reduced ? 0 : 0.12 }}
        >
          <CoachInsightCards context={w.context} report={w.report} />

          <CoachMarketplacePanel skills={w.roadmaps.map((r) => r.skill)} />

          {!w.isPremium && (
            <motion.button
              type="button"
              onClick={() => w.setUpgradeOpen(true)}
              className="hr-glass-card w-full px-3 py-3 text-left transition-colors hover:border-primary/30"
              whileHover={reduced ? undefined : { y: -1 }}
              transition={{ duration: 0.2 }}
            >
              <p
                className={cn(
                  "inline-flex items-center gap-1.5 text-[12px] font-semibold",
                  portalHeadingAlt
                )}
              >
                <Sparkles size={13} className="text-primary" />
                {p.upgradeTitle}
              </p>
              <p className={cn("mt-1 text-[11px] leading-snug", portalSubtextAlt)}>{p.upgradeDesc}</p>
              <span className="mt-2 inline-flex text-[11px] font-semibold text-primary">
                {p.upgradeCta} →
              </span>
            </motion.button>
          )}
        </motion.aside>
      </div>

      <CoachNewRunConfirmModal
        open={newRunConfirmOpen}
        busy={w.resetting}
        onClose={() => {
          if (!w.resetting) setNewRunConfirmOpen(false);
        }}
        onConfirm={() => {
          void (async () => {
            await w.startNewRun();
            setNewRunConfirmOpen(false);
          })();
        }}
      />

      {w.upgradeOpen && <UpgradeModal onClose={() => w.setUpgradeOpen(false)} />}
    </motion.div>
  );
}
