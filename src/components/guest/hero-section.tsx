"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2, Tag } from "lucide-react";
import { useLanguage } from "@/context/language-context";

const keywords = ["React", "TypeScript", "Next.js", "SSR", "REST API"];

export function HeroSection() {
  const { t } = useLanguage();
  const h = t.hero;

  return (
    <section id="home" className="relative py-20 px-6 overflow-hidden bg-white/92 dark:bg-gray-950/85">
      {/* ── Hero holographic accents ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="holo-orb holo-orb--hero holo-orb--purple"
          style={{ width: 500, height: 500, top: "-20%", left: "-10%", opacity: 0.5 }}
        />
        <div
          className="holo-orb holo-orb--hero holo-orb--blue"
          style={{ width: 400, height: 400, bottom: "-15%", right: "-8%", opacity: 0.4 }}
        />
        <div
          className="holo-orb holo-orb--hero holo-orb--pink"
          style={{ width: 300, height: 300, top: "20%", right: "20%", opacity: 0.25 }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left column — staggered per-element */}
        <div>
          <div
            className="inline-flex items-center gap-2 bg-[#6c47ff]/8 text-[#6c47ff] text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 animate-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            <Sparkles size={13} />
            {h.badge}
          </div>

          <h1
            className="text-4xl sm:text-[2.5rem] lg:text-[2.75rem] font-extrabold text-gray-900 dark:text-gray-50 leading-[1.1] tracking-tight mb-5 animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            {h.headline1}
            <br />
            {h.headline2}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6c47ff] to-[#a78bff]">
              {h.headlineGradient}
            </span>
            <br />
            {h.headline3}
          </h1>

          <p
            className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-md animate-fade-up"
            style={{ animationDelay: "180ms" }}
          >
            {h.subtext}
          </p>

          <div
            className="flex flex-wrap items-center gap-3 mb-10 animate-fade-up"
            style={{ animationDelay: "280ms" }}
          >
            {[h.point1, h.point2, h.point3].map((point) => (
              <span key={point} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                {point}
              </span>
            ))}
          </div>

          <div
            className="flex items-center gap-3 animate-fade-up"
            style={{ animationDelay: "370ms" }}
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
            >
              <Sparkles size={15} />
              {h.ctaPrimary}
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:text-gray-200 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800 px-6 py-3 rounded-lg transition-colors"
            >
              {h.ctaSecondary}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Right column — slide-in wrapper + inner float */}
        <div
          className="animate-slide-right"
          style={{ animationDelay: "200ms" }}
        >
        <div className="animate-float">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
            <div className="bg-[#f5f7fb] dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-5 py-3.5 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">{h.mockupTitle}</span>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-gray-400 text-[10px]">📄</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{h.mockupJdLabel}</span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                  {h.mockupJdText}
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Tag size={13} className="text-[#6c47ff]" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{h.mockupKeywordsLabel}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((k) => (
                    <span
                      key={k}
                      className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-[#6c47ff]/10 hover:text-[#6c47ff] px-2.5 py-1 rounded-full transition-colors"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Medium
                  </span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
                    Next.js
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                  {h.mockupQuestion}
                </p>
                <div className="mt-3 rounded-lg bg-[#f5f3ff] dark:bg-[#6c47ff]/10 border border-[#6c47ff]/15 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles size={11} className="text-[#6c47ff]" />
                    <span className="text-[10px] font-semibold text-[#6c47ff]">
                      {h.mockupAiLabel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{h.mockupAnswer}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
