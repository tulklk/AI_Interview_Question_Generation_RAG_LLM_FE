"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Search, Sparkles, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { questionSets } from "@/data/jobseeker";
import { QuestionSetCard } from "./question-set-card";
import { useLanguage } from "@/context/language-context";
import type { Difficulty } from "@/types/jobseeker";

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
        className="rounded-xl px-10 py-12 mb-8"
        style={{ background: "#F5F3FF" }}
      >
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-3 py-1.5 mb-5">
            <Sparkles size={13} className="text-primary" />
            <span className="text-[12px] font-[600] text-[#111827]">{p.heroBadge}</span>
          </div>

          {/* Headline */}
          <h1 className="text-[48px] font-[800] text-[#111827] leading-[52px] mb-4">
            {p.heroTitle}{" "}
            <span className="text-primary">{p.heroTitleAccent}</span>
          </h1>
          <p className="text-[16px] text-[#6B7280] leading-[24px] max-w-lg mb-8">
            {p.heroSub}
          </p>

          {/* CTAs */}
          <div className="flex items-center gap-4">
            <button
              className="h-[44px] px-6 text-[14px] font-[600] text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors"
              style={{ boxShadow: "rgba(108,71,255,0.3) 0px 4px 14px 0px" }}
            >
              {p.heroCta}
            </button>
            <p className="text-[13px] text-[#6B7280]">{p.heroCtaSub}</p>
          </div>
        </div>
      </motion.section>

      {/* ── Search + Filters ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bg-white rounded-xl p-4 mb-6 flex flex-col gap-4"
        style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
      >
        {/* Search row */}
        <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-lg px-3 h-[40px] focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(108,71,255,0.1)] transition-all">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={p.searchPlaceholder}
            className="flex-1 text-[13px] text-[#111827] placeholder:text-[#9CA3AF] bg-transparent outline-none"
          />
          <SlidersHorizontal size={14} className="text-gray-400 shrink-0" />
        </div>

        {/* Filter pills row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Categories */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "text-[12px] font-[500] px-3 py-1.5 rounded-[6px] transition-colors",
                  category === cat
                    ? "bg-primary text-white"
                    : "bg-[#F5F7FB] text-[#6B7280] hover:bg-gray-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Difficulty */}
          <div className="flex items-center gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  "text-[12px] font-[500] px-3 py-1.5 rounded-[6px] transition-colors",
                  difficulty === d
                    ? d === "Easy"   ? "bg-emerald-500 text-white"
                    : d === "Medium" ? "bg-amber-500 text-white"
                    : d === "Hard"   ? "bg-red-500 text-white"
                    : "bg-primary text-white"
                    : "bg-[#F5F7FB] text-[#6B7280] hover:bg-gray-200"
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
        className="text-[13px] text-[#6B7280] mb-5"
      >
        <span className="font-[600] text-[#111827]">{filtered.length}</span>{" "}
        {p.setsFound}
      </motion.p>

      {/* ── Card Grid ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <p className="text-center py-16 text-[14px] text-[#6B7280]">{p.noResults}</p>
      ) : (
        <div className="grid grid-cols-3 gap-6">
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
