"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/language-context";

export function FinalCtaSection() {
  const { t } = useLanguage();
  const c = t.cta;

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="animate-fade-up bg-gradient-to-br from-[#6c47ff] to-[#8b65ff] rounded-3xl px-10 py-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
              <Sparkles size={12} />
              {c.badge}
            </div>

            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
              {c.headline}
            </h2>
            <p className="text-lg text-white/75 max-w-xl mx-auto leading-relaxed mb-10">
              {c.subtext}
            </p>

            <div className="flex items-center justify-center flex-wrap gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-[#6c47ff] font-bold text-sm px-7 py-3.5 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
              >
                <Sparkles size={15} />
                {c.primary}
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 border-2 border-white/40 text-white font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                {c.secondary}
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
