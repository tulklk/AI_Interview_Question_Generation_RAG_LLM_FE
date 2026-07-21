"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PALETTES: string[][] = [
  ["#FFD700", "#FFA500", "#FF8C00", "#FFE066"],
  ["#7C3AED", "#9333EA", "#A855F7", "#C084FC"],
  ["#10B981", "#34D399", "#6EE7B7", "#059669"],
  ["#EF4444", "#F87171", "#EC4899", "#F472B6"],
  ["#3B82F6", "#60A5FA", "#93C5FD", "#06B6D4"],
  ["#FF922B", "#FCC419", "#FF6B6B", "#F06595"],
  ["#FF6B6B", "#FFD93D", "#6BCB77", "#CC5DE8"],
];

// 16 launches, staggered so max ~4 active at once
const LAUNCHES: [number, number, number, number, string][] = [
  [0,    0.50, 0.17, 0, "chrysanthemum"],
  [250,  0.20, 0.26, 1, "burst"],
  [480,  0.78, 0.19, 2, "ring"],
  [700,  0.38, 0.12, 3, "burst"],
  [950,  0.64, 0.29, 4, "chrysanthemum"],
  [1180, 0.12, 0.22, 5, "burst"],
  [1420, 0.86, 0.15, 6, "ring"],
  [1650, 0.32, 0.31, 0, "burst"],
  [1900, 0.55, 0.10, 1, "chrysanthemum"],
  [2150, 0.46, 0.24, 2, "burst"],
  [2400, 0.72, 0.14, 3, "ring"],
  [2680, 0.18, 0.19, 4, "burst"],
  [2950, 0.60, 0.21, 5, "chrysanthemum"],
  [3250, 0.35, 0.13, 6, "burst"],
  [3550, 0.82, 0.18, 0, "ring"],
  [3850, 0.50, 0.23, 1, "burst"],
];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  color: string;
  size: number;
  gravity: number;
  drag: number;
}

interface TrailPt { x: number; y: number; alpha: number; color: string; }

interface Rocket {
  x: number; y: number;
  vy: number;
  targetY: number;
  palette: string[];
  type: string;
  trail: TrailPt[];
  done: boolean;
}

function rand() { return Math.random(); }
function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }

function addParticles(
  x: number, y: number, palette: string[],
  count: number, minSpeed: number, maxSpeed: number, spreadY: number,
  particles: Particle[]
) {
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const speed = minSpeed + rand() * (maxSpeed - minSpeed);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + spreadY,
      alpha: 0.85 + rand() * 0.15,
      color: rand() < 0.15 ? "#ffffff" : pick(palette),
      size: 1.5 + rand() * 3,
      gravity: 0.042 + rand() * 0.04,
      drag: 0.95 + rand() * 0.03,
    });
  }
}

function spawnBurst(x: number, y: number, palette: string[], particles: Particle[]) {
  addParticles(x, y, palette, 80, 0.8, 5.5, -0.8, particles);
}

function spawnRing(x: number, y: number, palette: string[], particles: Particle[]) {
  const ringN = 48;
  const speed = 4 + rand() * 2;
  const color = pick(palette);
  for (let i = 0; i < ringN; i++) {
    const angle = (Math.PI * 2 * i) / ringN;
    particles.push({
      x, y,
      vx: Math.cos(angle) * (speed + rand() * 1.2),
      vy: Math.sin(angle) * (speed + rand() * 1.2) - 0.4,
      alpha: 1,
      color: rand() < 0.12 ? "#ffffff" : color,
      size: 2 + rand() * 2.5,
      gravity: 0.035 + rand() * 0.03,
      drag: 0.96 + rand() * 0.02,
    });
  }
  // fill
  addParticles(x, y, palette, 55, 0.5, 4, -0.6, particles);
}

function spawnChrysanthemum(x: number, y: number, palette: string[], particles: Particle[]) {
  const spokes = 20;
  const color = pick(palette);
  for (let i = 0; i < spokes; i++) {
    const angle = (Math.PI * 2 * i) / spokes;
    const dotsPerSpoke = 5 + Math.floor(rand() * 4);
    for (let j = 0; j < dotsPerSpoke; j++) {
      const t = (j + 1) / dotsPerSpoke;
      const speed = 1.5 + t * (5 + rand() * 2);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.7,
        alpha: 0.9,
        color: t > 0.65 ? "#ffffff" : (rand() < 0.25 ? pick(palette) : color),
        size: 3.5 - t * 1.8,
        gravity: 0.04 + rand() * 0.03,
        drag: 0.96,
      });
    }
  }
  addParticles(x, y, palette, 50, 0.5, 3.5, -0.5, particles);
}

// Batch all circles into one path per color×alphaBucket — far fewer state changes
function flushParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  // Group by color and alpha bucket (16 buckets = 0.0625 step)
  const groups = new Map<string, { color: string; alpha: number; pts: { x: number; y: number; r: number }[] }>();
  for (const p of particles) {
    if (p.alpha <= 0.02) continue;
    const bucket = Math.round(p.alpha * 16) / 16;
    const key = `${p.color}|${bucket}`;
    let g = groups.get(key);
    if (!g) {
      g = { color: p.color, alpha: bucket, pts: [] };
      groups.set(key, g);
    }
    g.pts.push({ x: p.x, y: p.y, r: p.size });
  }

  for (const g of groups.values()) {
    ctx.globalAlpha = g.alpha;
    ctx.fillStyle = g.color;
    ctx.beginPath();
    for (const pt of g.pts) {
      ctx.moveTo(pt.x + pt.r, pt.y);
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function FireworksCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ctx = canvas.getContext("2d")!;

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const particles: Particle[] = [];
    const rockets: Rocket[] = [];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let rafId = 0;
    let alive = true;
    let pendingLaunches = LAUNCHES.length;

    LAUNCHES.forEach(([delay, xFrac, yFrac, palIdx, type]) => {
      const t = setTimeout(() => {
        pendingLaunches--;
        if (!alive) return;
        rockets.push({
          x: W * (0.05 + xFrac * 0.9),
          y: H + 10,
          vy: -(10 + rand() * 8),
          targetY: H * (0.08 + yFrac * 0.28),
          palette: PALETTES[palIdx % PALETTES.length],
          type,
          trail: [],
          done: false,
        });
      }, delay);
      timeouts.push(t);
    });

    function frame() {
      if (!alive) return;
      ctx.clearRect(0, 0, W, H);

      // ── Rockets ──
      ctx.globalAlpha = 1;
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        if (r.done) { rockets.splice(i, 1); continue; }

        r.trail.push({ x: r.x, y: r.y, alpha: 0.75, color: pick(r.palette) });
        r.y += r.vy;
        r.vy += 0.20;

        // Draw trail — batch by color
        const trailGroups = new Map<string, { color: string; alpha: number; pts: { x: number; y: number }[] }>();
        for (const pt of r.trail) {
          pt.alpha *= 0.78;
          if (pt.alpha < 0.05) continue;
          const bucket = Math.round(pt.alpha * 8) / 8;
          const key = `${pt.color}|${bucket}`;
          let g = trailGroups.get(key);
          if (!g) { g = { color: pt.color, alpha: bucket, pts: [] }; trailGroups.set(key, g); }
          g.pts.push({ x: pt.x, y: pt.y });
        }
        for (const g of trailGroups.values()) {
          ctx.globalAlpha = g.alpha;
          ctx.fillStyle = g.color;
          ctx.beginPath();
          for (const pt of g.pts) { ctx.moveTo(pt.x + 2.5, pt.y); ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2); }
          ctx.fill();
        }
        r.trail = r.trail.filter((pt) => pt.alpha >= 0.05);

        // Rocket head
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
        ctx.fill();

        if (r.y <= r.targetY) {
          r.done = true;
          if (r.type === "ring") spawnRing(r.x, r.y, r.palette, particles);
          else if (r.type === "chrysanthemum") spawnChrysanthemum(r.x, r.y, r.palette, particles);
          else spawnBurst(r.x, r.y, r.palette, particles);
        }
      }

      // ── Particles — physics then batched draw ──
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.alpha -= 0.0095;
        if (p.alpha <= 0) particles.splice(i, 1);
      }
      flushParticles(ctx, particles);

      if (rockets.length > 0 || particles.length > 0 || pendingLaunches > 0) {
        rafId = requestAnimationFrame(frame);
      }
    }

    rafId = requestAnimationFrame(frame);
    const stopTimeout = setTimeout(() => { alive = false; }, 7000);
    timeouts.push(stopTimeout);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}
    />
  );
}

/** Full-screen fireworks rendered via portal. Performance-optimised: batched draw calls, no shadowBlur. */
export function ConfettiBurst() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(<FireworksCanvas />, document.body);
}
