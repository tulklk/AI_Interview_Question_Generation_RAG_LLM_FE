"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, RefreshCw, AlertCircle, Search,
  ChevronLeft, ChevronRight, Star, X as XIcon,
  Mail, CheckCircle2, Loader2, Send, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage, type Lang } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import {
  listRecommendations,
  shortlistRecommendation,
  dismissRecommendation,
  inviteRecommendation,
  type CandidateRecommendation,
  type RecommendationStatus,
} from "@/features/hr/services/recommendation.service";
import {
  portalHeading,
  portalSubtext,
  portalHeadingAlt,
  portalSubtextAlt,
  portalDivider,
} from "@/shared/utils/portal-ui";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 85 ? "text-emerald-600 dark:text-emerald-400"
    : score >= 70 ? "text-amber-600 dark:text-amber-400"
    : "text-red-500 dark:text-red-400";
  const bar =
    score >= 85 ? "bg-emerald-500"
    : score >= 70 ? "bg-amber-500"
    : "bg-red-500";
  return (
    <div className="flex flex-col items-center gap-1 min-w-11">
      <span className={cn("text-[15px] font-extrabold tabular-nums leading-none", color)}>{score}</span>
      <div className="w-8 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status, labels }: { status: RecommendationStatus; labels: Record<string, string> }) {
  const styles: Record<RecommendationStatus, string> = {
    NEW:         "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    VIEWED:      "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
    SHORTLISTED: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400",
    INVITED:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    DISMISSED:   "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
  };
  const text: Record<RecommendationStatus, string> = {
    NEW: labels.new, VIEWED: labels.viewed,
    SHORTLISTED: labels.shortlisted, INVITED: labels.invited, DISMISSED: labels.dismissed,
  };
  return (
    <span className={cn("inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap", styles[status])}>
      {text[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Invite Modal
// ---------------------------------------------------------------------------

interface InviteModalProps {
  rec: CandidateRecommendation;
  onClose: () => void;
  onSent: (id: string) => void;
  labels: ReturnType<typeof useLanguage>["t"]["hrRecommendationsPage"]["invite"];
}

function InviteModal({ rec, onClose, onSent, labels }: InviteModalProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();
  const { t } = useLanguage();
  const p = t.hrRecommendationsPage;

  async function handleSend() {
    setSending(true);
    try {
      await inviteRecommendation(rec.id, message);
      onSent(rec.id);
      addToast("success", p.inviteSuccess);
      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      addToast("error", status === 409 ? p.alreadyActed : p.inviteFailed);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn("flex items-center justify-between px-5 py-4 border-b", portalDivider)}>
          <p className="text-[15px] font-bold text-gray-900 dark:text-gray-100">{labels.modalTitle}</p>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <XIcon size={14} />
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">{labels.to}:</span>
            <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{rec.candidateName}</span>
            <span className="text-[12px] text-gray-400 dark:text-gray-500">({rec.candidateEmail})</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={labels.messagePlaceholder}
            rows={4}
            className="w-full text-[13px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 transition-all"
          />
        </div>
        <div className={cn("flex items-center justify-end gap-2 px-5 py-4 border-t", portalDivider)}>
          <button type="button" onClick={onClose} disabled={sending}
            className="h-9 px-4 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50">
            {labels.cancelBtn}
          </button>
          <button type="button" onClick={() => void handleSend()} disabled={sending}
            className="shimmer-button flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60">
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {sending ? labels.sending : labels.sendBtn}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table Row
// ---------------------------------------------------------------------------

interface RowProps {
  rec: CandidateRecommendation;
  lang: Lang;
  labels: ReturnType<typeof useLanguage>["t"]["hrRecommendationsPage"];
  index: number;
  onStatusChange: (id: string, status: RecommendationStatus) => void;
}

function CandidateRow({ rec, lang, labels, index, onStatusChange }: RowProps) {
  const [busy, setBusy] = useState<"shortlist" | "dismiss" | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const { addToast } = useToast();
  const c = labels.card;
  const canAct = rec.status !== "INVITED" && rec.status !== "DISMISSED";
  const initials = getInitials(rec.candidateName || rec.candidateEmail);
  const visibleSkills = rec.techStack.slice(0, 2);
  const extraSkills = rec.techStack.length - 2;

  async function handleShortlist() {
    setBusy("shortlist");
    try {
      await shortlistRecommendation(rec.id);
      onStatusChange(rec.id, "SHORTLISTED");
      addToast("success", labels.shortlistSuccess);
    } catch { addToast("error", labels.shortlistFailed); }
    finally { setBusy(null); }
  }

  async function handleDismiss() {
    setBusy("dismiss");
    try {
      await dismissRecommendation(rec.id);
      onStatusChange(rec.id, "DISMISSED");
      addToast("success", labels.dismissSuccess);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      addToast("error", status === 409 ? labels.alreadyActed : labels.dismissFailed);
    } finally { setBusy(null); }
  }

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className={cn(
          "group border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors",
          (rec.status === "DISMISSED") && "opacity-55"
        )}
      >
        {/* Candidate */}
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl text-white text-[12px] font-bold flex items-center justify-center shrink-0",
              avatarColor(rec.candidateName || rec.id)
            )}>
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <p className={cn("text-[13px] font-semibold leading-tight truncate", portalHeadingAlt)}>
                {rec.candidateName || "—"}
              </p>
              <p className={cn("text-[11px] truncate", portalSubtextAlt)}>{rec.candidateEmail}</p>
            </div>
          </div>
        </td>

        {/* Question set */}
        <td className="px-4 py-3.5 hidden md:table-cell">
          <p className={cn("text-[12px] font-medium truncate max-w-40", portalSubtextAlt)}>
            {rec.questionSetTitle || "—"}
          </p>
          {rec.completedAt && (
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
              {formatRelativeTime(rec.completedAt, lang)}
            </p>
          )}
        </td>

        {/* Skills */}
        <td className="px-4 py-3.5 hidden lg:table-cell">
          <div className="flex flex-wrap gap-1">
            {visibleSkills.map((s) => (
              <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {s}
              </span>
            ))}
            {extraSkills > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">
                +{extraSkills}
              </span>
            )}
          </div>
        </td>

        {/* Score */}
        <td className="px-4 py-3.5 text-center">
          <ScoreBadge score={rec.score} />
        </td>

        {/* Status */}
        <td className="px-4 py-3.5 hidden sm:table-cell">
          <StatusBadge status={rec.status} labels={c} />
        </td>

        {/* Actions */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1.5 justify-end">
            {canAct ? (
              <>
                {rec.status !== "SHORTLISTED" ? (
                  <button type="button" onClick={() => void handleShortlist()} disabled={busy !== null}
                    title={c.shortlistBtn}
                    className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors disabled:opacity-40">
                    {busy === "shortlist" ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />}
                  </button>
                ) : (
                  <span title={c.shortlisted} className="h-7 w-7 flex items-center justify-center text-violet-500">
                    <CheckCircle2 size={13} />
                  </span>
                )}
                <button type="button" onClick={() => setShowInvite(true)} disabled={busy !== null}
                  title={c.inviteBtn}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-40">
                  <Mail size={13} />
                </button>
                <button type="button" onClick={() => void handleDismiss()} disabled={busy !== null}
                  title={c.dismissBtn}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40">
                  {busy === "dismiss" ? <Loader2 size={13} className="animate-spin" /> : <XIcon size={13} />}
                </button>
              </>
            ) : null}
            <Link href={`/hr/candidate-recommendations/${rec.id}`}
              className="h-7 px-2.5 flex items-center text-[11px] font-semibold text-primary hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition-colors shrink-0">
              {c.viewDetailBtn} →
            </Link>
          </div>
        </td>
      </motion.tr>

      {showInvite && (
        <InviteModal
          rec={rec}
          labels={labels.invite}
          onClose={() => setShowInvite(false)}
          onSent={(id) => onStatusChange(id, "INVITED")}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main List
// ---------------------------------------------------------------------------

const PAGE_SIZE = 12;

// Backend accepts: NEW, SHORTLISTED, DISMISSED, INVITED — VIEWED is not a valid filter value
const STATUS_TABS: Array<{ key: string; value: string }> = [
  { key: "allStatuses",       value: "" },
  { key: "statusNew",         value: "NEW" },
  { key: "statusShortlisted", value: "SHORTLISTED" },
  { key: "statusInvited",     value: "INVITED" },
  { key: "statusDismissed",   value: "DISMISSED" },
];

const SCORE_FILTERS: Array<{ key: string; min?: number }> = [
  { key: "allScores" },
  { key: "score70plus", min: 70 },
  { key: "score80plus", min: 80 },
  { key: "score90plus", min: 90 },
];

export function RecommendationsList() {
  const { t, lang } = useLanguage();
  const p = t.hrRecommendationsPage;

  const [items, setItems] = useState<CandidateRecommendation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [minScore, setMinScore] = useState<number | undefined>(undefined);
  const [searchSet, setSearchSet] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await listRecommendations({ page, pageSize: PAGE_SIZE, status: statusFilter || undefined });
      setItems(res.items);
      setTotalCount(res.totalCount);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  function handleStatusChange(id: string, status: RecommendationStatus) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  // BE doesn't support a MinScore query param — filter client-side over the
  // current page's items instead (same approach as the question-set search below).
  const displayed = items
    .filter((r) => (minScore === undefined ? true : r.score >= minScore))
    .filter((r) => (searchSet.trim() ? r.questionSetTitle.toLowerCase().includes(searchSet.toLowerCase()) : true));

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className={cn("text-2xl font-bold", portalHeading)}>{p.heading}</h2>
          <p className={cn("text-sm mt-1", portalSubtext)}>{p.subtext}</p>
        </div>
        {!loading && totalCount > 0 && (
          <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 shrink-0 mt-1">
            {totalCount}
          </span>
        )}
      </div>

      {/* Filter bar */}
      <div className="hr-glass-card px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
        <SlidersHorizontal size={14} className="text-gray-400 shrink-0" />

        {/* Status tabs */}
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button key={tab.key} type="button" onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "whitespace-nowrap px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all",
                  active
                    ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100 font-semibold"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                )}>
                {p.filters[tab.key as keyof typeof p.filters]}
              </button>
            );
          })}
        </div>

        {/* Score filter */}
        <select
          value={minScore ?? ""}
          onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : undefined)}
          className="h-8 px-3 text-[12px] font-medium bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20 transition-colors cursor-pointer">
          {SCORE_FILTERS.map((f) => (
            <option key={f.key} value={f.min ?? ""}>{p.filters[f.key as keyof typeof p.filters]}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-40 max-w-xs ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchSet}
            onChange={(e) => setSearchSet(e.target.value)}
            placeholder={p.searchPlaceholder}
            className="w-full h-8 pl-7 pr-3 text-[12px] bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>

        <button type="button" onClick={() => void fetchData()} disabled={loading}
          className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors disabled:opacity-50">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="hr-glass-card overflow-hidden">
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="h-2.5 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                </div>
                <div className="h-6 w-16 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="hr-glass-card flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className={cn("text-[14px]", portalSubtext)}>{p.loadFailed}</p>
          <button type="button" onClick={() => void fetchData()}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
            <RefreshCw size={13} /> {p.retryBtn}
          </button>
        </div>
      ) : displayed.length === 0 ? (
        <div className="hr-glass-card flex flex-col items-center gap-3 py-16 text-center">
          <Users size={32} className="text-gray-300 dark:text-gray-600" />
          <p className={cn("text-[14px]", portalSubtext)}>{p.empty}</p>
        </div>
      ) : (
        <div className="hr-glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
                  <th className={cn("text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>
                    {p.card.candidate}
                  </th>
                  <th className={cn("text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider hidden md:table-cell", portalSubtextAlt)}>
                    {p.card.questionSet}
                  </th>
                  <th className={cn("text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider hidden lg:table-cell", portalSubtextAlt)}>
                    {p.detail.skills}
                  </th>
                  <th className={cn("text-center px-4 py-3 text-[11px] font-semibold uppercase tracking-wider", portalSubtextAlt)}>
                    {p.card.score}
                  </th>
                  <th className={cn("text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider hidden sm:table-cell", portalSubtextAlt)}>
                    {p.card.status}
                  </th>
                  <th className="px-4 py-3 w-36" />
                </tr>
              </thead>
              <tbody>
                {displayed.map((rec, i) => (
                  <CandidateRow
                    key={rec.id}
                    rec={rec}
                    lang={lang}
                    labels={p}
                    index={i}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className={cn("text-[12px]", portalSubtextAlt)}>
            {p.page} {page} / {totalPages} · {totalCount} {p.card.candidate}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={page === 1}
              className="h-8 px-3 flex items-center gap-1 text-[12px] font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary disabled:opacity-40 transition-colors bg-white dark:bg-gray-900">
              <ChevronLeft size={13} /> {p.prevPage}
            </button>
            <button type="button" onClick={() => setPage((n) => Math.min(totalPages, n + 1))} disabled={page === totalPages}
              className="h-8 px-3 flex items-center gap-1 text-[12px] font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary disabled:opacity-40 transition-colors bg-white dark:bg-gray-900">
              {p.nextPage} <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
