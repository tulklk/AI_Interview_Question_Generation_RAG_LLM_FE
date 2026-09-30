"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalCard } from "@/shared/utils/portal-ui";
import { useLeaderboardText } from "./leaderboard-text";



// ── Single accordion item ───────────────────────────────────────────────────
function FaqItem({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: { q: string; a: string };
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden"
    >
      <button
        type="button"
        className={cn(
          "w-full flex items-center gap-3 px-4 py-4 text-left",
          "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        )}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-xs font-bold text-primary dark:text-[#a78bff]">
          Q
        </span>
        <span className="flex-1 text-sm font-medium text-[#111827] dark:text-gray-100 text-left">
          {item.q}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="shrink-0"
        >
          <ChevronDown size={16} className="text-[#9CA3AF] dark:text-gray-500" />
        </motion.div>
      </button>

      {/* Smooth height animation */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <p className="px-4 pb-4 pt-1 text-sm text-[#6B7280] dark:text-gray-300 leading-relaxed border-t border-gray-50 dark:border-gray-800">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export function LeaderboardInfoFaq() {
  const lb = useLeaderboardText();
  const FAQ_ITEMS = lb.faq;
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(portalCard, "p-5 shadow-sm")}
    >
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle size={16} className="text-primary dark:text-[#a78bff] shrink-0" />
        <h2 className="text-sm font-bold text-[#111827] dark:text-gray-100">
          {lb.faqTitle}
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {FAQ_ITEMS.map((item, idx) => (
          <FaqItem
            key={idx}
            item={item}
            index={idx}
            isOpen={openIdx === idx}
            onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
          />
        ))}
      </div>
    </motion.section>
  );
}
