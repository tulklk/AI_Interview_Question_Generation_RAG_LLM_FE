"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";

// ─── Firework particle system ─────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  radius: number;
  color: string;
}

const FW_PALETTE = [
  "#a78bfa", // violet-400
  "#8b5cf6", // violet-500
  "#c4b5fd", // violet-300
  "#e9d5ff", // violet-200
  "#d946ef", // fuchsia-500
  "#f0abfc", // fuchsia-300
  "#e879f9", // fuchsia-400
  "#ffffff",
  "#7c3aed", // violet-600
  "#ddd6fe", // violet-200
];

function spawnBurst(particles: Particle[], x: number, y: number, count = 34) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
    const speed = 1.6 + Math.random() * 3.4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      radius: 1.4 + Math.random() * 2.2,
      color: FW_PALETTE[Math.floor(Math.random() * FW_PALETTE.length)],
    });
  }
}

/** Full-viewport canvas that fires fireworks symmetrically on both sides of the screen. */
function FireworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W   = window.innerWidth;
    const H   = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = [];

    // Symmetric bursts: 3 on the left edge, 3 on the right edge,
    // 2 above centre — each side fires in a staggered cascade.
    const schedule: { x: number; y: number; t: number; n?: number }[] = [
      // ── Left side ──────────────────────────────────────
      { x: W * 0.07,  y: H * 0.20, t:   0, n: 32 },
      { x: W * 0.13,  y: H * 0.46, t: 300, n: 28 },
      { x: W * 0.05,  y: H * 0.66, t: 600, n: 26 },
      // ── Right side (mirror) ────────────────────────────
      { x: W * 0.93,  y: H * 0.20, t: 130, n: 32 },
      { x: W * 0.87,  y: H * 0.46, t: 430, n: 28 },
      { x: W * 0.95,  y: H * 0.66, t: 730, n: 26 },
      // ── Above the dialog (centre) ─────────────────────
      { x: W * 0.36,  y: H * 0.12, t: 870, n: 30 },
      { x: W * 0.64,  y: H * 0.12, t: 1000, n: 30 },
    ];

    schedule.forEach(({ x, y, t, n }) => {
      const id = setTimeout(() => spawnBurst(particles, x, y, n), t);
      timersRef.current.push(id);
    });

    const ANIM_MS = 2900;
    let startTs: number | null = null;

    function tick(ts: number) {
      if (startTs === null) startTs = ts;
      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.062;   // gravity
        p.vx *= 0.988;   // air drag
        p.alpha -= 0.0095;
        if (p.alpha <= 0) continue;

        // Soft glow halo
        ctx.globalAlpha = p.alpha * 0.25;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Solid core
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (ts - startTs < ANIM_MS) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      ctx.clearRect(0, 0, W, H);
    };
  }, []); // runs once on mount

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 100000 }}
      aria-hidden
    />
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

interface PremiumCelebrationDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * When provided (admin-grant flow), highlights the user's name in the subtitle.
   * Omit for the generic first-person subtitle.
   */
  userName?: string;
}

export function PremiumCelebrationDialog({
  open,
  onClose,
  userName,
}: PremiumCelebrationDialogProps) {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  // Keep fireworks alive for the full animation even if user closes early.
  const [fwKey, setFwKey] = useState(0);
  const [fwVisible, setFwVisible] = useState(false);
  const fwTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Trigger a fresh firework burst every time the dialog opens.
  // IMPORTANT: no cleanup return here — the timer must NOT be cancelled when
  // `open` flips to false (user closes dialog). We want fireworks to keep
  // playing until the animation completes (~3.3 s). Unmount cleanup is handled
  // by the separate effect below.
  useEffect(() => {
    if (!open) return;
    if (fwTimerRef.current) clearTimeout(fwTimerRef.current);
    setFwKey((k) => k + 1);
    setFwVisible(true);
    fwTimerRef.current = setTimeout(() => setFwVisible(false), 3300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cancel timer only when the dialog component itself unmounts.
  useEffect(() => {
    return () => {
      if (fwTimerRef.current) clearTimeout(fwTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!mounted) return null;

  const isVi = lang === "vi";

  const benefits = isVi
    ? [
        "Không giới hạn tạo câu hỏi phỏng vấn",
        "Xuất dữ liệu Excel & PDF",
        "Truy cập kho câu hỏi cao cấp",
      ]
    : [
        "Unlimited interview question generation",
        "Export data to Excel & PDF",
        "Access to the premium question bank",
      ];

  return createPortal(
    <>
      {/* Fireworks — above the dialog, pointer-events disabled */}
      {fwVisible && <FireworkCanvas key={fwKey} />}

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Card */}
            <motion.div
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900"
              initial={{ opacity: 0, scale: 0.86, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* ── Purple header ── */}
              <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 px-6 pb-8 pt-7 text-center">
                {/* Decorative sparkle marks */}
                <span className="absolute left-5   top-4    select-none text-lg   text-white/50" aria-hidden>✦</span>
                <span className="absolute right-7  top-3    select-none text-sm   text-white/40" aria-hidden>✦</span>
                <span className="absolute bottom-5 left-12  select-none text-xs   text-white/30" aria-hidden>✦</span>
                <span className="absolute bottom-4 right-10 select-none text-base text-white/45" aria-hidden>✦</span>

                {/* Crown with spring bounce */}
                <motion.div
                  className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30 shadow-lg shadow-violet-900/40"
                  initial={{ scale: 0.35, rotate: -18 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.07, duration: 0.48, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <Crown size={32} className="text-white drop-shadow-sm" />
                </motion.div>

                <motion.h2
                  className="text-[22px] font-bold text-white drop-shadow-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.28 }}
                >
                  {isVi ? "Chúc mừng!" : "Congratulations!"}
                </motion.h2>
              </div>

              {/* ── Body ── */}
              <motion.div
                className="px-6 py-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.28 }}
              >
                {/* Subtitle */}
                <p className="text-center text-[15px] font-bold leading-snug text-gray-900 dark:text-gray-100">
                  {userName ? (
                    <>
                      <span className="text-violet-600 dark:text-violet-400">{userName}</span>{" "}
                      {isVi ? "đã được nâng cấp lên Premium" : "has been upgraded to Premium"}
                    </>
                  ) : (
                    <>
                      {isVi ? "Tài khoản đã được nâng cấp lên " : "Your account has been upgraded to "}
                      <span className="text-violet-600 dark:text-violet-400">Premium</span>
                    </>
                  )}
                </p>

                <p className="mt-1.5 text-center text-sm text-gray-500 dark:text-gray-400">
                  {isVi
                    ? "Bạn giờ đây có thể sử dụng tất cả tính năng cao cấp."
                    : "You now have access to all premium features."}
                </p>

                {/* Benefits checklist */}
                <div className="mt-4 space-y-2.5">
                  {benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                        <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400">✓</span>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* CTA — clicking also saves "already shown" via the app-shell localStorage key */}
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 py-3 text-sm font-bold text-white shadow-md shadow-violet-200/60 transition hover:from-violet-700 hover:to-purple-600 active:scale-[0.98] dark:shadow-violet-900/40"
                >
                  {isVi ? "Bắt đầu ngay →" : "Get Started →"}
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
