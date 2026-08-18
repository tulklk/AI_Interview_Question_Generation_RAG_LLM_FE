"use client";

import { useEffect, useRef, useState } from "react";
import { Zap, Brain, FileDown, Users } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";

// ── Animated counter hook ──────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);
  return count;
}

interface StatItem {
  icon: React.ElementType;
  iconColor: string;
  value: number;
  suffix: string;
  label: string;
  prefix?: string;
}

export function StatsStrip() {
  const { t } = useLanguage();
  const s = t.statsStrip;
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  // Trigger animation once section enters viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const stats: StatItem[] = [
    { icon: Zap, iconColor: "text-amber-500", value: 30, suffix: "s", label: s.speed },
    { icon: Brain, iconColor: "text-violet-500", value: 3, suffix: "+", label: s.categories },
    { icon: FileDown, iconColor: "text-emerald-500", value: 2, suffix: "", label: s.formats, prefix: "" },
    { icon: Users, iconColor: "text-cyan-500", value: 100, suffix: "%", label: s.aiPowered },
  ];

  const c0 = useCountUp(stats[0].value, 900, started);
  const c1 = useCountUp(stats[1].value, 700, started);
  const c2 = useCountUp(stats[2].value, 600, started);
  const c3 = useCountUp(stats[3].value, 1200, started);
  const counts = [c0, c1, c2, c3];

  // Stat 3 (formats) shows "PDF & DOCX" instead of a number
  const displayValues = [
    `${counts[0]}${stats[0].suffix}`,
    `${counts[1]}${stats[1].suffix}`,
    "PDF & DOCX",
    `${counts[3]}${stats[3].suffix}`,
  ];

  return (
    <div ref={ref} className="relative z-10 bg-white/70 dark:bg-gray-900/60 border-y border-gray-100 dark:border-gray-800 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-gray-100 dark:divide-gray-800">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 px-4 py-2"
            >
              <Icon size={18} className={stat.iconColor} />
              <span className="text-[26px] sm:text-[30px] font-black tabular-nums leading-none text-gray-900 dark:text-gray-50 tracking-tight">
                {displayValues[i]}
              </span>
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 text-center leading-tight">
                {stat.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
