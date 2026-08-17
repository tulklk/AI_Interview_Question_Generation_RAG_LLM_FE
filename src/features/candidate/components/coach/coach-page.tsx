"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, FileText, Store, Target } from "lucide-react";
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
import { registerCoachJob } from "@/features/candidate/utils/coach-job-storage";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import { CoachHero } from "@/features/candidate/components/coach/coach-hero";
import { CoachSteps, type CoachStepIndex } from "@/features/candidate/components/coach/coach-steps";
import { CoachStatusCard, type CoachStatusKind } from "@/features/candidate/components/coach/coach-status-card";
import { CoachSkillPlan } from "@/features/candidate/components/coach/coach-skill-plan";

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
    setSubmitting(true);
    try {
      const next = await start();
      if (!next.id) throw new Error(p.generateFailed);
      setJob(next);
      registerCoachJob(next);
      addToast("success", p.queuedStayToast);
    } catch (e) {
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
  const compared = (plan?.items ?? []).filter((i) => i.currentScore != null && i.baselineScore != null);
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
        <div className="lg:col-span-2 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="hr-glass-card p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <FileText size={14} className="text-gray-500 dark:text-gray-400" />
                </div>
                <p className={cn("text-[14px] font-semibold", portalHeadingAlt)}>{p.skillsFromCv}</p>
              </div>
              <p className={cn("text-[12px]", portalSubtextAlt)}>
                {cv?.fileName
                  ? fillTemplate(p.cvFile, { name: cv.fileName })
                  : fillTemplate(p.skillsCount, { count: String(skills.length) })}
              </p>
            </div>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="text-[12px] px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className={cn("text-[13px]", portalSubtextAlt)}>{p.noSkillsYet}</p>
            )}
            {hasCv === false && (
              <p className={cn("text-[13px]", portalSubtextAlt)}>
                {p.needCv}{" "}
                <Link href="/jobseeker/settings?tab=profile" className="text-primary font-semibold">
                  {p.uploadCv}
                </Link>
              </p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <CoachStatusCard
              status={statusKind}
              purposeLabel={purposeLabel}
              errorMessage={error}
              onTake={() => router.push(`/jobseeker/sets/${job!.questionSetId}`)}
              onRetry={() => void runDiagnostic()}
            />
          </motion.div>
        </div>

        <div className="space-y-5">
          <div className="hr-glass-card p-5">
            <p className={cn("text-[13px] font-semibold mb-4", portalHeadingAlt)}>{p.summaryTitle}</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className={cn("text-[11px] uppercase tracking-wide", portalSubtextAlt)}>{p.statSkills}</p>
                <p className={cn("text-[20px] font-[800] mt-0.5", portalHeadingAlt)}>{plan?.items.length ?? 0}</p>
              </div>
              <div>
                <p className={cn("text-[11px] uppercase tracking-wide", portalSubtextAlt)}>{p.statDone}</p>
                <p className={cn("text-[20px] font-[800] mt-0.5", portalHeadingAlt)}>{doneCount}</p>
              </div>
              <div>
                <p className={cn("text-[11px] uppercase tracking-wide", portalSubtextAlt)}>{p.statAvgScore}</p>
                <p className={cn("text-[20px] font-[800] mt-0.5", portalHeadingAlt)}>{avgScore ?? "—"}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className={cn("text-[11px] uppercase tracking-wide mb-1.5", portalSubtextAlt)}>{p.trendTitle}</p>
              {improvingCount === 0 && decliningCount === 0 ? (
                <p className={cn("text-[13px]", portalSubtextAlt)}>{p.trendSteady}</p>
              ) : (
                <p className="text-[13px] font-medium">
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
                href={`/jobseeker/sets/${plan.sourceDiagnosticSetId}`}
                className="inline-block mt-4 text-[12px] text-primary font-semibold hover:underline"
              >
                {p.openSet}
              </Link>
            )}
          </div>

          <div className="hr-glass-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Store size={14} className="text-primary" />
              <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.marketplaceCardTitle}</p>
            </div>
            <p className={cn("text-[13px] mb-3", portalSubtextAlt)}>{p.marketplaceCardBody}</p>
            <Link
              href="/jobseeker/practice"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
            >
              {p.marketplaceCta}
            </Link>
          </div>

          {!isPremium && (
            <div className="hr-glass-card p-5">
              <p className={cn("text-[14px] font-semibold", portalHeadingAlt)}>{p.upgradeTitle}</p>
              <p className={cn("text-[13px] mt-1 mb-3", portalSubtextAlt)}>{p.upgradeBody}</p>
              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-10 px-4 rounded-lg text-[13px] font-semibold text-white"
              >
                <Crown size={14} />
                {p.upgradeCta}
              </button>
            </div>
          )}
        </div>
      </div>

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
      ) : null}

      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}
