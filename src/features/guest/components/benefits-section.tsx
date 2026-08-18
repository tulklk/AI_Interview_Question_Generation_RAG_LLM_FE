"use client";

import { useLanguage } from "@/shared/providers/language-context";
import { benefits } from "@/features/guest/data/guest";
import { ScrollReveal } from "@/shared/components/common/scroll-reveal";
import { TiltCard } from "@/shared/components/common/tilt-card";
import { CosmicField } from "@/features/guest/components/cosmic-field";

export function BenefitsSection() {
  const { t } = useLanguage();
  const b = t.benefits;

  return (
    <section className="relative bg-[#f5f7fb] dark:bg-[#0b0f1a] py-20 px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <CosmicField variant="compact" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto">
        <ScrollReveal animation="fade-up" className="text-center mb-12">
          <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">
            {b.sectionLabel}
          </p>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{b.headline}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto text-base leading-relaxed">
            {b.subtext}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {benefits.map((item, i) => (
            <ScrollReveal
              key={item.id}
              animation={i % 2 === 0 ? "slide-left" : "slide-right"}
              delay={i * 100}
              className="h-full"
            >
              <TiltCard className="h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 flex flex-col gap-5">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.iconBg}`}
                >
                  <item.icon size={26} className={item.iconColor} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-1.5 leading-snug">
                    {b.items[i].title}
                  </h3>
                  <p className="text-[12px] text-gray-400 dark:text-gray-500 leading-relaxed">
                    {b.items[i].description}
                  </p>
                </div>
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
