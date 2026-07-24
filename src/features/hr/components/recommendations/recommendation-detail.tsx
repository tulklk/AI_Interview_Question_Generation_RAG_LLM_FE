"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, X as XIcon, Mail, Loader2,
  AlertCircle, RefreshCw, CheckCircle2, Clock, Send,
  User, Briefcase, Hash, Sparkles,
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

// ---------------------------------------------------------------------------
// Score Ring
// ---------------------------------------------------------------------------

function ScoreRing({ score, labels }: { score: number; labels: ReturnType<typeof useLanguage>["t"]["hrRecommendationsPage"]["detail"] }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circ;
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444";
  const textColor = score >= 85
    ? "text-emerald-600 dark:text-emerald-400"
    : score >= 70 ? "text-amber-600 dark:text-amber-400"
    : "text-red-500 dark:text-red-400";

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0">
        <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor"
            strokeWidth="7" className="text-gray-100 dark:text-gray-800" />
          <motion.circle
            cx="40" cy="40" r={radius} fill="none" stroke={color}
            strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-xl font-extrabold leading-none tabular-nums", textColor)}>{score}</span>
          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">/100</span>
        </div>
      </div>
      <div>
        <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-0.5", portalSubtextAlt)}>
          {labels.overallScore}
        </p>
        <p className={cn("text-[15px] font-bold", textColor)}>
          {score >= 85 ? labels.scoreExcellent : score >= 70 ? labels.scoreGood : labels.scoreFair}
        </p>
        <div className="mt-1.5 w-32 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------

function StatusChip({ status, labels }: { status: RecommendationStatus; labels: Record<string, string> }) {
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
    <span className={cn("text-[12px] font-semibold px-3 py-1 rounded-full", styles[status])}>
      {text[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Detail row
// ---------------------------------------------------------------------------

function DetailRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-gray-500 dark:text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-0.5", portalSubtextAlt)}>{label}</p>
        <div className={cn("text-[13px] font-medium", portalHeadingAlt)}>{children}</div>
      </div>
    </div>
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
// Main Detail Component
// ---------------------------------------------------------------------------

export function RecommendationDetail({ id }: { id: string }) {
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
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function handleShortlist() {
    if (!rec) return;
    setBusy("shortlist");
    try {
      await shortlistRecommendation(rec.id);
      setRec((r) => r ? { ...r, status: "SHORTLISTED" } : r);
      addToast("success", p.shortlistSuccess);
    } catch { addToast("error", p.shortlistFailed); }
    finally { setBusy(null); }
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
    } finally { setBusy(null); }
  }

  // Loading
  if (loading) return (
    <div className="flex flex-col items-center gap-3 py-24">
      <Loader2 size={28} className="animate-spin text-primary" />
      <p className={cn("text-[14px]", portalSubtext)}>{p.loading}</p>
    </div>
  );

  // Error
  if (error || !rec) return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <AlertCircle size={28} className="text-red-500" />
      <p className={cn("text-[14px]", portalSubtext)}>{p.loadFailed}</p>
      <button type="button" onClick={() => void fetchData()}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
        <RefreshCw size={13} /> {p.retryBtn}
      </button>
    </div>
  );

  const canAct = rec.status !== "INVITED" && rec.status !== "DISMISSED";
  const initials = getInitials(rec.candidateName || rec.candidateEmail);

  return (
    <>
      {/* Back */}
      <button type="button" onClick={() => router.back()}
        className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium mb-5 hover:text-primary transition-colors", portalSubtext)}>
        <ArrowLeft size={14} /> {p.backToList}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">

        {/* ── Left: Identity card ── */}
        <div className="flex flex-col gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="hr-glass-card p-5 flex flex-col gap-5">
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <div className={cn(
                "w-16 h-16 rounded-2xl text-white text-xl font-extrabold flex items-center justify-center",
                avatarColor(rec.candidateName || rec.id)
              )}>
                {initials || <User size={22} />}
              </div>
              <div>
                <h1 className={cn("text-[17px] font-bold leading-tight", portalHeading)}>
                  {rec.candidateName || "—"}
                </h1>
                <p className={cn("text-[12px] mt-0.5", portalSubtext)}>{rec.candidateEmail}</p>
                {rec.targetRole && (
                  <p className={cn("text-[12px] font-medium mt-1", portalSubtextAlt)}>{rec.targetRole}</p>
                )}
              </div>
              <StatusChip status={rec.status} labels={p.card} />
            </div>

            <div className={cn("border-t pt-4", portalDivider)}>
              <ScoreRing score={rec.score} labels={p.detail} />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {canAct ? (
                <>
                  {rec.status !== "SHORTLISTED" ? (
                    <button type="button" onClick={() => void handleShortlist()} disabled={busy !== null}
                      className="flex items-center justify-center gap-2 h-9 px-4 text-[13px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-xl transition-colors disabled:opacity-50 border border-violet-200 dark:border-violet-800 w-full">
                      {busy === "shortlist" ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />}
                      {p.card.shortlistBtn}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 h-9 px-4 text-[13px] font-semibold text-violet-600 dark:text-violet-400 rounded-xl border border-violet-200 dark:border-violet-800 w-full">
                      <CheckCircle2 size={13} /> {p.card.shortlisted}
                    </div>
                  )}
                  <button type="button" onClick={() => setShowInvite(true)} disabled={busy !== null}
                    className="shimmer-button flex items-center justify-center gap-2 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-xl disabled:opacity-60 w-full">
                    <Mail size={13} /> {p.card.inviteBtn}
                  </button>
                  <button type="button" onClick={() => void handleDismiss()} disabled={busy !== null}
                    className="flex items-center justify-center gap-2 h-9 px-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50 w-full">
                    {busy === "dismiss" ? <Loader2 size={13} className="animate-spin" /> : <XIcon size={13} />}
                    {p.card.dismissBtn}
                  </button>
                </>
              ) : (
                <div className={cn(
                  "flex items-center justify-center gap-2 h-9 text-[13px] font-medium rounded-xl border",
                  rec.status === "INVITED"
                    ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                    : "text-gray-400 border-gray-200 dark:border-gray-700"
                )}>
                  {rec.status === "INVITED" ? <CheckCircle2 size={13} /> : <XIcon size={13} />}
                  {rec.status === "INVITED" ? p.card.invited : p.card.dismissed}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Right: Details ── */}
        <div className="flex flex-col gap-4">
          {/* Info card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="hr-glass-card p-5 flex flex-col gap-4">
            <h2 className={cn("text-[13px] font-bold uppercase tracking-wider", portalSubtextAlt)}>{p.detail.info}</h2>

            <div className="flex flex-col gap-4 divide-y divide-gray-100 dark:divide-gray-800">
              {rec.targetRole && (
                <DetailRow icon={Briefcase} label={p.card.targetRole}>
                  {rec.targetRole}
                </DetailRow>
              )}

              {rec.questionSetTitle && (
                <div className="pt-3">
                  <DetailRow icon={Hash} label={p.card.questionSet}>
                    {rec.questionSetTitle}
                  </DetailRow>
                </div>
              )}

              {rec.completedAt && (
                <div className="pt-3">
                  <DetailRow icon={Clock} label={p.detail.completedAt}>
                    {formatRelativeTime(rec.completedAt, lang)}
                  </DetailRow>
                </div>
              )}
            </div>
          </motion.div>

          {/* Skills */}
          {rec.techStack.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="hr-glass-card p-5">
              <h2 className={cn("text-[13px] font-bold uppercase tracking-wider mb-3", portalSubtextAlt)}>
                {p.detail.skills}
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {rec.techStack.map((s) => (
                  <span key={s}
                    className="text-[12px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {s}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recommendation reason */}
          {rec.recommendationReason && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="hr-glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center shrink-0">
                  <Sparkles size={13} className="text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className={cn("text-[13px] font-bold uppercase tracking-wider", portalSubtextAlt)}>
                  {p.detail.reason}
                </h2>
              </div>
              <p className={cn("text-[13px] leading-relaxed", portalHeadingAlt)}>
                {rec.recommendationReason}
              </p>
            </motion.div>
          )}
        </div>
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
