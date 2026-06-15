"use client";

import { motion } from "framer-motion";
import { Bot, Timer, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "RAG-Powered AI",
    description: "Questions grounded in your JD via retrieval-augmented generation",
  },
  {
    icon: Timer,
    title: "30-Second Turnaround",
    description: "Instant role-specific questions across all competency levels",
  },
  {
    icon: BarChart3,
    title: "Rich Analytics",
    description: "Track usage, categories, and hiring pipeline progress",
  },
];

const testimonials = [
  {
    quote: "Cut our interview prep time by 80%. Incredible tool.",
    name: "Sarah K.",
    role: "Talent Manager @ Meta",
    initials: "S",
  },
  {
    quote: "The questions are remarkably tailored to each role.",
    name: "James L.",
    role: "Head of HR @ Stripe",
    initials: "J",
  },
];

const PARTICLES = [
  { x: 8,  y: 18, size: 3,   delay: 0,   dur: 4.5 },
  { x: 28, y: 72, size: 2,   delay: 1.2, dur: 3.8 },
  { x: 52, y: 30, size: 3.5, delay: 0.5, dur: 5.2 },
  { x: 75, y: 55, size: 2,   delay: 2.1, dur: 4.0 },
  { x: 90, y: 25, size: 1.5, delay: 0.8, dur: 3.5 },
  { x: 18, y: 85, size: 2,   delay: 1.8, dur: 4.8 },
  { x: 65, y: 10, size: 2.5, delay: 0.3, dur: 4.2 },
  { x: 42, y: 68, size: 1.5, delay: 2.5, dur: 3.9 },
  { x: 83, y: 78, size: 2,   delay: 1.0, dur: 5.0 },
  { x: 35, y: 45, size: 1.5, delay: 3.0, dur: 4.3 },
  { x: 60, y: 92, size: 2,   delay: 0.7, dur: 4.6 },
  { x: 96, y: 48, size: 1.5, delay: 2.3, dur: 3.7 },
];

const SPARKLES = [
  { x: 20, y: 38, delay: 0.5, dur: 3.2 },
  { x: 72, y: 20, delay: 1.3, dur: 2.8 },
  { x: 45, y: 78, delay: 0.2, dur: 3.6 },
  { x: 88, y: 58, delay: 2.0, dur: 2.9 },
  { x: 12, y: 58, delay: 1.7, dur: 3.4 },
  { x: 55, y: 15, delay: 0.9, dur: 2.6 },
];

export function LoginHero() {
  return (
    <div className="relative flex flex-col h-full px-10 py-10 overflow-y-auto overflow-x-hidden">
      {/* ── Background layers ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Holo orbs */}
        <div
          className="holo-orb holo-orb--purple holo-orb--hero"
          style={{ width: 340, height: 340, top: "-10%", right: "-14%" }}
        />
        <div
          className="holo-orb holo-orb--blue holo-orb--hero"
          style={{ width: 280, height: 280, bottom: "12%", left: "-12%" }}
        />
        <div
          className="holo-orb holo-orb--pink holo-orb--hero"
          style={{ width: 200, height: 200, top: "36%", right: "4%" }}
        />

        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/60"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              animation: `particleDrift ${p.dur}s ease-out ${p.delay}s infinite`,
            }}
          />
        ))}

        {/* Sparkle stars */}
        {SPARKLES.map((s, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M5 0L5.9 4.1L10 5L5.9 5.9L5 10L4.1 5.9L0 5L4.1 4.1Z"
                fill="rgba(255,255,255,0.65)"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10">
        <motion.h1
          className="text-4xl font-extrabold text-white leading-tight mb-3"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: "easeOut" }}
        >
          Transform Job Descriptions
          <br />
          Into{" "}
          <span
            className="auth-heading-glow text-transparent bg-clip-text"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #fbbf24 0%, #f97316 30%, #fb923c 65%, #fbbf24 100%)",
              backgroundSize: "200% auto",
              animation: "gradientText 4s ease-in-out infinite",
            }}
          >
            Perfect Interviews
          </span>
        </motion.h1>

        <motion.p
          className="text-white/70 text-sm leading-relaxed mb-8 max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          Use AI to generate tailored, role-specific interview questions in seconds
          — from any job description.
        </motion.p>

        <div className="space-y-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="glass-feature-card group flex items-start gap-3.5 rounded-lg px-4 py-3.5 relative overflow-hidden cursor-default"
              initial={{ opacity: 0, x: -26 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.3 + i * 0.1,
                ease: "easeOut",
              }}
              whileHover={{ scale: 1.025, x: 6 }}
            >
              {/* Shimmer sweep on hover */}
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[250%] -skew-x-12 bg-linear-to-r from-transparent via-white/12 to-transparent transition-transform duration-700 ease-out pointer-events-none" />

              <div className="w-8 h-8 rounded-lg bg-white/15 group-hover:bg-white/25 transition-colors flex items-center justify-center shrink-0 mt-0.5">
                <f.icon size={15} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-6 space-y-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            className="glass-testimonial-card px-4 py-3.5 relative overflow-hidden"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.55,
              delay: 0.6 + i * 0.12,
              ease: "easeOut",
            }}
            whileHover={{ scale: 1.02 }}
          >
            {/* Left accent bar */}
            <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-linear-to-b from-amber-400/80 to-orange-400/40" />

            <p className="text-white/85 text-sm leading-relaxed">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="flex items-center gap-2.5 mt-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 ring-1 ring-white/30">
                <span className="text-white text-xs font-bold">{t.initials}</span>
              </div>
              <div>
                <p className="text-white text-xs font-semibold leading-tight">
                  {t.name}
                </p>
                <p className="text-white/50 text-[11px] leading-tight">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
