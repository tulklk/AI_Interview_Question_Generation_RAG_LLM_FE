"use client";

import { useLanguage } from "@/shared/providers/language-context";
import { features } from "@/features/guest/data/guest";
import { ScrollReveal } from "@/shared/components/common/scroll-reveal";
import { TiltCard } from "@/shared/components/common/tilt-card";
import { CosmicField } from "@/features/guest/components/cosmic-field";

export function FeaturesSection() {
  const { t } = useLanguage();
  const f = t.features;

  return (
    <section id="features" className="relative bg-white/92 dark:bg-gray-950/85 py-20 px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <CosmicField variant="compact" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto">
        <ScrollReveal animation="fade-up" className="text-center mb-14">
          <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">
            {f.sectionLabel}
          </p>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{f.headline}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto text-base leading-relaxed">
            {f.subtext}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <ScrollReveal key={feature.id} animation="scale-in" delay={i * 70} className="h-full">
              <TiltCard className="group h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-[#6c47ff]/20 p-6 transition-[box-shadow,border-color] duration-200">
                <div className="w-11 h-11 rounded-lg bg-[#6c47ff]/10 flex items-center justify-center mb-4 group-hover:bg-[#6c47ff]/15 transition-colors">
                  <feature.icon size={20} className="text-[#6c47ff]" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">{f.items[i].title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.items[i].description}</p>
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
