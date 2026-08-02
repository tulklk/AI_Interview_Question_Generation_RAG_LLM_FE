"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Sparkles, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";

interface UpgradeCongratsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Full plan display name, e.g. "HR Premium" or "Candidate Premium" */
  planName?: string;
}

const FALLBACK = {
  title: "Chúc mừng!",
  subtitle: "Tài khoản của bạn đã được nâng cấp lên",
  body: "Bạn đã có quyền truy cập vào tất cả tính năng Premium. Hãy bắt đầu khám phá và tận dụng tối đa gói đăng ký của mình.",
  cta: "Bắt đầu khám phá",
  featureUnlocked: "Tính năng Premium đã được mở khoá",
};

const SPARKLE_POSITIONS = [
  { x: "12%", y: "18%", delay: 0,    size: 5,  dur: 2.0 },
  { x: "82%", y: "12%", delay: 0.35, size: 7,  dur: 2.4 },
  { x: "75%", y: "72%", delay: 0.7,  size: 5,  dur: 1.8 },
  { x: "22%", y: "78%", delay: 1.05, size: 6,  dur: 2.2 },
  { x: "50%", y: "8%",  delay: 0.5,  size: 4,  dur: 2.0 },
  { x: "92%", y: "48%", delay: 0.2,  size: 5,  dur: 1.9 },
  { x: "8%",  y: "52%", delay: 0.85, size: 4,  dur: 2.3 },
  { x: "62%", y: "88%", delay: 1.2,  size: 3,  dur: 2.1 },
  { x: "38%", y: "90%", delay: 0.6,  size: 4,  dur: 1.7 },
];

export function UpgradeCongratsDialog({ open, onClose, planName }: UpgradeCongratsDialogProps) {
  const { t } = useLanguage();
  const d = (t as Record<string, unknown>).upgradeCongratsDialog as typeof FALLBACK ?? FALLBACK;

  const displayPlan = planName ?? "Premium";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="ucg-backdrop"
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            key="ucg-dialog"
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="pointer-events-auto relative w-full max-w-[360px] rounded-2xl overflow-hidden shadow-[0_32px_80px_-12px_rgba(108,71,255,0.45)] bg-white dark:bg-slate-900">
              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                aria-label="Close"
              >
                <X size={14} />
              </button>

              {/* ── Hero ── */}
              <div className="relative h-48 bg-gradient-to-br from-[#4c2adb] via-[#6c47ff] to-[#a259ff] overflow-hidden flex items-center justify-center">
                {/* Radial glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_60%,rgba(255,255,255,0.12),transparent)]" />

                {/* Animated sparkle dots */}
                {SPARKLE_POSITIONS.map((s, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full bg-white"
                    style={{ left: s.x, top: s.y, width: s.size, height: s.size }}
                    animate={{ y: [0, -10, 0], scale: [1, 1.4, 1], opacity: [0.55, 1, 0.55] }}
                    transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
                  />
                ))}

                {/* Crown container */}
                <div className="relative flex flex-col items-center gap-3">
                  {/* Outer glow ring */}
                  <motion.div
                    className="absolute w-28 h-28 rounded-full bg-white/10"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Icon circle */}
                  <div className="relative w-20 h-20 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-lg">
                    <Crown size={36} className="text-yellow-300 drop-shadow-lg" fill="currentColor" />
                  </div>
                </div>
              </div>

              {/* ── Body ── */}
              <div className="px-6 pt-5 pb-6 space-y-4 text-center">
                {/* Title */}
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {d.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {d.subtitle}
                  </p>
                  <p className="mt-0.5 text-base font-bold text-[#6c47ff]">
                    {displayPlan}
                  </p>
                </div>

                {/* Feature unlocked badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                  <CheckCircle2 size={13} />
                  {d.featureUnlocked}
                </div>

                {/* Description */}
                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {d.body}
                </p>

                {/* CTA */}
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-colors",
                    "bg-[#6c47ff] hover:bg-[#5535dd] shadow-md shadow-[#6c47ff]/30"
                  )}
                >
                  <Sparkles size={15} />
                  {d.cta}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
