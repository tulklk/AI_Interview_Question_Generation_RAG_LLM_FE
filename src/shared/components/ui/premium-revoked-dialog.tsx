"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, X } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";

interface PremiumRevokedDialogProps {
  open: boolean;
  onClose: () => void;
  /** If provided, shows an "Upgrade again" CTA button that calls this. */
  onUpgrade?: () => void;
  /** Controls which lost-features list to show. Defaults to "hr". */
  audience?: "hr" | "candidate";
}

/**
 * Shown when the user's Premium plan is revoked by an admin while they are
 * actively using the app. Triggered by the plan-change detection in the
 * subscription context (PREMIUM → FREE transition).
 */
export function PremiumRevokedDialog({
  open,
  onClose,
  onUpgrade,
  audience = "hr",
}: PremiumRevokedDialogProps) {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const isVi = lang === "vi";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!mounted) return null;

  const hrLost = isVi
    ? [
        "Tạo bộ câu hỏi không giới hạn",
        "Export PDF / DOCX",
        "Ask-AI trong Studio",
        "Publish lên Marketplace",
      ]
    : [
        "Unlimited question set generation",
        "Export PDF / DOCX",
        "Ask-AI in Studio",
        "Publish to Marketplace",
      ];

  const candidateLost = isVi
    ? [
        "Luyện tập không giới hạn",
        "AI feedback nâng cao & chi tiết",
        "Truy cập kho câu hỏi cao cấp",
      ]
    : [
        "Unlimited practice sessions",
        "Advanced & detailed AI feedback",
        "Access to premium question bank",
      ];

  const lostFeatures = audience === "hr" ? hrLost : candidateLost;

  return createPortal(
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900"
            initial={{ opacity: 0, scale: 0.88, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/15 text-white/80 transition hover:bg-black/25"
            >
              <X size={13} />
            </button>

            {/* ── Amber header ── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 px-6 pb-8 pt-7 text-center">
              {/* Decorative marks */}
              <span className="absolute left-5  top-4  select-none text-lg  text-white/40" aria-hidden>✦</span>
              <span className="absolute right-7 top-3  select-none text-sm  text-white/30" aria-hidden>✦</span>
              <span className="absolute bottom-5 left-12 select-none text-xs text-white/25" aria-hidden>✦</span>

              {/* Icon: dimmed crown with X badge */}
              <motion.div
                className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/25 shadow-lg shadow-amber-900/30"
                initial={{ scale: 0.45, rotate: 12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.06, duration: 0.44, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <Crown size={30} className="text-white/60" />
                {/* Red X badge */}
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900 text-[10px] font-black text-white">
                  ✕
                </span>
              </motion.div>

              <motion.h2
                className="text-[21px] font-bold text-white drop-shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.25 }}
              >
                {isVi ? "Gói Premium đã bị thu hồi" : "Premium Plan Revoked"}
              </motion.h2>
            </div>

            {/* ── Body ── */}
            <motion.div
              className="px-6 py-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.25 }}
            >
              {/* Subtitle */}
              <p className="text-center text-[15px] font-bold leading-snug text-gray-900 dark:text-gray-100">
                {isVi
                  ? "Tài khoản của bạn đã chuyển về "
                  : "Your account has been downgraded to "}
                <span className="text-amber-600 dark:text-amber-400">
                  {isVi ? "Gói Miễn Phí" : "Free Plan"}
                </span>
              </p>

              <p className="mt-1.5 text-center text-sm text-gray-500 dark:text-gray-400">
                {isVi
                  ? "Các tính năng Premium dưới đây sẽ không còn khả dụng."
                  : "The following Premium features are no longer available."}
              </p>

              {/* Lost-features list */}
              <div className="mt-4 space-y-2.5">
                {lostFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <span className="text-[10px] font-black text-gray-400 dark:text-gray-500">✕</span>
                    </div>
                    <span className="text-sm text-gray-400 dark:text-gray-500 line-through decoration-gray-300 dark:decoration-gray-600">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="mt-6 flex flex-col gap-2.5">
                {onUpgrade && (
                  <button
                    type="button"
                    onClick={() => { onUpgrade(); onClose(); }}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 py-3 text-sm font-bold text-white shadow-md shadow-violet-200/60 transition hover:from-violet-700 hover:to-purple-600 active:scale-[0.98] dark:shadow-violet-900/40"
                  >
                    {isVi ? "Nâng cấp lại →" : "Upgrade Again →"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {isVi ? "Đóng" : "Close"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
