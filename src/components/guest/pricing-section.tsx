"use client";

import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { pricingPlans } from "@/data/guest";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

export function PricingSection() {
  const { t } = useLanguage();
  const p = t.pricing;

  return (
    <section id="pricing" className="bg-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal animation="fade-up" className="text-center mb-14">
          <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">
            {p.sectionLabel}
          </p>
          <h2 className="text-3xl font-bold text-gray-900">{p.headline}</h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto text-base leading-relaxed">
            {p.subtext}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {pricingPlans.map((plan, i) => {
            const planT = p.plans[i];
            const animation = plan.highlighted ? "scale-in" : "fade-up";
            const delay = i * 80;

            return (
              <ScrollReveal
                key={plan.id}
                animation={animation}
                delay={delay}
                className={cn(
                  "relative rounded-xl border p-7 flex flex-col gap-6",
                  plan.highlighted
                    ? "bg-gradient-to-b from-[#6c47ff] to-[#7c5cff] border-[#6c47ff] shadow-xl shadow-[#6c47ff]/20 text-white"
                    : "bg-white border-gray-200 shadow-sm"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-white text-[#6c47ff] text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm border border-[#6c47ff]/20 whitespace-nowrap">
                      {p.mostPopular}
                    </span>
                  </div>
                )}

                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold mb-3",
                      plan.highlighted ? "text-white/70" : "text-gray-500"
                    )}
                  >
                    {planT.name}
                  </p>
                  <div className="flex items-end gap-1 mb-2">
                    <span
                      className={cn(
                        "text-4xl font-extrabold",
                        plan.highlighted ? "text-white" : "text-gray-900"
                      )}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-medium pb-1",
                        plan.highlighted ? "text-white/60" : "text-gray-400"
                      )}
                    >
                      {planT.period}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      plan.highlighted ? "text-white/70" : "text-gray-500"
                    )}
                  >
                    {planT.description}
                  </p>
                </div>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-2.5">
                      {feature.included ? (
                        <CheckCircle2
                          size={15}
                          className={cn(
                            "shrink-0 mt-0.5",
                            plan.highlighted ? "text-white" : "text-emerald-500"
                          )}
                        />
                      ) : (
                        <XCircle
                          size={15}
                          className={cn(
                            "shrink-0 mt-0.5",
                            plan.highlighted ? "text-white/30" : "text-gray-300"
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          "text-sm",
                          feature.included
                            ? plan.highlighted
                              ? "text-white/90"
                              : "text-gray-700"
                            : plan.highlighted
                            ? "text-white/40"
                            : "text-gray-400"
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
                    "block text-center text-sm font-semibold py-3 rounded-lg transition-colors",
                    plan.highlighted
                      ? "bg-white text-[#6c47ff] hover:bg-white/90"
                      : plan.id === "enterprise"
                      ? "bg-gray-900 text-white hover:bg-gray-800"
                      : "bg-[#6c47ff] text-white hover:bg-[#5535dd]"
                  )}
                >
                  {planT.cta}
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
