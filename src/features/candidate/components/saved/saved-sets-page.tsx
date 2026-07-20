"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Bookmark, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { listBookmarkedQuestionSets } from "@/features/candidate/services/question-set.service";
import { QuestionSetCard } from "@/features/candidate/components/marketplace/question-set-card";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export function SavedSetsPage() {
  const { t } = useLanguage();
  const p = t.jobseekerSavedPage;

  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listBookmarkedQuestionSets()
      .then((items) => {
        if (!cancelled) setSets(items);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function handleBookmarkChange(id: string, bookmarked: boolean) {
    if (!bookmarked) {
      setSets((prev) => prev.filter((s) => s.id !== id));
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className={cn("text-[22px] font-[800]", portalHeadingAlt)}>{p.heading}</h1>
        <p className={cn("text-[13px] mt-1", portalSubtextAlt)}>{p.subtext}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="hr-glass-card p-6 h-56 animate-pulse flex flex-col gap-4">
              <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className={cn("text-[14px]", portalSubtextAlt)}>{p.loadFailed}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline"
          >
            <RefreshCw size={13} />
            {p.retryBtn}
          </button>
        </div>
      ) : sets.length === 0 ? (
        <EmptyState icon={Bookmark} title={p.emptyState} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sets.map((set, i) => (
            <motion.div
              key={set.id}
              initial="hidden"
              animate="show"
              variants={fadeUp}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.02 }}
              className="transition-shadow duration-200 hover:drop-shadow-lg"
            >
              <QuestionSetCard set={set} initialBookmarked onBookmarkChange={handleBookmarkChange} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
