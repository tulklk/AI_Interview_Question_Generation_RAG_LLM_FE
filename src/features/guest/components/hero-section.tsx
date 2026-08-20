"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { CosmicField } from "@/features/guest/components/cosmic-field";
import { MockupCard3D } from "@/features/guest/components/mockup-card-3d";

const LIGHT_PARTICLES = [
  { x: 12, y: 18, size: 5, color: "rgba(124, 58, 237, 0.35)", delay: 0, dur: 14 },
  { x: 28, y: 62, size: 4, color: "rgba(6, 182, 212, 0.35)", delay: 2, dur: 18 },
  { x: 48, y: 14, size: 3, color: "rgba(124, 58, 237, 0.3)", delay: 4, dur: 16 },
  { x: 64, y: 70, size: 5, color: "rgba(6, 182, 212, 0.3)", delay: 1, dur: 20 },
  { x: 82, y: 30, size: 4, color: "rgba(124, 58, 237, 0.32)", delay: 5, dur: 15, secondary: true },
  { x: 92, y: 64, size: 3, color: "rgba(6, 182, 212, 0.32)", delay: 3, dur: 22, secondary: true },
  { x: 38, y: 42, size: 4, color: "rgba(59, 130, 246, 0.32)", delay: 6, dur: 25, secondary: true },
  { x: 72, y: 50, size: 3, color: "rgba(59, 130, 246, 0.3)", delay: 2.5, dur: 17, secondary: true },
];

export function HeroSection() {
  const { t } = useLanguage();
  const h = t.hero;

  return (
    <section
      id="home"
      className="relative px-6 overflow-hidden bg-white/92 dark:bg-gray-950/85"
      style={{
        minHeight: "calc(100dvh - 4rem)", /* fill remaining viewport after sticky navbar */
        paddingTop: "0",
        paddingBottom: "clamp(0.5rem, 2vh, 1.5rem)",
      }}
    >
      {/* ── Hero holographic accents: grid, aurora beams, glows, stars ── */}
      <div className="light-hero-bg absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="mesh-gradient hidden md:block" />
        <div className="dot-pattern hidden md:block" />
        <div className="bg-grid-pattern" />
        <div
          className="holo-orb holo-orb--hero holo-orb--violet"
          style={{ width: 560, height: 560, top: "-22%", left: "-12%" }}
        />
        <div
          className="holo-orb holo-orb--hero holo-orb--cyan"
          style={{ width: 420, height: 420, bottom: "-15%", right: "-8%" }}
        />
        <div
          className="holo-orb holo-orb--hero holo-orb--pink"
          style={{ width: 280, height: 280, top: "22%", right: "22%" }}
        />

        {/* Light-theme particles: soft drifting purple/cyan/blue dots */}
        <div className="floating-particles absolute inset-0">
          {LIGHT_PARTICLES.map((p, i) => (
            <div
              key={`particle-${i}`}
              className={`light-particle ${p.secondary ? "hidden sm:block" : ""}`}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <CosmicField variant="full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left column — staggered per-element */}
        <div>
          <div
            className="inline-flex items-center gap-2 bg-[#7C3AED]/8 border border-[#7C3AED]/15 text-[#7C3AED] text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 animate-fade-up-scale"
            style={{ animationDelay: "0ms" }}
          >
            <Sparkles size={13} className="badge-icon-pulse" />
            {h.badge}
          </div>

          <h1 className="text-4xl sm:text-[2.5rem] lg:text-[2.75rem] font-extrabold text-gray-900 dark:text-gray-50 leading-[1.1] tracking-tight mb-5">
            <span className="block animate-fade-up" style={{ animationDelay: "80ms" }}>
              {h.headline1}
            </span>
            <span className="block animate-fade-up" style={{ animationDelay: "160ms" }}>
              {h.headline2}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#22D3EE] bg-size-[200%_auto] animate-gradient-text">
                {h.headlineGradient}
              </span>
            </span>
            <span className="block animate-fade-up" style={{ animationDelay: "240ms" }}>
              {h.headline3}
            </span>
          </h1>

          <p
            className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-md animate-fade-up"
            style={{ animationDelay: "340ms" }}
          >
            {h.subtext}
          </p>

          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 mb-10">
            {/* Point 1 — same line */}
            <span
              className="checklist-item flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300"
              style={{ animationDelay: "420ms" }}
            >
              <CheckCircle2 size={15} className="checklist-icon-glow text-emerald-500 shrink-0" />
              {h.point1}
            </span>
            {/* Force point2 onto its own line */}
            <div className="basis-full h-0" />
            <span
              className="checklist-item flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300"
              style={{ animationDelay: "510ms" }}
            >
              <CheckCircle2 size={15} className="checklist-icon-glow text-emerald-500 shrink-0" />
              {h.point2}
            </span>
            {/* Force point3 onto its own line */}
            <div className="basis-full h-0" />
            <span
              className="checklist-item flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300"
              style={{ animationDelay: "600ms" }}
            >
              <CheckCircle2 size={15} className="checklist-icon-glow text-emerald-500 shrink-0" />
              {h.point3}
            </span>
          </div>

          <div
            className="flex items-center gap-3 animate-scale-in"
            style={{ animationDelay: "620ms" }}
          >
            <Link
              href="/register"
              className="btn-cta-primary shimmer-button inline-flex items-center gap-2 text-white font-semibold text-sm px-6 py-3 rounded-lg"
            >
              <Sparkles size={15} />
              {h.ctaPrimary}
            </Link>
            <Link
              href="/login"
              className="btn-glass group inline-flex items-center gap-2 text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 dark:text-gray-200 dark:border-gray-700 px-6 py-3 rounded-lg transition-colors"
            >
              {h.ctaSecondary}
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Right column — slide-in wrapper + idle 3D tilt/float */}
        {/* Right column — interactive 3D card (drag to rotate 360°) */}
        <div
          className="hero-card-enter w-full flex items-center justify-center"
          style={{ animationDelay: "200ms" }}
        >
          <MockupCard3D
            title={h.mockupTitle}
            jdLabel={h.mockupJdLabel}
            jdText={h.mockupJdText}
            kwLabel={h.mockupKeywordsLabel}
            question={h.mockupQuestion}
            aiLabel={h.mockupAiLabel}
            aiAnswer={h.mockupAnswer}
            className="w-full h-175"
          />
        </div>
      </div>
    </section>
  );
}
