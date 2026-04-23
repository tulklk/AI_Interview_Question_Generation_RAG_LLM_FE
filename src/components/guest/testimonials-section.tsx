"use client";

import { Quote } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { testimonials } from "@/data/guest";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

const cardAnimations = ["slide-left", "fade-up", "slide-right"] as const;

export function TestimonialsSection() {
  const { t } = useLanguage();
  const tm = t.testimonials;

  return (
    <section className="bg-[#f5f7fb] py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal animation="fade-up" className="text-center mb-14">
          <p className="text-sm font-semibold text-[#6c47ff] uppercase tracking-widest mb-3">
            {tm.sectionLabel}
          </p>
          <h2 className="text-3xl font-bold text-gray-900">{tm.headline}</h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto text-base leading-relaxed">
            {tm.subtext}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((person, i) => {
            const item = tm.items[i];
            return (
              <ScrollReveal
                key={person.id}
                animation={cardAnimations[i % 3]}
                delay={i * 80}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-7 flex flex-col gap-5"
              >
                <Quote size={22} className="text-[#6c47ff]/30 shrink-0" />
                <p className="text-sm text-gray-700 leading-relaxed flex-1 italic">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${person.avatarColor}`}
                  >
                    {person.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.role} · {item.company}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
