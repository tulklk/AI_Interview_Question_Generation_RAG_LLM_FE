"use client";

import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { pricingPlansJobSeeker, pricingPlansRecruiter } from "@/data/guest";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { CosmicField } from "@/components/guest/cosmic-field";
import type { Translations } from "@/lib/i18n/en";
import type { PricingPlan } from "@/types/guest";

type PlanI18n =
  | Translations["pricing"]["jobSeeker"]["plans"][number]
  | Translations["pricing"]["recruiter"]["plans"][number];

function PricingPlanCard({
  plan,
  planT,
  animation,
  delay,
  mostPopularLabel,
}: {
  plan: PricingPlan;
  planT: PlanI18n;
  animation: "fade-up" | "scale-in";
  delay: number;
  mostPopularLabel: string;
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

  const isEnterpriseCta = plan.id === "enterprise" || plan.id === "hr-enterprise";
  const isMutedLeadPlan = plan.id === "free" || plan.id === "hr-basic";

  return (
    <ScrollReveal
      animation={animation}
      delay={delay}
      className={cn(
        "relative rounded-xl border flex flex-col gap-5 sm:gap-6 h-full w-full p-6 sm:p-7 min-h-0",
        plan.highlighted
          ? "bg-gradient-to-b from-[#6c47ff] to-[#7c5cff] border-[#6c47ff] text-white z-10 shadow-xl shadow-[#6c47ff]/30 ring-1 ring-white/15 md:scale-[1.02] md:shadow-2xl md:shadow-[#6c47ff]/25"
          : isMutedLeadPlan
            ? "bg-slate-50/90 dark:bg-gray-900/80 border-slate-200/90 dark:border-gray-700 shadow-sm"
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm"
      )}
    >
      {plan.highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
          <span className="bg-white text-[#6c47ff] text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md border border-[#6c47ff]/15 whitespace-nowrap">
            {badgeLabel}
          </span>
        </div>
      )}

      <div className={cn(plan.highlighted && "pt-1")}>
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
                className={cn(
                  "shrink-0 mt-0.5",
                  plan.highlighted ? "text-white" : "text-emerald-500"
                )}
              />
            ) : (
              <XCircle
                size={16}
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

      <Link
        href="/login"
        className={cn(
          "mt-auto w-full text-center text-sm font-semibold py-3 sm:py-3.5 rounded-lg transition-colors min-h-[44px] inline-flex items-center justify-center",
          plan.highlighted
            ? "bg-white text-[#6c47ff] hover:bg-white/90 shadow-sm"
            : isEnterpriseCta
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-[#6c47ff] text-white hover:bg-[#5535dd]"
        )}
      >
        {planT.cta}
      </Link>
    </ScrollReveal>
  );
}

export function PricingSection() {
  const { t } = useLanguage();
  const p = t.pricing;

  return (
    <section id="pricing" className="relative bg-white/92 dark:bg-gray-950/85 py-16 sm:py-20 px-4 sm:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <CosmicField variant="compact" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto">
        <ScrollReveal animation="fade-up" className="text-center mb-10 sm:mb-12">
          <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">
            {p.sectionLabel}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">{p.headline}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed px-1">
            {p.introSubtext}
          </p>
        </ScrollReveal>

        <div className="mb-16 sm:mb-20">
          <ScrollReveal
            animation="fade-up"
            className="text-center mb-8 sm:mb-10 max-w-2xl mx-auto px-1"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              {p.jobSeeker.title}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2.5 text-sm sm:text-base leading-relaxed">
              {p.jobSeeker.subtext}
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-8 items-stretch max-w-4xl mx-auto md:items-start">
            {pricingPlansJobSeeker.map((plan, i) => {
              const planT = p.jobSeeker.plans[i];
              if (!planT) return null;
              const animation = plan.highlighted ? "scale-in" : "fade-up";
              const orderClass = plan.highlighted
                ? "order-1 md:order-2"
                : "order-2 md:order-1";

              return (
                <div key={plan.id} className={cn("min-h-0 flex w-full", orderClass)}>
                  <PricingPlanCard
                    plan={plan}
                    planT={planT}
                    animation={animation}
                    delay={i * 80}
                    mostPopularLabel={p.mostPopular}
                  />
                </div>
              );
            })}
          </div>

          <ScrollReveal animation="fade-up" delay={120} className="mt-8 sm:mt-10 text-center px-2">
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed font-medium">
              {p.jobSeeker.comparisonNote}
            </p>
          </ScrollReveal>
        </div>

        <div>
          <ScrollReveal
            animation="fade-up"
            className="text-center mb-6 sm:mb-8 max-w-3xl mx-auto px-1"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
              {p.recruiter.title}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2.5 text-sm sm:text-base leading-relaxed">
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
                    className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-gray-900 border border-gray-200/90 dark:border-gray-700 rounded-full px-3.5 py-1.5 shadow-sm max-w-full sm:max-w-[340px] leading-snug"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6 items-stretch max-w-7xl mx-auto">
            {pricingPlansRecruiter.map((plan, i) => {
              const planT = p.recruiter.plans[i];
              if (!planT) return null;
              const animation = plan.highlighted ? "scale-in" : "fade-up";
              return (
                <div key={plan.id} className="min-h-0 flex w-full">
                  <PricingPlanCard
                    plan={plan}
                    planT={planT}
                    animation={animation}
                    delay={i * 70}
                    mostPopularLabel={p.mostPopular}
                  />
                </div>
              );
            })}
          </div>

          {"upgradeWhy" in p.recruiter && p.recruiter.upgradeWhy ? (
            <ScrollReveal animation="fade-up" delay={100} className="mt-14 sm:mt-16 max-w-5xl mx-auto">
              <div className="rounded-2xl border border-gray-200/90 dark:border-gray-700 bg-white/90 dark:bg-gray-900 shadow-sm px-5 py-8 sm:px-8 sm:py-10">
                <h4 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-50 text-center tracking-tight">
                  {p.recruiter.upgradeWhy.title}
                </h4>
                <ol className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  {p.recruiter.upgradeWhy.points.map((pt, pi) => (
                    <li key={pi} className="flex gap-4">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6c47ff]/10 text-sm font-bold text-[#6c47ff]"
                        aria-hidden
                      >
                        {pi + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{pt.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{pt.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mt-8 sm:mt-10 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-3xl mx-auto border-t border-gray-100 dark:border-gray-800 pt-6">
                  {p.recruiter.upgradeWhy.footnote}
                </p>
              </div>
            </ScrollReveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
