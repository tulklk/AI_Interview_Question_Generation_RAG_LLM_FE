"use client";

import { useLanguage } from "@/context/language-context";
import { benefits } from "@/data/guest";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

export function BenefitsSection() {
  const { t } = useLanguage();
  const b = t.benefits;

  return (
    <section className="bg-[#f5f7fb] py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal animation="fade-up" className="text-center mb-12">
          <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">
            {b.sectionLabel}
          </p>
          <h2 className="text-3xl font-bold text-gray-900">{b.headline}</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto text-base leading-relaxed">
            {b.subtext}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {benefits.map((item, i) => (
            <ScrollReveal
              key={item.id}
              animation={i % 2 === 0 ? "slide-left" : "slide-right"}
              delay={i * 100}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4"
            >
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}
              >
                <item.icon size={20} className={item.iconColor} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5">
                  {b.items[i].title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {b.items[i].description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
