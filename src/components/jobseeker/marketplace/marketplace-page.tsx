"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Search, Sparkles, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { questionSets } from "@/data/jobseeker";
import { QuestionSetCard } from "./question-set-card";
import { useLanguage } from "@/context/language-context";
import type { Difficulty } from "@/types/jobseeker";
import {
  portalCard,
  portalHeadingAlt,
  portalInput,
  portalMutedBg,
  portalSubtextAlt,
} from "@/lib/portal-ui";

const CATEGORIES = ["All", "Frontend", "Full Stack", "Backend", "Product", "Data", "DevOps"];
const DIFFICULTIES: Array<"All" | Difficulty> = ["All", "Easy", "Medium", "Hard"];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export function MarketplacePage() {
  const { t } = useLanguage();
  const p = t.jobseekerMarketplacePage;

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState<"All" | Difficulty>("All");

  const filtered = questionSets.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.company.toLowerCase().includes(q) ||
      s.skills.some((sk) => sk.toLowerCase().includes(q));
    const matchCat = category === "All" || s.category === category;
    const matchDiff = difficulty === "All" || s.difficulty === difficulty;
    return matchSearch && matchCat && matchDiff;
  });

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hr-quick-generate rounded-xl px-5 sm:px-10 py-8 sm:py-12 mb-8"
      >
        <div className="max-w-2xl">
          {/* Badge */}
          <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5", portalCard)}>
            <Sparkles size={13} className="text-primary" />
            <span className={cn("text-[12px] font-[600]", portalHeadingAlt)}>{p.heroBadge}</span>
          </div>

          {/* Headline */}
          <h1 className={cn("text-[28px] sm:text-[48px] font-[800] leading-[34px] sm:leading-[52px] mb-4", portalHeadingAlt)}>
            {p.heroTitle}{" "}
            <span className="text-primary">{p.heroTitleAccent}</span>
          </h1>
          <p className={cn("text-[16px] leading-[24px] max-w-lg mb-8", portalSubtextAlt)}>
            {p.heroSub}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              className="shimmer-button h-11 px-6 text-[14px] font-semibold text-white hr-cta-btn rounded-xl"
            >
              {p.heroCta}
            </button>
            <p className={cn("text-[13px]", portalSubtextAlt)}>{p.heroCtaSub}</p>
          </div>
        </div>
      </motion.section>

      {/* ── Search + Filters ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="hr-glass-card p-4 mb-6 flex flex-col gap-4"
      >
        {/* Search row */}
        <div className={cn(
          "flex items-center gap-2 rounded-lg px-3 h-[40px] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(108,71,255,0.1)] transition-all",
          portalInput
        )}>
          <Search size={15} className="text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={p.searchPlaceholder}
            className="flex-1 text-[13px] bg-transparent outline-none"
          />
          <SlidersHorizontal size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
        </div>

        {/* Filter pills row — scrollable on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Categories — scroll on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-nowrap sm:flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "text-[12px] font-[500] px-3 py-1.5 rounded-[6px] transition-colors shrink-0",
                  category === cat
                    ? "hr-nav-active text-[#7C3AED] dark:text-[#a78bff] font-semibold"
                    : cn(portalMutedBg, portalSubtextAlt, "hover:bg-gray-200 dark:hover:bg-gray-700")
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0" />

          {/* Difficulty */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  "text-[12px] font-[500] px-3 py-1.5 rounded-[6px] transition-colors shrink-0",
                  difficulty === d
                    ? d === "Easy"   ? "bg-emerald-500 text-white"
                    : d === "Medium" ? "bg-amber-500 text-white"
                    : d === "Hard"   ? "bg-red-500 text-white"
                    : "bg-primary text-white"
                    : cn(portalMutedBg, portalSubtextAlt, "hover:bg-gray-200 dark:hover:bg-gray-700")
                )}
              >
                {d === "All" ? p.allDifficulties : p[d.toLowerCase() as "easy" | "medium" | "hard"]}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Results count ─────────────────────────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className={cn("text-[13px] mb-5", portalSubtextAlt)}
      >
        <span className={cn("font-[600]", portalHeadingAlt)}>{filtered.length}</span>{" "}
        {p.setsFound}
      </motion.p>

      {/* ── Card Grid ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <p className={cn("text-center py-16 text-[14px]", portalSubtextAlt)}>{p.noResults}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((set, i) => (
            <motion.div
              key={set.id}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ delay: i * 0.07 }}
            >
              <QuestionSetCard set={set} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
