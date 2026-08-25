"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, BadgeCheck, Zap, Download, Bot, Shield, Globe, Users, Briefcase } from "lucide-react";

// Icons for the 5 upgradeWhy points (in order)
const UPGRADE_WHY_ICONS = [Zap, Download, Bot, Shield, Globe];
const UPGRADE_WHY_COLORS = [
  "text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/50",
  "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/50",
  "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50",
  "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50",
  "text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/50",
];
import { useLanguage } from "@/shared/providers/language-context";
import { pricingPlansJobSeeker, pricingPlansRecruiter } from "@/features/guest/data/guest";
import { cn } from "@/lib/cn";
import { ScrollReveal } from "@/shared/components/common/scroll-reveal";
import { CosmicField } from "@/features/guest/components/cosmic-field";
import { useUser } from "@/features/auth";
import { getUserRole } from "@/core/auth/permissions";
import { getCandidateSubscription } from "@/features/candidate/services/candidate-billing.service";
import {
  getMySubscription,
  isPremiumPlanCode,
  listSubscriptionPlans,
  type SubscriptionPlan,
} from "@/features/subscription/services/subscription.service";
import type { Translations } from "@/core/i18n/en";
import type { PricingPlan } from "@/features/guest/types/guest";

type Tab = "candidate" | "hr";

type PlanI18n =
  | Translations["pricing"]["jobSeeker"]["plans"][number]
  | Translations["pricing"]["recruiter"]["plans"][number];

function formatVnd(amount: number): string {
  if (amount <= 0) return "0₫";
  return `${Math.round(amount).toLocaleString("vi-VN")}₫`;
}

function candidatePlanIdFromType(planType: string): string {
  return planType === "PREMIUM" ? "premium" : "free";
}

function hrPlanIdFromCode(planCode: string): string {
  return isPremiumPlanCode(planCode) ? "hr-premium" : "hr-free";
}

function applyLivePrice(plan: PricingPlan, live: SubscriptionPlan | undefined): PricingPlan {
  if (!live) return plan;
  return { ...plan, price: formatVnd(live.priceMonthly) };
}

function PricingPlanCard({
  plan,
  planT,
  animation,
  delay,
  mostPopularLabel,
  isCurrentPlan,
  isLoggedIn,
  isCrossRole,
  manageHref,
  upgradeHref,
  currentPlanLabel,
  managePlanLabel,
  upgradePlanLabel,
}: {
  plan: PricingPlan;
  planT: PlanI18n;
  animation: "fade-up" | "scale-in";
  delay: number;
  mostPopularLabel: string;
  isCurrentPlan: boolean;
  isLoggedIn: boolean;
  /** True when this plan belongs to a different role than the logged-in user */
  isCrossRole: boolean;
  manageHref: string;
  upgradeHref: string;
  currentPlanLabel: string;
  managePlanLabel: string;
  upgradePlanLabel: string;
}) {
  const footnote =
    "priceFootnote" in planT && typeof planT.priceFootnote === "string"
      ? planT.priceFootnote
      : undefined;

  const badgeLabel =
    plan.highlighted &&
    "badge" in planT &&
    typeof planT.badge === "string" &&
    planT.badge.length > 0
      ? planT.badge
      : mostPopularLabel;

  const isMutedLeadPlan = plan.id === "free" || plan.id === "hr-free";
  // "Free" tier plan (not paid) — for logged-in users who aren't on it
  const isFreeTier = plan.id === "free" || plan.id === "hr-free";

  // ── Determine CTA state ──
  type CtaVariant = "manage" | "upgrade" | "disabled-cross" | "disabled-free" | "guest";
  let ctaVariant: CtaVariant;

  if (isCurrentPlan) {
    ctaVariant = "manage";
  } else if (isCrossRole) {
    ctaVariant = "disabled-cross";
  } else if (isLoggedIn && isFreeTier) {
    // Logged-in user viewing the Free plan they're not currently on
    ctaVariant = "disabled-free";
  } else if (isLoggedIn) {
    ctaVariant = "upgrade";
  } else {
    ctaVariant = "guest";
  }

  const ctaMap: Record<CtaVariant, { href: string; label: string; cls: string; icon?: boolean; disabled?: boolean }> = {
    manage: {
      href: manageHref,
      label: managePlanLabel,
      icon: true,
      cls: plan.highlighted
        ? "bg-white/20 text-white border border-white/40 hover:bg-white/30"
        : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    },
    upgrade: {
      href: upgradeHref,
      label: plan.highlighted ? upgradePlanLabel : planT.cta,
      cls: plan.highlighted
        ? "bg-white text-primary hover:bg-white/90 shadow-sm"
        : "bg-primary text-white hover:bg-primary/85",
    },
    "disabled-cross": {
      href: "#",
      label: "Không áp dụng cho tài khoản này",
      disabled: true,
      cls: plan.highlighted
        ? "bg-white/10 text-white/40 border border-white/20 cursor-not-allowed"
        : "bg-gray-100 text-gray-400 border border-gray-200 dark:bg-gray-800/60 dark:text-gray-600 dark:border-gray-700/60 cursor-not-allowed",
    },
    "disabled-free": {
      href: "#",
      label: "Bạn đã có tài khoản",
      disabled: true,
      cls: plan.highlighted
        ? "bg-white/10 text-white/40 border border-white/20 cursor-not-allowed"
        : "bg-gray-100 text-gray-400 border border-gray-200 dark:bg-gray-800/60 dark:text-gray-600 dark:border-gray-700/60 cursor-not-allowed",
    },
    guest: {
      href: "/login",
      label: planT.cta,
      cls: plan.highlighted
        ? "bg-white text-primary hover:bg-white/90 shadow-sm"
        : "bg-primary text-white hover:bg-primary/85",
    },
  };

  const cta = ctaMap[ctaVariant];

  return (
    <ScrollReveal
      animation={animation}
      delay={delay}
      className={cn(
        "relative rounded-xl border flex flex-col gap-5 sm:gap-6 h-full w-full p-6 sm:p-7 min-h-0",
        plan.highlighted
          ? "bg-linear-to-b from-primary to-[#7c5cff] border-primary text-white z-10 shadow-xl shadow-primary/30 ring-1 ring-white/15 md:scale-[1.02] md:shadow-2xl md:shadow-primary/25"
          : isMutedLeadPlan
            ? "bg-slate-50/90 dark:bg-gray-900/80 border-slate-200/90 dark:border-gray-700 shadow-sm"
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm"
      )}
    >
      {(plan.highlighted || isCurrentPlan) && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
          <span
            className={cn(
              "text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md border whitespace-nowrap flex items-center gap-1.5",
              isCurrentPlan
                ? "bg-emerald-500 text-white border-emerald-400/30"
                : "bg-white text-primary border-primary/15"
            )}
          >
            {isCurrentPlan && <BadgeCheck size={12} />}
            {isCurrentPlan ? currentPlanLabel : badgeLabel}
          </span>
        </div>
      )}

      <div className={cn((plan.highlighted || isCurrentPlan) && "pt-1")}>
        <p
          className={cn(
            "text-sm font-semibold mb-2.5 sm:mb-3 tracking-tight",
            plan.highlighted ? "text-white/75" : "text-gray-500 dark:text-gray-400"
          )}
        >
          {planT.name}
        </p>
        <div className="flex flex-wrap items-end gap-x-1 gap-y-0.5 mb-1">
          <span
            className={cn(
              "text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums",
              plan.highlighted ? "text-white" : "text-gray-900 dark:text-gray-100"
            )}
          >
            {plan.price}
          </span>
          {planT.period.trim().length > 0 ? (
            <span
              className={cn(
                "text-sm font-medium pb-0.5 sm:pb-1",
                plan.highlighted ? "text-white/65" : "text-gray-400 dark:text-gray-500"
              )}
            >
              {planT.period}
            </span>
          ) : null}
        </div>
        {footnote ? (
          <p
            className={cn(
              "text-xs sm:text-sm leading-relaxed mt-2.5 max-w-prose",
              plan.highlighted ? "text-white/85" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {footnote}
          </p>
        ) : null}
        <p
          className={cn(
            "text-sm leading-relaxed mt-3 sm:mt-4",
            plan.highlighted ? "text-white/80" : "text-gray-600 dark:text-gray-300"
          )}
        >
          {planT.description}
        </p>
      </div>

      <ul className="space-y-2.5 sm:space-y-3 flex-1 min-h-0">
        {plan.features.map((feature, fi) => (
          <li key={fi} className="flex items-start gap-2.5">
            {feature.included ? (
              <CheckCircle2
                size={16}
                aria-hidden="true"
                className={cn(
                  "shrink-0 mt-0.5",
                  plan.highlighted ? "text-white" : "text-emerald-500"
                )}
              />
            ) : (
              <XCircle
                size={16}
                aria-hidden="true"
                className={cn(
                  "shrink-0 mt-0.5",
                  plan.highlighted ? "text-white/35" : "text-gray-300 dark:text-gray-600"
                )}
              />
            )}
            <span
              className={cn(
                "text-[13px] sm:text-sm leading-relaxed",
                feature.included
                  ? plan.highlighted
                    ? "text-white/95"
                    : "text-gray-700 dark:text-gray-300"
                  : plan.highlighted
                    ? "text-white/45"
                    : "text-gray-400 dark:text-gray-500"
              )}
            >
              {planT.features[fi]}
            </span>
          </li>
        ))}
      </ul>

      {cta.disabled ? (
        <span
          aria-disabled="true"
          className={cn(
            "mt-auto w-full text-center text-sm font-medium py-3 sm:py-3.5 rounded-lg min-h-11 inline-flex items-center justify-center gap-1.5 select-none",
            cta.cls
          )}
        >
          {cta.label}
        </span>
      ) : (
        <Link
          href={cta.href}
          className={cn(
            "mt-auto w-full text-center text-sm font-semibold py-3 sm:py-3.5 rounded-lg transition-colors min-h-11 inline-flex items-center justify-center gap-1.5",
            cta.cls
          )}
        >
          {cta.icon && <BadgeCheck size={14} aria-hidden="true" />}
          {cta.label}
        </Link>
      )}
    </ScrollReveal>
  );
}

export function PricingSection() {
  const { t } = useLanguage();
  const p = t.pricing;
  const { user } = useUser();

  const [candidatePlanId, setCandidatePlanId] = useState<string | null>(null);
  const [hrPlanId, setHrPlanId] = useState<string | null>(null);
  const [liveCandidatePlans, setLiveCandidatePlans] = useState<SubscriptionPlan[]>([]);
  const [liveHrPlans, setLiveHrPlans] = useState<SubscriptionPlan[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("candidate");
  const [slideDir, setSlideDir] = useState<"left" | "right">("right");
  const [contentKey, setContentKey] = useState(0);

  useEffect(() => {
    setRole(getUserRole());
  }, []);

  // Default tab based on role when logged in
  useEffect(() => {
    if (!role) return;
    if (role.toUpperCase().includes("HR")) setActiveTab("hr");
  }, [role]);

  const isLoggedIn = Boolean(user);
  const isJobSeeker =
    !role ||
    role.toUpperCase().includes("JOB") ||
    role.toUpperCase().includes("CANDIDATE") ||
    role.toUpperCase().includes("SEEKER");
  const isHr = role?.toUpperCase().includes("HR") ?? false;

  useEffect(() => {
    void listSubscriptionPlans("Candidate")
      .then(setLiveCandidatePlans)
      .catch(() => setLiveCandidatePlans([]));
    void listSubscriptionPlans("HR")
      .then(setLiveHrPlans)
      .catch(() => setLiveHrPlans([]));
  }, []);

  useEffect(() => {
    if (!user) {
      setCandidatePlanId(null);
      setHrPlanId(null);
      return;
    }
    if (isJobSeeker) {
      getCandidateSubscription()
        .then((sub) => setCandidatePlanId(candidatePlanIdFromType(sub.planType)))
        .catch(() => setCandidatePlanId(null));
    }
    if (isHr) {
      getMySubscription()
        .then((sub) => setHrPlanId(hrPlanIdFromCode(sub.planCode)))
        .catch(() => setHrPlanId(null));
    }
  }, [user, isJobSeeker, isHr]);

  const jobSeekerPlans = useMemo(() => {
    const free = liveCandidatePlans.find((x) => !isPremiumPlanCode(x.code));
    const premium = liveCandidatePlans.find((x) => isPremiumPlanCode(x.code));
    return pricingPlansJobSeeker.map((plan) =>
      applyLivePrice(plan, plan.id === "premium" ? premium : free)
    );
  }, [liveCandidatePlans]);

  const recruiterPlans = useMemo(() => {
    const free = liveHrPlans.find((x) => !isPremiumPlanCode(x.code));
    const premium = liveHrPlans.find((x) => isPremiumPlanCode(x.code));
    return pricingPlansRecruiter.map((plan) =>
      applyLivePrice(plan, plan.id === "hr-premium" ? premium : free)
    );
  }, [liveHrPlans]);

  const jobSeekerManageHref = "/candidate/settings?tab=billing";
  const hrManageHref = "/hr/settings?tab=billing";

  const TAB_ORDER: Tab[] = ["candidate", "hr"];

  function switchTab(tab: Tab) {
    if (tab === activeTab) return;
    const from = TAB_ORDER.indexOf(activeTab);
    const to = TAB_ORDER.indexOf(tab);
    // slide in from right when going forward (0→1), from left when going back (1→0)
    setSlideDir(to > from ? "right" : "left");
    setActiveTab(tab);
    setContentKey((k) => k + 1);
  }

  const tabs: { key: Tab; label: string; sublabel: string; Icon: typeof Users }[] = [
    {
      key: "candidate",
      label: p.jobSeeker.title,
      sublabel: p.jobSeeker.subtext,
      Icon: Users,
    },
    {
      key: "hr",
      label: p.recruiter.title,
      sublabel: p.recruiter.subtext,
      Icon: Briefcase,
    },
  ];

  return (
    <section id="pricing" className="relative bg-white/92 dark:bg-gray-950/85 py-16 sm:py-20 px-4 sm:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <CosmicField variant="compact" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">

        {/* Section header */}
        <ScrollReveal animation="fade-up" className="text-center mb-10 sm:mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            {p.sectionLabel}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            {p.headline}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed px-1">
            {p.introSubtext}
          </p>
        </ScrollReveal>

        {/* ── Tab switcher ── */}
        <ScrollReveal animation="fade-up" delay={60} className="flex justify-center mb-10 sm:mb-12">
          {/* role="tablist" wrapper */}
          <div role="tablist" className="relative inline-flex p-1 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/60 shadow-sm">
            {/* Sliding highlight pill — absolutely positioned, slides between tabs */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-xl bg-white dark:bg-gray-900 shadow-md border border-gray-200/60 dark:border-gray-700/60"
              style={{
                width: "calc(50% - 4px)",
                transform: activeTab === "hr" ? "translateX(calc(100%))" : "translateX(0)",
                transition: "transform 320ms cubic-bezier(0.34, 1.1, 0.64, 1)",
              }}
            />

            {tabs.map(({ key, label, Icon }) => {
              const isActive = key === activeTab;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchTab(key)}
                  aria-selected={isActive}
                  role="tab"
                  className={cn(
                    "relative z-10 flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                    "transition-colors duration-200",
                    isActive
                      ? "text-primary"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  )}
                >
                  <Icon
                    size={16}
                    aria-hidden="true"
                    className={cn(
                      "shrink-0 transition-colors duration-300",
                      isActive ? "text-primary" : "text-gray-400 dark:text-gray-500"
                    )}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* ── Tab content ── */}
        <div
          key={contentKey}
          className={cn(
            "overflow-hidden",
            slideDir === "right" ? "animate-slide-right" : "animate-slide-left"
          )}
        >
          {/* ── CANDIDATE TAB ── */}
          {activeTab === "candidate" && (
            <div>
              <div className="text-center mb-8 sm:mb-10 max-w-2xl mx-auto px-1">
                <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base leading-relaxed">
                  {p.jobSeeker.subtext}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-8 items-stretch max-w-4xl mx-auto md:items-start">
                {jobSeekerPlans.map((plan, i) => {
                  const planT = p.jobSeeker.plans[i];
                  if (!planT) return null;
                  const animation = plan.highlighted ? "scale-in" : "fade-up";
                  const orderClass = plan.highlighted ? "order-1 md:order-2" : "order-2 md:order-1";
                  // Only a logged-in JobSeeker has a "current plan" on this tab
                  const isCurrentPlan = isLoggedIn && isJobSeeker && !isHr && candidatePlanId === plan.id;
                  // HR user looking at Candidate plans → cross-role (buttons disabled)
                  const isCrossRole = isLoggedIn && isHr;

                  return (
                    <div key={plan.id} className={cn("min-h-0 flex w-full", orderClass)}>
                      <PricingPlanCard
                        plan={plan}
                        planT={planT}
                        animation={animation}
                        delay={i * 80}
                        mostPopularLabel={p.mostPopular}
                        isCurrentPlan={isCurrentPlan}
                        isLoggedIn={isLoggedIn}
                        isCrossRole={isCrossRole}
                        manageHref={jobSeekerManageHref}
                        upgradeHref={jobSeekerManageHref}
                        currentPlanLabel={p.currentPlanBadge}
                        managePlanLabel={p.managePlan}
                        upgradePlanLabel={p.upgradePlan}
                      />
                    </div>
                  );
                })}
              </div>

              {p.jobSeeker.comparisonNote && (
                <div className="mt-8 sm:mt-10 text-center px-2">
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed font-medium">
                    {p.jobSeeker.comparisonNote}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── HR TAB ── */}
          {activeTab === "hr" && (
            <div>
              <div className="text-center mb-6 sm:mb-8 max-w-3xl mx-auto px-1">
                <p className="text-gray-500 dark:text-gray-400 mt-0 text-sm sm:text-base leading-relaxed">
                  {p.recruiter.subtext}
                </p>
                {"valueMessage" in p.recruiter && p.recruiter.valueMessage ? (
                  <p className="text-gray-600 dark:text-gray-300 mt-4 text-sm sm:text-[15px] leading-relaxed font-medium max-w-2xl mx-auto">
                    {p.recruiter.valueMessage}
                  </p>
                ) : null}
                {"highlights" in p.recruiter && Array.isArray(p.recruiter.highlights) ? (
                  <ul className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-2.5 max-w-4xl mx-auto text-left">
                    {p.recruiter.highlights.map((line, hi) => (
                      <li
                        key={hi}
                        className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-gray-900 border border-gray-200/90 dark:border-gray-700 rounded-full px-3.5 py-1.5 shadow-sm max-w-full sm:max-w-85 leading-snug"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-8 items-stretch max-w-4xl mx-auto md:items-start">
                {recruiterPlans.map((plan, i) => {
                  const planT = p.recruiter.plans[i];
                  if (!planT) return null;
                  const animation = plan.highlighted ? "scale-in" : "fade-up";
                  const orderClass = plan.highlighted ? "order-1 md:order-2" : "order-2 md:order-1";
                  // Only a logged-in HR user has a "current plan" on this tab
                  const isCurrentPlan = isLoggedIn && isHr && hrPlanId === plan.id;
                  // Candidate/JobSeeker looking at HR plans → cross-role (buttons disabled)
                  const isCrossRole = isLoggedIn && !isHr;

                  return (
                    <div key={plan.id} className={cn("min-h-0 flex w-full", orderClass)}>
                      <PricingPlanCard
                        plan={plan}
                        planT={planT}
                        animation={animation}
                        delay={i * 70}
                        mostPopularLabel={p.mostPopular}
                        isCurrentPlan={isCurrentPlan}
                        isLoggedIn={isLoggedIn}
                        isCrossRole={isCrossRole}
                        manageHref={hrManageHref}
                        upgradeHref={hrManageHref}
                        currentPlanLabel={p.currentPlanBadge}
                        managePlanLabel={p.managePlan}
                        upgradePlanLabel={p.upgradePlan}
                      />
                    </div>
                  );
                })}
              </div>

              {"upgradeWhy" in p.recruiter && p.recruiter.upgradeWhy ? (
                <div className="mt-12 sm:mt-14 max-w-5xl mx-auto">
                  <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700 bg-white/90 dark:bg-gray-900 shadow-sm px-5 py-7 sm:px-8 sm:py-8">
                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-50 text-center tracking-tight mb-6">
                      {p.recruiter.upgradeWhy.title}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                      {p.recruiter.upgradeWhy.points.map((pt, pi) => {
                        const Icon = UPGRADE_WHY_ICONS[pi] ?? Zap;
                        const colorClass = UPGRADE_WHY_COLORS[pi] ?? UPGRADE_WHY_COLORS[0];
                        return (
                          <div key={pi} className="flex flex-col items-center text-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", colorClass)}>
                              <Icon size={18} aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">{pt.title}</p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{pt.body}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-6 text-center text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed max-w-2xl mx-auto border-t border-gray-100 dark:border-gray-800 pt-5">
                      {p.recruiter.upgradeWhy.footnote}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
