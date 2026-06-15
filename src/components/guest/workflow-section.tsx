"use client";

import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { workflowSteps } from "@/data/guest";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { TiltCard } from "@/components/shared/tilt-card";
import { CosmicField } from "@/components/guest/cosmic-field";

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
                <TiltCard className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-[#6c47ff] flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">{step.step}</span>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-[#6c47ff]/10 flex items-center justify-center">
                      <step.icon size={17} className="text-[#6c47ff]" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">{w.steps[i].title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{w.steps[i].description}</p>
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
