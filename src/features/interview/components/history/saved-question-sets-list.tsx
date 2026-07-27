"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, Bookmark, Calendar, Globe, Loader2, PenLine, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import {
  listHrBookmarks,
  toggleHrBookmark,
  type HrBookmarkedSet,
} from "@/features/interview/services/interview.service";
import { getCompanyInitials, getCompanyColor } from "@/features/candidate/utils/company-visual";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function SavedQuestionSetsList() {
  const { t } = useLanguage();
  const sp = t.historyPage.saved;
  const rp = t.reviewPage;
  const { addToast } = useToast();

  const [items, setItems] = useState<HrBookmarkedSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);
    listHrBookmarks()
      .then(setItems)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleRemove(id: string) {
    if (removingId) return;
    setRemovingId(id);
    try {
      await toggleHrBookmark(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      addToast("success", sp.removeSuccess);
    } catch {
      addToast("error", sp.removeFailed);
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="hr-glass-card p-8 flex items-center justify-center animate-fade-up">
        <Loader2 size={22} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="hr-glass-card flex flex-col items-center gap-3 py-16 text-center animate-fade-up">
        <AlertCircle size={28} className="text-red-500" />
        <p className={cn("text-sm", portalSubtext)}>{sp.loadFailed}</p>
        <button
          type="button"
          onClick={fetchData}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <RefreshCw size={13} /> {sp.retryBtn}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="hr-glass-card p-12 flex flex-col items-center gap-3 text-center animate-fade-up">
        <div className="w-12 h-12 rounded-xl hr-icon-box flex items-center justify-center">
          <Bookmark size={22} className="text-[#7C3AED] dark:text-[#a78bff]" />
        </div>
        <p className={cn("text-sm font-medium", portalHeading)}>{sp.emptyTitle}</p>
        <p className={cn("text-xs", portalSubtext)}>{sp.emptySubtext}</p>
      </div>
    );
  }

  return (
    <div className="hr-glass-card overflow-hidden animate-fade-up divide-y divide-gray-100 dark:divide-gray-800/70">
      {items.map((item, index) => {
        const content = (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {item.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.companyLogoUrl}
                alt={item.companyName}
                loading="lazy"
                decoding="async"
                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-700"
              />
            ) : (
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0", getCompanyColor(item.companyName || item.title))}>
                {getCompanyInitials(item.companyName || item.title)}
              </div>
            )}
            <div className="min-w-0">
              <p className={cn("font-medium text-sm truncate", portalHeading)}>{item.title}</p>
              {item.companyName && (
                <p className={cn("text-xs truncate", portalSubtext)}>{item.companyName}</p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  item.status === "PUBLISHED"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}>
                  {item.status === "PUBLISHED" ? <Globe size={10} /> : <PenLine size={10} />}
                  {item.status === "PUBLISHED" ? rp.statusPublished : rp.statusDraft}
                </span>
                <span className={cn("text-xs flex items-center gap-1", portalSubtext)}>
                  <Calendar size={11} />
                  {formatDate(item.createdAt)}
                </span>
                {item.questionsCount > 0 && (
                  <span className={cn("text-xs", portalSubtext)}>{item.questionsCount} {t.historyPage.table.questions}</span>
                )}
              </div>
            </div>
          </div>
        );

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
          >
            {item.sessionId ? (
              <Link href={`/hr/history/${item.sessionId}`} className="flex-1 min-w-0 flex items-center hover:opacity-80 transition-opacity">
                {content}
              </Link>
            ) : (
              content
            )}
            <button
              type="button"
              onClick={() => void handleRemove(item.id)}
              disabled={removingId === item.id}
              title={sp.removeBtn}
              className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors disabled:opacity-40 shrink-0"
            >
              {removingId === item.id
                ? <Loader2 size={14} className="animate-spin" />
                : <Bookmark size={14} fill="currentColor" />}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
