"use client";

/**
 * XpGuidePanel — centered dialog explaining how to earn XP and level up.
 * Uses ReactDOM.createPortal to mount directly on document.body,
 * escaping any parent stacking context / overflow / transform.
 */

import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Zap,
  CheckCircle2,
  TrendingUp,
  Trophy,
  Flame,
  Star,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import {
  getLevelLabel,
  getLevelColorClass,
  getLevelBarColor,
} from "@/features/gamification/utils/gamification-formatters";
import {
  portalHeadingAlt,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

interface XpGuidePanelProps {
  open: boolean;
  onClose: () => void;
}

// ── Static level-tier rows ────────────────────────────────────────────────────
const LEVEL_TIERS = [
  { range: "1–2",   xp: "0 – 99 XP",          label: getLevelLabel(1),  color: getLevelColorClass(1),  bar: getLevelBarColor(1)  },
  { range: "3–5",   xp: "100 – 699 XP",        label: getLevelLabel(3),  color: getLevelColorClass(3),  bar: getLevelBarColor(3)  },
  { range: "6–9",   xp: "700 – 2,199 XP",      label: getLevelLabel(6),  color: getLevelColorClass(6),  bar: getLevelBarColor(6)  },
  { range: "10–14", xp: "2,200 – 5,999 XP",    label: getLevelLabel(10), color: getLevelColorClass(10), bar: getLevelBarColor(10) },
  { range: "15–19", xp: "6,000 – 14,999 XP",   label: getLevelLabel(15), color: getLevelColorClass(15), bar: getLevelBarColor(15) },
  { range: "20–29", xp: "15,000 – 34,999 XP",  label: getLevelLabel(20), color: getLevelColorClass(20), bar: getLevelBarColor(20) },
  { range: "30+",   xp: "35,000+ XP",           label: getLevelLabel(30), color: getLevelColorClass(30), bar: getLevelBarColor(30) },
];

// ── Inner dialog content (rendered inside the portal) ────────────────────────
function DialogContent({ onClose }: { onClose: () => void }) {
  const { t, lang } = useLanguage();
  const g = t.gamification;
  const isVi = lang === "vi";

  const sources = [
    {
      icon: <CheckCircle2 size={16} className="text-emerald-500" />,
      label: g.xpGuideSourceQ,
      desc: g.xpGuideSourceQDesc,
      xp: g.xpGuideSourceQXp,
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      xpColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: <TrendingUp size={16} className="text-sky-500" />,
      label: g.xpGuideSourceScore,
      desc: g.xpGuideSourceScoreDesc,
      xp: g.xpGuideSourceScoreXp,
      bg: "bg-sky-50 dark:bg-sky-950/30",
      xpColor: "text-sky-600 dark:text-sky-400",
    },
    {
      icon: <Zap size={16} className="text-violet-500" />,
      label: g.xpGuideSourceSession,
      desc: g.xpGuideSourceSessionDesc,
      xp: g.xpGuideSourceSessionXp,
      bg: "bg-violet-50 dark:bg-violet-950/30",
      xpColor: "text-violet-600 dark:text-violet-400",
    },
    {
      icon: <TrendingUp size={16} className="text-amber-500" />,
      label: g.xpGuideSourceImprove,
      desc: g.xpGuideSourceImproveDesc,
      xp: g.xpGuideSourceImproveXp,
      bg: "bg-amber-50 dark:bg-amber-950/30",
      xpColor: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: <Flame size={16} className="text-orange-500" />,
      label: g.xpGuideSourceStreak,
      desc: g.xpGuideSourceStreakDesc,
      xp: g.xpGuideSourceStreakXp,
      bg: "bg-orange-50 dark:bg-orange-950/30",
      xpColor: "text-orange-600 dark:text-orange-400",
    },
    {
      icon: <Star size={16} className="text-rose-500" />,
      label: g.xpGuideSourceAchieve,
      desc: g.xpGuideSourceAchieveDesc,
      xp: g.xpGuideSourceAchieveXp,
      bg: "bg-rose-50 dark:bg-rose-950/30",
      xpColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  const tips = [g.xpGuideTip1, g.xpGuideTip2, g.xpGuideTip3, g.xpGuideTip4];

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <motion.div
        key="xp-guide-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/55"
        style={{ zIndex: 9998 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Dialog ────────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 9999, pointerEvents: "none" }}
      >
        <motion.div
          key="xp-guide-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={g.xpGuidePanelTitle}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 34, mass: 0.75 }}
          style={{ willChange: "transform, opacity", pointerEvents: "auto" }}
          className={cn(
            "w-full max-w-[480px] max-h-[88vh]",
            "bg-white dark:bg-gray-950",
            "border border-gray-200 dark:border-gray-800",
            "rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center shrink-0">
                  <Zap size={14} className="text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className={cn("text-[16px] font-extrabold", portalHeadingAlt)}>
                  {g.xpGuidePanelTitle}
                </h2>
              </div>
              <p className={cn("text-[12px]", portalSubtextAlt)}>
                {g.xpGuidePanelSubtext}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label={g.xpGuideClose}
              className={cn(
                "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5",
                "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
                "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              )}
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

            {/* XP Sources */}
            <section>
              <h3 className={cn("text-[11px] font-bold uppercase tracking-wide mb-3", portalSubtextAlt)}>
                {g.xpGuideSourcesTitle}
              </h3>
              <div className="space-y-2">
                {sources.map((src) => (
                  <div
                    key={src.label}
                    className={cn(src.bg, "rounded-xl px-3 py-2.5 flex items-center gap-3")}
                  >
                    <div className="shrink-0">{src.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[13px] font-semibold leading-tight", portalHeadingAlt)}>
                        {src.label}
                      </p>
                      <p className={cn("text-[11px] mt-0.5 leading-tight", portalSubtextAlt)}>
                        {src.desc}
                      </p>
                    </div>
                    <span className={cn("shrink-0 text-[12px] font-bold tabular-nums", src.xpColor)}>
                      {src.xp}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Level Tiers */}
            <section>
              <h3 className={cn("text-[11px] font-bold uppercase tracking-wide mb-3", portalSubtextAlt)}>
                {g.xpGuideLevelsTitle}
              </h3>
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {LEVEL_TIERS.map((tier, i) => (
                  <div
                    key={tier.range}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5",
                      i < LEVEL_TIERS.length - 1 ? "border-b border-gray-100 dark:border-gray-800" : ""
                    )}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tier.bar }} />
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className={cn("text-[12px] font-bold", tier.color)}>{tier.label}</span>
                      <span className={cn("text-[11px]", portalSubtextAlt)}>
                        {isVi ? "Cấp" : "Lv"} {tier.range}
                      </span>
                    </div>
                    <span className={cn("text-[11px] tabular-nums shrink-0", portalSubtextAlt)}>
                      {tier.xp}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Tips */}
            <section>
              <h3 className={cn("text-[11px] font-bold uppercase tracking-wide mb-3", portalSubtextAlt)}>
                <span className="inline-flex items-center gap-1.5">
                  <Lightbulb size={11} />
                  {g.xpGuideTipsTitle}
                </span>
              </h3>
              <div className="space-y-2">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <ChevronRight size={13} className="shrink-0 mt-0.5 text-violet-400 dark:text-violet-500" />
                    <p className={cn("text-[12px] leading-relaxed", portalHeadingAlt)}>{tip}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Trophy footer decoration */}
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                <Trophy size={24} className="text-amber-500 dark:text-amber-400" />
              </div>
              <p className={cn("text-center text-[11px]", portalSubtextAlt)}>
                {isVi
                  ? "Mỗi phiên luyện tập đều tính vào XP của bạn!"
                  : "Every practice session counts toward your XP!"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onClose}
              className={cn(
                "w-full py-2.5 rounded-xl text-[13px] font-semibold",
                "bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              )}
            >
              {g.xpGuideClose}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ── Public component — handles portal mounting ────────────────────────────────
export function XpGuidePanel({ open, onClose }: XpGuidePanelProps) {
  const [mounted, setMounted] = useState(false);

  // Wait for client mount before creating portal
  useEffect(() => { setMounted(true); }, []);

  // Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && <DialogContent onClose={onClose} />}
    </AnimatePresence>,
    document.body
  );
}
