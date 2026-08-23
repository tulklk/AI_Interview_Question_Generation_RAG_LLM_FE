"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, FileText, Loader2, Target, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useCandidateSubscription } from "@/features/candidate/context/candidate-subscription-context";
import { UpgradeModal } from "@/features/candidate/components/billing/upgrade-modal";
import { getCv, type CvInfo } from "@/features/candidate/services/candidate-cv.service";
import { extractErrorMessage } from "@/core/interceptors/error.interceptor";
import {
  getActiveCoachJob,
  getCoachJob,
  getCoachPlan,
  startCvDiagnostic,
  startCvDrill,
  type CoachJob,
  type CoachPlan,
} from "@/features/candidate/services/coach.service";
import { useToast } from "@/shared/providers/toast-context";
import { useUser } from "@/features/auth/context/user-context";
import { registerCoachJob, writeCoachJobEntry } from "@/features/candidate/utils/coach-job-storage";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import { CoachHero } from "@/features/candidate/components/coach/coach-hero";
import { CoachSteps, type CoachStepIndex } from "@/features/candidate/components/coach/coach-steps";
import { CoachStatusCard, type CoachStatusKind } from "@/features/candidate/components/coach/coach-status-card";
import { CoachSkillPlan } from "@/features/candidate/components/coach/coach-skill-plan";
import { CoachMarketplacePanel } from "@/features/candidate/components/coach/coach-marketplace-panel";

function apiError(e: unknown, fallback: string, lang: "en" | "vi"): string {
  const extracted = extractErrorMessage(e, lang);
  if (extracted && extracted !== "Something went wrong. Please try again.") return extracted;
  const msg = (e as { response?: { data?: { error?: string; Error?: string } } })?.response?.data;
  return msg?.error || msg?.Error || (e instanceof Error ? e.message : fallback);
}

function jobBusy(job: CoachJob | null): boolean {
  const s = (job?.status ?? "").toUpperCase();
  return s === "QUEUED" || s === "GENERATING";
}

function jobDone(job: CoachJob | null): boolean {
  return (job?.status ?? "").toUpperCase() === "COMPLETED" && Boolean(job?.questionSetId);
}

function uniqueSkills(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const raw of list ?? []) {
      const s = raw.trim();
      if (!s) continue;
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
  }
  return out.slice(0, 12);
}

/**
 * Derive a display-friendly name from a raw CV filename.
 * "Phan-Thanh-Tu-TopCV...pdf" → "Phan Thanh Tu"
 * Takes the first 3 dash/underscore-separated segments and title-cases them.
 */
function humanizeCvName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, ""); // strip extension
  const words = base.split(/[-_\s]+/).filter(Boolean);
  return words
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function CoachPage() {
  const { t, lang } = useLanguage();
  const p = t.jobseekerCoachPage;
  const router = useRouter();
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
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [job, setJob] = useState<CoachJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skills = useMemo(
    () => uniqueSkills(cv?.skills, cv?.techStack, profileSkills),
    [cv?.skills, cv?.techStack, profileSkills]
  );

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

    Promise.allSettled([getCoachPlan(), getActiveCoachJob()])
      .then((results) => {
        if (cancelled) return;
        const planResult = results[0];
        const jobResult = results[1];
        if (planResult.status === "fulfilled") setPlan(planResult.value);
        if (jobResult.status === "fulfilled" && jobResult.value?.id) {
          setJob(jobResult.value);
          registerCoachJob(jobResult.value);
        }
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
          void getCoachPlan().then((pl) => {
            if (!cancelled) setPlan(pl);
          });
        } else if (next.status.toUpperCase() === "FAILED") {
          setError(next.errorMessage || p.generateFailed);
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
  }, [job?.id, addToast, p.readyBadge, p.generateFailed]);

  async function enqueueJob(start: () => Promise<CoachJob>) {
    setError(null);
    setOverlayDismissed(false); // reset so overlay shows fresh on each new job
    setSubmitting(true);
    // Write a sentinel entry immediately so CoachGenerationBadge appears as soon as
    // the user dismisses the overlay — even before the API responds. The sentinel id
    // "__pending__" tells the badge to render but skip polling (no real job id yet).
    writeCoachJobEntry({ id: "__pending__", status: "QUEUED" });
    try {
      const next = await start();
      if (!next.id) throw new Error(p.generateFailed);
      setJob(next);
      registerCoachJob(next); // overwrites sentinel with real job entry
      addToast("success", p.queuedStayToast);
    } catch (e) {
      writeCoachJobEntry(null); // clear sentinel so badge disappears on error
      setError(apiError(e, p.generateFailed, lang));
    } finally {
      setSubmitting(false);
    }
  }

  async function runDiagnostic() {
    if (!isPremium) {
      setUpgradeOpen(true);
      return;
    }
    if (!hasCv) {
      setError(p.needCv);
      return;
    }
    await enqueueJob(() => startCvDiagnostic());
  }

  async function runDrill(skill: string) {
    if (!isPremium) {
      setUpgradeOpen(true);
      return;
    }
    await enqueueJob(() => startCvDrill(skill));
  }

  const purposeLabel =
    (job?.purpose ?? "").toLowerCase().includes("drill") ? p.purposeDrill : p.purposeDiagnostic;

  const busy = submitting || jobBusy(job);
  const ready = jobDone(job);

  const statusKind: CoachStatusKind = error
    ? "error"
    : busy
      ? "generating"
      : ready
        ? "ready"
        : "idle";

  const activeStep: CoachStepIndex =
    skills.length === 0 && hasCv === false
      ? 1
      : plan && plan.items.length > 0
        ? 3
        : 2;

  const scored = (plan?.items ?? []).filter((i) => i.currentScore != null);
  const avgScore =
    scored.length === 0
      ? null
      : Math.round(scored.reduce((sum, i) => sum + (i.currentScore ?? 0), 0) / scored.length);
  const doneCount = (plan?.items ?? []).filter((i) => i.status === "done").length;
  // Exclude items with currentScore=0 from trend: a zero almost always means
  // "unscored yet" (no session completed), not a genuine score of zero.
  const compared = (plan?.items ?? []).filter(
    (i) => i.currentScore != null && i.currentScore > 0 && i.baselineScore != null
  );
  const improvingCount = compared.filter((i) => (i.currentScore ?? 0) > (i.baselineScore ?? 0)).length;
  const decliningCount = compared.filter((i) => (i.currentScore ?? 0) < (i.baselineScore ?? 0)).length;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <CoachHero
          isPremium={isPremium}
          busy={busy}
          hasPlan={Boolean(plan)}
          diagnosticDisabled={hasCv === false}
          onPrimary={() => void runDiagnostic()}
          onUpgrade={() => setUpgradeOpen(true)}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <CoachSteps activeStep={activeStep} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left column (2/3) ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Skills from CV */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="hr-glass-card overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                  <FileText size={13} className="text-charcoal dark:text-gray-100" />
                </div>
                <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.skillsFromCv}</p>
              </div>
              {(cv?.fileName || skills.length > 0) && (
                <p
                  className={cn("text-[11px] font-medium truncate max-w-50", portalSubtextAlt)}
                  title={cv?.fileName ?? undefined}
                >
                  {cv?.fileName
                    ? fillTemplate(p.cvFile, { name: humanizeCvName(cv.fileName) })
                    : fillTemplate(p.skillsCount, { count: String(skills.length) })}
                </p>
              )}
            </div>
            <div className="px-5 py-4">
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => {
                    const skillIcon = getSkillIcon(s);
                    const SkillIcon = skillIcon?.icon;
                    return (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-charcoal dark:text-gray-100 font-medium"
                      >
                        {SkillIcon && (
                          <SkillIcon size={12} className={cn("shrink-0", skillIcon.className)} />
                        )}
                        {s}
                      </span>
                    );
                  })}
                </div>
              ) : hasCv === false ? (
                <p className={cn("text-[13px]", portalSubtextAlt)}>
                  {p.needCv}{" "}
                  <Link href="/candidate/settings?tab=profile" className="text-primary font-semibold hover:underline">
                    {p.uploadCv}
                  </Link>
                </p>
              ) : (
                <p className={cn("text-[13px]", portalSubtextAlt)}>{p.noSkillsYet}</p>
              )}
            </div>
          </motion.div>

          {/* Status card — only when generating / ready / error (NOT idle, NOT during the initial submit call) */}
          {statusKind !== "idle" && !submitting && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <CoachStatusCard
                status={statusKind}
                purposeLabel={purposeLabel}
                errorMessage={error}
                onTake={() => router.push(`/candidate/sets/${job!.questionSetId}`)}
                onRetry={() => void runDiagnostic()}
              />
            </motion.div>
          )}

          {/* Skill plan or empty state — shown in-column, no separate section below */}
          {loading ? (
            <div className="space-y-3">
              <p className={cn("text-[13px]", portalSubtextAlt)}>{p.loadingPlan}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            </div>
          ) : plan && plan.items.length > 0 ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <CoachSkillPlan
                items={plan.items}
                isPremium={isPremium}
                drillDisabled={busy}
                onDrill={(skill) => void runDrill(skill)}
              />
            </motion.div>
          ) : isPremium && !busy && !ready ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="hr-glass-card">
                <EmptyState
                  icon={Target}
                  title={p.emptyPlan}
                  action={
                    <button
                      type="button"
                      disabled={hasCv === false}
                      onClick={() => void runDiagnostic()}
                      className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
                    >
                      {p.startDiagnostic}
                    </button>
                  }
                />
              </div>
            </motion.div>
          ) : null}
        </div>

        {/* ── Right sidebar (1/3) ── */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          {/* Stats overview */}
          <div className="hr-glass-card overflow-hidden shrink-0">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <p className={cn("text-[12px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>{p.summaryTitle}</p>
            </div>
            <div className="px-5 py-4 grid grid-cols-3 gap-3">
              {[
                { label: p.statSkills,   value: plan?.items.length ?? 0 },
                { label: p.statDone,     value: doneCount },
                { label: p.statAvgScore, value: avgScore ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className={cn("text-[22px] font-extrabold leading-none", portalHeadingAlt)}>{value}</p>
                  <p className={cn("text-[10px] uppercase tracking-wide mt-1", portalSubtextAlt)}>{label}</p>
                </div>
              ))}
            </div>
            {/* Hint when all stats are still at zero (no sessions completed) */}
            {doneCount === 0 && avgScore === null && (plan?.items.length ?? 0) > 0 && (
              <p className={cn("text-[11px] text-center px-4 pb-3 -mt-1 leading-relaxed", portalSubtextAlt)}>
                {p.statsZeroHint}
              </p>
            )}
            <div className="px-5 pb-4 pt-0">
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className={cn("text-[10px] font-semibold uppercase tracking-wide mb-1.5", portalSubtextAlt)}>{p.trendTitle}</p>
                {improvingCount === 0 && decliningCount === 0 ? (
                  <p className={cn("text-[12px]", portalSubtextAlt)}>{p.trendSteady}</p>
                ) : (
                  <p className="text-[12px] font-medium">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {fillTemplate(p.trendImproving, { count: String(improvingCount) })}
                    </span>
                    <span className={cn("mx-1.5", portalSubtextAlt)}>·</span>
                    <span className="text-red-600 dark:text-red-400">
                      {fillTemplate(p.trendDeclining, { count: String(decliningCount) })}
                    </span>
                  </p>
                )}
              </div>
              {plan?.sourceDiagnosticSetId && (
                <Link
                  href={`/candidate/sets/${plan.sourceDiagnosticSetId}`}
                  className="inline-block mt-3 text-[12px] text-primary font-semibold hover:underline"
                >
                  {p.openSet}
                </Link>
              )}
            </div>
          </div>

          {/* Marketplace card — shows real question sets */}
          <CoachMarketplacePanel />

          {/* Upgrade card (Free only) */}
          {!isPremium && (
            <div className="hr-glass-card overflow-hidden shrink-0">
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                  <Crown size={12} className="text-amber-500" />
                </div>
                <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>{p.upgradeTitle}</p>
              </div>
              <div className="px-5 py-4">
                <p className={cn("text-[12px] mb-3 leading-relaxed", portalSubtextAlt)}>{p.upgradeBody}</p>
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(true)}
                  className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[12px] font-semibold text-white"
                >
                  <Crown size={13} />
                  {p.upgradeCta}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} />}

      {/* ── Full-screen loading overlay — portalled to <body> so framer-motion
           transform ancestors don't clip `position:fixed` to sub-viewport ── */}
      {submitting && !overlayDismissed && createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="hr-glass-card p-8 flex flex-col items-center gap-5 w-80 text-center relative"
          >
            {/* Dismiss button */}
            <button
              type="button"
              onClick={() => setOverlayDismissed(true)}
              aria-label="Đóng"
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={14} />
            </button>

            {/* Spinner ring */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-primary/10 dark:bg-primary/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={30} className="text-primary animate-spin" />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-1.5">
              <p className={cn("text-[15px] font-semibold", portalHeadingAlt)}>
                {p.generating}
              </p>
              <p className={cn("text-[12px] leading-relaxed", portalSubtextAlt)}>
                {p.generatingBackground}
              </p>
            </div>

            {/* Hint bar — clicking it also dismisses */}
            <button
              type="button"
              onClick={() => setOverlayDismissed(true)}
              className="w-full px-3 py-2 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 hover:bg-primary/10 dark:hover:bg-primary/15 transition-colors"
            >
              <p className="text-[11px] text-primary/80 dark:text-primary/70">
                {p.canLeaveShort} →
              </p>
            </button>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
