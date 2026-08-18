"use client";

import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { workflowSteps } from "@/features/guest/data/guest";
import { ScrollReveal } from "@/shared/components/common/scroll-reveal";
import { TiltCard } from "@/shared/components/common/tilt-card";
import { CosmicField } from "@/features/guest/components/cosmic-field";

export function WorkflowSection() {
  const { t } = useLanguage();
  const w = t.workflow;

  return (
    <section className="relative bg-[#f5f7fb] dark:bg-[#0b0f1a] py-20 px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <CosmicField variant="compact" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto">
        <ScrollReveal animation="fade-up" className="text-center mb-14">
          <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">
            {w.sectionLabel}
          </p>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{w.headline}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto text-base leading-relaxed">
            {w.subtext}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {workflowSteps.map((step, i) => (
            <div key={step.step} className="flex items-start gap-0">
              <ScrollReveal animation="fade-up" delay={i * 120} className="flex-1">
                <TiltCard className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                  {/* Step number + icon stacked */}
                  <div className="relative w-14 h-14 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#6c47ff]/10 flex items-center justify-center">
                      <step.icon size={24} className="text-[#6c47ff]" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#6c47ff] flex items-center justify-center text-white text-[10px] font-black">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-1.5 leading-snug">{w.steps[i].title}</h3>
                  <p className="text-[12px] text-gray-400 dark:text-gray-500 leading-relaxed">{w.steps[i].description}</p>
                </TiltCard>
              </ScrollReveal>
              {i < workflowSteps.length - 1 && (
                <div className="hidden md:flex items-center justify-center w-8 shrink-0 mt-10">
                  <ArrowRight size={16} className="text-gray-300 dark:text-gray-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
