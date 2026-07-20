"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, RefreshCw, AlertCircle, Search,
  ChevronLeft, ChevronRight, Star, X as XIcon,
  Mail, CheckCircle2, Loader2, Send,
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
  portalDivider,
} from "@/shared/utils/portal-ui";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
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

function scoreBadgeClass(score: number): string {
  if (score >= 85) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400";
  if (score >= 70) return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400";
  return "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400";
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status, labels }: { status: RecommendationStatus; labels: Record<string, string> }) {
  const map: Record<RecommendationStatus, string> = {
    NEW:        "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    VIEWED:     "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400",
    SHORTLISTED:"bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400",
    INVITED:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    DISMISSED:  "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
  };
  const text: Record<RecommendationStatus, string> = {
    NEW: labels.new, VIEWED: labels.viewed,
    SHORTLISTED: labels.shortlisted, INVITED: labels.invited, DISMISSED: labels.dismissed,
  };
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", map[status])}>
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
      <div
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
          <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate Card
// ---------------------------------------------------------------------------

interface CardProps {
  rec: CandidateRecommendation;
  lang: Lang;
  labels: ReturnType<typeof useLanguage>["t"]["hrRecommendationsPage"];
  onStatusChange: (id: string, status: RecommendationStatus) => void;
}

function RecommendationCard({ rec, lang, labels, onStatusChange }: CardProps) {
  const [busy, setBusy] = useState<"shortlist" | "dismiss" | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const { addToast } = useToast();
  const c = labels.card;

  const canAct = rec.status !== "INVITED" && rec.status !== "DISMISSED";

  async function handleShortlist() {
    setBusy("shortlist");
    try {
      await shortlistRecommendation(rec.id);
      onStatusChange(rec.id, "SHORTLISTED");
      addToast("success", labels.shortlistSuccess);
    } catch {
      addToast("error", labels.shortlistFailed);
    } finally {
      setBusy(null);
    }
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
    } finally {
      setBusy(null);
    }
  }

  const initials = getInitials(rec.candidateName || rec.candidateEmail);
  const visibleSkills = rec.techStack.slice(0, 3);
  const extraSkills = rec.techStack.length - 3;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col gap-0 overflow-hidden",
          (rec.status === "INVITED" || rec.status === "DISMISSED") && "opacity-70"
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          <div className={cn(
            "w-10 h-10 rounded-xl text-white text-[14px] font-bold flex items-center justify-center shrink-0",
            avatarColor(rec.candidateName || rec.id)
          )}>
            {initials || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100 truncate leading-snug">
                  {rec.candidateName || "—"}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{rec.candidateEmail}</p>
              </div>
              <span className={cn("text-[14px] font-extrabold px-2.5 py-1 rounded-lg shrink-0", scoreBadgeClass(rec.score))}>
                {rec.score}
              </span>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className={cn("px-4 py-2.5 border-t border-b flex flex-col gap-1.5", portalDivider)}>
          {rec.targetRole && (
            <div className="flex items-center gap-1.5 text-[12px] text-gray-600 dark:text-gray-300">
              <span className="text-gray-400 dark:text-gray-500 shrink-0">{c.targetRole}:</span>
              <span className="font-medium truncate">{rec.targetRole}</span>
            </div>
          )}
          {rec.questionSetTitle && (
            <div className="flex items-center gap-1.5 text-[12px] text-gray-600 dark:text-gray-300">
              <span className="text-gray-400 dark:text-gray-500 shrink-0">{c.questionSet}:</span>
              <span className="truncate">{rec.questionSetTitle}</span>
            </div>
          )}
          {rec.completedAt && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              {c.completedAgo} {formatRelativeTime(rec.completedAt, lang)}
            </p>
          )}
        </div>

        {/* Skills + status */}
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 min-w-0">
            {visibleSkills.map((s) => (
              <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                {s}
              </span>
            ))}
            {extraSkills > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                +{extraSkills}
              </span>
            )}
          </div>
          <StatusBadge status={rec.status} labels={c} />
        </div>

        {/* Actions */}
        <div className={cn("px-4 py-3 border-t flex items-center gap-2", portalDivider)}>
          {canAct ? (
            <>
              {rec.status !== "SHORTLISTED" && (
                <button type="button" onClick={() => void handleShortlist()} disabled={busy !== null}
                  className="flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-lg transition-colors disabled:opacity-50">
                  {busy === "shortlist" ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
                  {c.shortlistBtn}
                </button>
              )}
              {rec.status === "SHORTLISTED" && (
                <span className="flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                  <CheckCircle2 size={11} /> {c.shortlisted}
                </span>
              )}
              <button type="button" onClick={() => setShowInvite(true)} disabled={busy !== null}
                className="flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors disabled:opacity-50">
                <Mail size={11} /> {c.inviteBtn}
              </button>
              <button type="button" onClick={() => void handleDismiss()} disabled={busy !== null}
                className="ml-auto flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50">
                {busy === "dismiss" ? <Loader2 size={11} className="animate-spin" /> : <XIcon size={11} />}
                {c.dismissBtn}
              </button>
            </>
          ) : (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 italic">
              {rec.status === "INVITED" ? c.invited : c.dismissed}
            </span>
          )}
          <Link href={`/hr/candidate-recommendations/${rec.id}`}
            className="ml-auto text-[11px] font-semibold text-primary hover:underline shrink-0">
            {c.viewDetailBtn} →
          </Link>
        </div>
      </motion.div>

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

const STATUS_TABS: Array<{ key: string; value: string }> = [
  { key: "allStatuses", value: "" },
  { key: "statusNew",   value: "NEW" },
  { key: "statusViewed",value: "VIEWED" },
  { key: "statusShortlisted", value: "SHORTLISTED" },
  { key: "statusInvited", value: "INVITED" },
  { key: "statusDismissed", value: "DISMISSED" },
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
      const res = await listRecommendations({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter || undefined,
        minScore,
      });
      setItems(res.items);
      setTotalCount(res.totalCount);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, minScore]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [statusFilter, minScore]);

  function handleStatusChange(id: string, status: RecommendationStatus) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  // Client-side search by set name
  const displayed = searchSet.trim()
    ? items.filter((r) => r.questionSetTitle.toLowerCase().includes(searchSet.toLowerCase()))
    : items;

  return (
    <div>
      {/* Heading */}
      <div className="mb-6 animate-fade-up">
        <h2 className={cn("text-2xl font-bold", portalHeading)}>{p.heading}</h2>
        <p className={cn("text-sm mt-1", portalSubtext)}>{p.subtext}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5 animate-fade-up" style={{ animationDelay: "60ms" }}>
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "whitespace-nowrap px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                  active
                    ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100 font-semibold"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                {p.filters[tab.key as keyof typeof p.filters]}
              </button>
            );
          })}
        </div>

        {/* Score filter */}
        <select
          value={minScore ?? ""}
          onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : undefined)}
          className="h-9 px-3 text-[12px] font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 outline-none focus:border-primary transition-colors"
        >
          {SCORE_FILTERS.map((f) => (
            <option key={f.key} value={f.min ?? ""}>
              {p.filters[f.key as keyof typeof p.filters]}
            </option>
          ))}
        </select>

        {/* Question set search */}
        <div className="relative flex-1 min-w-45 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchSet}
            onChange={(e) => setSearchSet(e.target.value)}
            placeholder={p.filters.allStatuses}
            className="w-full h-9 pl-8 pr-3 text-[12px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 placeholder:text-gray-400 outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Reload */}
        <button type="button" onClick={() => void fetchData()} disabled={loading}
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-primary hover:border-primary transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className={cn("text-[14px]", portalSubtext)}>{p.loadFailed}</p>
          <button type="button" onClick={() => void fetchData()}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
            <RefreshCw size={13} /> {p.retryBtn}
          </button>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Users size={32} className="text-gray-300 dark:text-gray-600" />
          <p className={cn("text-[14px]", portalSubtext)}>{p.empty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-up" style={{ animationDelay: "80ms" }}>
          {displayed.map((rec, i) => (
            <motion.div key={rec.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <RecommendationCard rec={rec} lang={lang} labels={p} onStatusChange={handleStatusChange} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button type="button" onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={page === 1}
            className="flex items-center gap-1 h-9 px-3 text-[13px] font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary disabled:opacity-40 transition-colors bg-white dark:bg-gray-900">
            <ChevronLeft size={14} /> {p.prevPage}
          </button>
          <span className="text-[13px] text-gray-500 dark:text-gray-400">
            {p.page} {page} {p.of} {totalPages}
          </span>
          <button type="button" onClick={() => setPage((n) => Math.min(totalPages, n + 1))} disabled={page === totalPages}
            className="flex items-center gap-1 h-9 px-3 text-[13px] font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary disabled:opacity-40 transition-colors bg-white dark:bg-gray-900">
            {p.nextPage} <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
