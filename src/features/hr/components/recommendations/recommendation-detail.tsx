"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, X as XIcon, Mail, Loader2,
  AlertCircle, RefreshCw, CheckCircle2, Clock, Send, User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import {
  getRecommendation,
  shortlistRecommendation,
  dismissRecommendation,
  inviteRecommendation,
  type CandidateRecommendation,
  type RecommendationStatus,
} from "@/features/hr/services/recommendation.service";
import {
  portalHeading,
  portalSubtext,
  portalMutedBg,
  portalDivider,
  portalHeadingAlt,
  portalSubtextAlt,
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

function StatusChip({ status, labels }: { status: RecommendationStatus; labels: Record<string, string> }) {
  const map: Record<RecommendationStatus, string> = {
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
    <span className={cn("text-[12px] font-semibold px-3 py-1 rounded-full", map[status])}>
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
  onSent: () => void;
  labels: ReturnType<typeof useLanguage>["t"]["hrRecommendationsPage"]["invite"];
  actionLabels: ReturnType<typeof useLanguage>["t"]["hrRecommendationsPage"];
}

function InviteModal({ rec, onClose, onSent, labels, actionLabels }: InviteModalProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();
  const p = actionLabels;

  async function handleSend() {
    setSending(true);
    try {
      await inviteRecommendation(rec.id, message);
      onSent();
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
// Score Gauge
// ---------------------------------------------------------------------------

function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score));
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circ;

  const color = clamped >= 85 ? "#10b981" : clamped >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg width="144" height="144" viewBox="0 0 144 144" className="rotate-[-90deg]">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="currentColor"
          strokeWidth="10" className="text-gray-100 dark:text-gray-800" />
        <motion.circle
          cx="72" cy="72" r={radius} fill="none" stroke={color}
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold" style={{ color }}>{clamped}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">/100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Detail Component
// ---------------------------------------------------------------------------

interface Props {
  id: string;
}

export function RecommendationDetail({ id }: Props) {
  const { t, lang } = useLanguage();
  const p = t.hrRecommendationsPage;
  const router = useRouter();

  const [rec, setRec] = useState<CandidateRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<"shortlist" | "dismiss" | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getRecommendation(id);
      if (!data) { setError(true); return; }
      setRec(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function handleShortlist() {
    if (!rec) return;
    setBusy("shortlist");
    try {
      await shortlistRecommendation(rec.id);
      setRec((r) => r ? { ...r, status: "SHORTLISTED" } : r);
      addToast("success", p.shortlistSuccess);
    } catch {
      addToast("error", p.shortlistFailed);
    } finally {
      setBusy(null);
    }
  }

  async function handleDismiss() {
    if (!rec) return;
    setBusy("dismiss");
    try {
      await dismissRecommendation(rec.id);
      setRec((r) => r ? { ...r, status: "DISMISSED" } : r);
      addToast("success", p.dismissSuccess);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      addToast("error", status === 409 ? p.alreadyActed : p.dismissFailed);
    } finally {
      setBusy(null);
    }
  }

  // ----- Loading -----
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-12 flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className={cn("text-[14px]", portalSubtext)}>{p.loading}</p>
      </div>
    );
  }

  // ----- Error -----
  if (error || !rec) {
    return (
      <div className="max-w-2xl mx-auto mt-12 flex flex-col items-center gap-3 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <p className={cn("text-[14px]", portalSubtext)}>{p.loadFailed}</p>
        <button type="button" onClick={() => void fetchData()}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
          <RefreshCw size={13} /> {p.retryBtn}
        </button>
      </div>
    );
  }

  const canAct = rec.status !== "INVITED" && rec.status !== "DISMISSED";
  const initials = getInitials(rec.candidateName || rec.candidateEmail);

  return (
    <>
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <button type="button" onClick={() => router.back()}
          className={cn("flex items-center gap-1.5 text-[13px] font-medium mb-5 hover:text-primary transition-colors", portalSubtext)}>
          <ArrowLeft size={14} /> {p.backToList}
        </button>

        {/* Hero card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">

          {/* Top section */}
          <div className={cn("flex flex-col sm:flex-row items-center gap-5 px-6 py-6 border-b", portalDivider)}>
            {/* Avatar */}
            <div className={cn(
              "w-16 h-16 rounded-2xl text-white text-xl font-extrabold flex items-center justify-center shrink-0",
              avatarColor(rec.candidateName || rec.id)
            )}>
              {initials || <User size={20} />}
            </div>

            {/* Identity */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className={cn("text-xl font-bold leading-snug", portalHeading)}>
                {rec.candidateName || "—"}
              </h1>
              <p className={cn("text-[13px]", portalSubtext)}>{rec.candidateEmail}</p>
              {rec.targetRole && (
                <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 mt-0.5">{rec.targetRole}</p>
              )}
            </div>

            {/* Status */}
            <div className="shrink-0">
              <StatusChip status={rec.status} labels={p.card} />
            </div>
          </div>

          {/* Score gauge */}
          <div className="flex flex-col items-center py-8 border-b border-gray-100 dark:border-gray-800">
            <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-4", portalSubtextAlt)}>
              {p.detail.overallScore}
            </p>
            <ScoreGauge score={rec.score} />
            <p className={cn(
              "mt-3 text-[13px] font-medium",
              rec.score >= 85 ? "text-emerald-600 dark:text-emerald-400"
              : rec.score >= 70 ? "text-amber-600 dark:text-amber-400"
              : "text-red-600 dark:text-red-400"
            )}>
              {rec.score >= 85 ? p.detail.scoreExcellent
               : rec.score >= 70 ? p.detail.scoreGood
               : p.detail.scoreFair}
            </p>
          </div>

          {/* Details grid */}
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Question set */}
            {rec.questionSetTitle && (
              <div>
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1", portalSubtextAlt)}>
                  {p.card.questionSet}
                </p>
                <p className={cn("text-[14px] font-medium", portalHeadingAlt)}>{rec.questionSetTitle}</p>
              </div>
            )}

            {/* Completed at */}
            {rec.completedAt && (
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
                <p className={cn("text-[13px]", portalSubtext)}>
                  {p.card.completedAgo} {formatRelativeTime(rec.completedAt, lang)}
                </p>
              </div>
            )}

            {/* Skills */}
            {rec.techStack.length > 0 && (
              <div>
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-2", portalSubtextAlt)}>
                  {p.detail.skills}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rec.techStack.map((s) => (
                    <span key={s}
                      className="text-[12px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation reason */}
            {rec.recommendationReason && (
              <div className={cn("rounded-xl px-4 py-3.5", portalMutedBg)}>
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-2", portalSubtextAlt)}>
                  {p.detail.reason}
                </p>
                <p className={cn("text-[13px] leading-relaxed", portalHeadingAlt)}>
                  {rec.recommendationReason}
                </p>
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className={cn("px-6 py-4 border-t flex flex-wrap items-center gap-3", portalDivider)}>
            {canAct ? (
              <>
                {rec.status !== "SHORTLISTED" && (
                  <button type="button" onClick={() => void handleShortlist()} disabled={busy !== null}
                    className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-xl transition-colors disabled:opacity-50 border border-violet-200 dark:border-violet-800">
                    {busy === "shortlist" ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />}
                    {p.card.shortlistBtn}
                  </button>
                )}
                {rec.status === "SHORTLISTED" && (
                  <span className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-violet-600 dark:text-violet-400">
                    <CheckCircle2 size={13} /> {p.card.shortlisted}
                  </span>
                )}
                <button type="button" onClick={() => setShowInvite(true)} disabled={busy !== null}
                  className="shimmer-button flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-xl disabled:opacity-60">
                  <Mail size={13} /> {p.card.inviteBtn}
                </button>
                <button type="button" onClick={() => void handleDismiss()} disabled={busy !== null}
                  className="ml-auto flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50">
                  {busy === "dismiss" ? <Loader2 size={13} className="animate-spin" /> : <XIcon size={13} />}
                  {p.card.dismissBtn}
                </button>
              </>
            ) : (
              <div className={cn(
                "flex items-center gap-2 text-[13px] font-medium w-full",
                rec.status === "INVITED" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"
              )}>
                {rec.status === "INVITED" ? <CheckCircle2 size={14} /> : <XIcon size={14} />}
                {rec.status === "INVITED" ? p.card.invited : p.card.dismissed}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {showInvite && (
        <InviteModal
          rec={rec}
          labels={p.invite}
          actionLabels={p}
          onClose={() => setShowInvite(false)}
          onSent={() => setRec((r) => r ? { ...r, status: "INVITED" } : r)}
        />
      )}
    </>
  );
}
