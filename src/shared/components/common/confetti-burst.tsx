"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#6C47FF", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#EC4899"];
const PARTICLE_COUNT = 36;

interface Particle {
  id: number;
  color: string;
  x: number;
  rotate: number;
  delay: number;
  size: number;
}

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    x: (Math.random() - 0.5) * 480,
    rotate: Math.random() * 360,
    delay: Math.random() * 0.15,
    size: 6 + Math.random() * 6,
  }));
}

/** Fires a one-shot confetti burst from the top center of its container. No external deps. */
export function ConfettiBurst() {
  const particles = useMemo(makeParticles, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20" aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-0 rounded-sm"
          style={{ width: p.size, height: p.size * 0.4, backgroundColor: p.color }}
          initial={{ x: 0, y: -10, opacity: 1, rotate: 0 }}
          animate={{
            x: p.x,
            y: 220 + Math.random() * 100,
            opacity: 0,
            rotate: p.rotate,
          }}
          transition={{ duration: 1.4 + Math.random() * 0.5, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
