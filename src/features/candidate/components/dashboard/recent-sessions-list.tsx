"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, MoreHorizontal, Eye, RefreshCw, Bookmark, BookmarkCheck, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { getCompanyColor, getCompanyInitials } from "@/features/candidate/utils/company-visual";
import { Pill, PendingScorePill, getScoreBadgeClass } from "@/features/candidate/components/ui/pill";
import { toggleBookmark } from "@/features/candidate/services/question-set.service";
import type { CompletedSessionSummary } from "@/features/candidate/services/practice-session.service";

function formatSessionDate(iso: string | undefined, lang: "en" | "vi"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { month: "short", day: "numeric" });
}

interface SessionRowProps {
  session: CompletedSessionSummary;
  scoreDelta: number | null;
  bookmarked: boolean;
  onToggleBookmark: (setId: string) => void;
  pendingTooltip: string;
  menu: { viewDetail: string; practiceAgain: string; saveSet: string; unsaveSet: string };
}

function SessionRow({ session, scoreDelta, bookmarked, onToggleBookmark, pendingTooltip, menu }: SessionRowProps) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      {session.companyLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.companyLogoUrl}
          alt={session.company}
          className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-700"
        />
      ) : (
        <div className={cn("w-9 h-9 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0", getCompanyColor(session.company))}>
          {getCompanyInitials(session.company)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] font-[600] truncate", portalHeadingAlt)}>{session.setTitle}</p>
        <p className={cn("text-[11px] flex items-center gap-2 mt-0.5", portalSubtextAlt)}>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {session.durationMinutes} min
          </span>
          <span>·</span>
          <span>{formatSessionDate(session.completedAt, lang)}</span>
        </p>
      </div>

      {scoreDelta !== null && scoreDelta !== 0 && (
        <span className={cn("hidden sm:flex items-center gap-0.5 text-[11px] font-[600]", scoreDelta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
          {scoreDelta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {scoreDelta > 0 ? "+" : ""}{scoreDelta}%
        </span>
      )}

      {session.score !== null ? (
        <Pill className={cn("text-[12px] font-[700] px-2.5 py-1", getScoreBadgeClass(session.score))}>
          {session.score}%
        </Pill>
      ) : (
        <PendingScorePill label={pendingTooltip} className="text-[12px] px-2.5 py-1" />
      )}

      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-[#F5F3FF] dark:hover:bg-purple-950/30 transition-colors"
        >
          <MoreHorizontal size={15} />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl py-1">
            <Link
              href={`/jobseeker/practice/${session.id}/result`}
              className={cn("flex items-center gap-2 px-3 py-2 text-[12px] font-[500] hover:bg-gray-50 dark:hover:bg-gray-800", portalHeadingAlt)}
            >
              <Eye size={13} />
              {menu.viewDetail}
            </Link>
            <Link
              href={`/jobseeker/practice/${session.questionSetId}`}
              className={cn("flex items-center gap-2 px-3 py-2 text-[12px] font-[500] hover:bg-gray-50 dark:hover:bg-gray-800", portalHeadingAlt)}
            >
              <RefreshCw size={13} />
              {menu.practiceAgain}
            </Link>
            <button
              type="button"
              onClick={() => { onToggleBookmark(session.questionSetId); setOpen(false); }}
              className={cn("w-full flex items-center gap-2 px-3 py-2 text-[12px] font-[500] hover:bg-gray-50 dark:hover:bg-gray-800 text-left", portalHeadingAlt)}
            >
              {bookmarked ? <BookmarkCheck size={13} className="text-primary" /> : <Bookmark size={13} />}
              {bookmarked ? menu.unsaveSet : menu.saveSet}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

interface RecentSessionsListProps {
  sessions: CompletedSessionSummary[];
  bookmarkedIds: Set<string>;
  onBookmarkChange: (setId: string, bookmarked: boolean) => void;
}

export function RecentSessionsList({ sessions, bookmarkedIds, onBookmarkChange }: RecentSessionsListProps) {
  const { t } = useLanguage();
  const p = t.jobseekerDashboardPage;

  async function handleToggleBookmark(setId: string) {
    const nextState = !bookmarkedIds.has(setId);
    onBookmarkChange(setId, nextState);
    try {
      await toggleBookmark(setId);
    } catch {
      onBookmarkChange(setId, !nextState);
    }
  }

  const chronological = [...sessions].sort((a, b) => new Date(a.completedAt ?? 0).getTime() - new Date(b.completedAt ?? 0).getTime());

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
      {sessions.map((session, i) => (
        <motion.li
          key={session.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="hr-table-row flex items-center gap-4 px-5 py-3.5"
        >
          <SessionRow
            session={session}
            scoreDelta={(() => {
              if (session.score === null) return null;
              const idx = chronological.findIndex((s) => s.id === session.id);
              const prev = idx > 0 ? chronological[idx - 1] : null;
              return prev && prev.score !== null ? session.score - prev.score : null;
            })()}
            bookmarked={bookmarkedIds.has(session.questionSetId)}
            onToggleBookmark={handleToggleBookmark}
            pendingTooltip={p.pendingScoreTooltip}
            menu={p.recentSessions.menu}
          />
        </motion.li>
      ))}
    </ul>
  );
}
