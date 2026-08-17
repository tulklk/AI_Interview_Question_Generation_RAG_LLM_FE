"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, X as XIcon, Mail, Loader2,
  AlertCircle, RefreshCw, CheckCircle2, Clock, Send,
  User, Sparkles, Phone, FileText, Download, Maximize2,
  Target, Link as LinkIcon, ChevronDown, RotateCcw,
} from "lucide-react";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import { FaLinkedinIn, FaGithub } from "react-icons/fa";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import {
  getRecommendation,
  getRecommendationCv,
  shortlistRecommendation,
  dismissRecommendation,
  inviteRecommendation,
  sendRecommendationOffer,
  markRecommendationViewed,
  restoreRecommendation,
  type CandidateRecommendation,
  type CandidateRecommendationDetail,
  type RecommendationCvDownload,
  type RecommendationStatus,
} from "@/features/hr/services/recommendation.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { InviteScheduleFields, defaultInviteSchedule, toInvitePayload } from "./invite-schedule-fields";
import {
  portalHeading,
  portalSubtext,
  portalMutedBg,
  portalDivider,
  portalHeadingAlt,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";
import { SectionCard, Field } from "@/features/candidate/components/ui/section-card";

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

function isImageCv(contentType: string | null | undefined, fileName: string | null | undefined): boolean {
  const ct = (contentType || "").toLowerCase();
  if (ct.startsWith("image/")) return true;
  const name = (fileName || "").toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(name);
}

function isPdfCv(contentType: string | null | undefined, fileName: string | null | undefined): boolean {
  const ct = (contentType || "").toLowerCase();
  if (ct === "application/pdf") return true;
  return /\.pdf$/i.test(fileName || "");
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
          <span className={cn("text-[13px] font-extrabold leading-none tabular-nums", textColor)}>{score}</span>
          <span className="text-[8px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">/100</span>
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
    SHORTLISTED: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400",
    INVITED:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    DISMISSED:   "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
  };
  const text: Record<RecommendationStatus, string> = {
    NEW: labels.new,
    SHORTLISTED: labels.shortlisted, INVITED: labels.invited, DISMISSED: labels.dismissed,
  };
  return (
    <span className={cn("text-[12px] font-semibold px-3 py-1 rounded-full", styles[status])}>
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

function buildDefaultInviteMessage(template: string, rec: CandidateRecommendation): string {
  return template
    .replace("{{name}}", rec.candidateName || "")
    .replace("{{title}}", rec.questionSetTitle || "")
    .replace("{{score}}", String(rec.score));
}

function InviteModal({ rec, onClose, onSent, labels, actionLabels }: InviteModalProps) {
  const [message, setMessage] = useState(() => buildDefaultInviteMessage(labels.defaultMessage, rec));
  const [schedule, setSchedule] = useState(defaultInviteSchedule);
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();
  const p = actionLabels;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    void getCurrentUser().then((u) => {
      const tpl = u.hrProfile?.inviteMessageTemplate?.trim();
      if (tpl) setMessage(buildDefaultInviteMessage(tpl, rec));
    }).catch(() => undefined);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    setSending(true);
    try {
      await inviteRecommendation(rec.id, toInvitePayload(message, schedule));
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

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full max-w-lg flex flex-col rounded-2xl shadow-2xl bg-white dark:bg-gray-900 max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn("flex items-center justify-between px-5 py-4 border-b shrink-0", portalDivider)}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <Mail size={16} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">{labels.modalTitle}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
                {labels.to}: <span className="font-semibold text-gray-700 dark:text-gray-300">{rec.candidateName}</span> ({rec.candidateEmail})
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
            <XIcon size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <InviteScheduleFields value={schedule} onChange={setSchedule} labels={labels} />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={labels.messagePlaceholder}
            rows={10}
            className="w-full text-[14px] leading-relaxed bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 transition-all"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className={cn("flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0", portalDivider)}>
          <button type="button" onClick={onClose} disabled={sending}
            className="h-10 px-5 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50">
            {labels.cancelBtn}
          </button>
          <button type="button" onClick={() => void handleSend()} disabled={sending}
            className="shimmer-button flex items-center gap-1.5 h-10 px-5 text-[13px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60">
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {sending ? labels.sending : labels.sendBtn}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Offer Modal
// ---------------------------------------------------------------------------

interface OfferModalProps {
  rec: CandidateRecommendation;
  onClose: () => void;
  onSent: () => void;
  labels: ReturnType<typeof useLanguage>["t"]["hrRecommendationsPage"]["offer"];
}

const OFFER_MAX_LEN = 5000;

function buildDefaultOfferMessage(template: string, rec: CandidateRecommendation): string {
  return template
    .replace("{{name}}", rec.candidateName || "")
    .replace("{{title}}", rec.questionSetTitle || "")
    .replace("{{score}}", String(rec.score));
}

function OfferModal({ rec, onClose, onSent, labels }: OfferModalProps) {
  const [message, setMessage] = useState(() => buildDefaultOfferMessage(labels.defaultMessage, rec));
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    setSending(true);
    try {
      await sendRecommendationOffer(rec.id, message.trim());
      onSent();
      addToast("success", labels.sendSuccess);
      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      addToast("error", status === 409 ? labels.alreadyAccepted : labels.sendFailed);
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative w-full max-w-lg flex flex-col rounded-2xl shadow-2xl bg-white dark:bg-gray-900 max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn("flex items-center justify-between px-5 py-4 border-b shrink-0", portalDivider)}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
              <Mail size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-gray-900 dark:text-gray-100 truncate">{labels.modalTitle}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
                {labels.to}: <span className="font-semibold text-gray-700 dark:text-gray-300">{rec.candidateName}</span> ({rec.candidateEmail})
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
            <XIcon size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{labels.explanation}</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, OFFER_MAX_LEN))}
            placeholder={labels.messagePlaceholder}
            rows={10}
            className="w-full text-[14px] leading-relaxed bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 transition-all"
            autoFocus
          />
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-right">{message.length} / {OFFER_MAX_LEN}</p>
        </div>

        <div className={cn("flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0", portalDivider)}>
          <button type="button" onClick={onClose} disabled={sending}
            className="h-10 px-5 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50">
            {labels.cancelBtn}
          </button>
          <button type="button" onClick={() => void handleSend()} disabled={sending || !message.trim()}
            className="shimmer-button flex items-center gap-1.5 h-10 px-5 text-[13px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60">
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {sending ? labels.sending : labels.sendBtn}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Main Detail Component
// ---------------------------------------------------------------------------

export function RecommendationDetail({ id }: { id: string }) {
  const { t, lang } = useLanguage();
  const p = t.hrRecommendationsPage;
  const router = useRouter();

  const [rec, setRec] = useState<CandidateRecommendationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<"shortlist" | "dismiss" | "restore" | null>(null);
  const [cvBusy, setCvBusy] = useState(false);
  const [cvPreview, setCvPreview] = useState<RecommendationCvDownload | null>(null);
  const [cvPreviewLoading, setCvPreviewLoading] = useState(false);
  const [cvLightbox, setCvLightbox] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  // Collapsible sub-sections
  const [cvSummaryOpen, setCvSummaryOpen] = useState(true);
  const [cvSkillsOpen, setCvSkillsOpen] = useState(true);
  const [techSkillsOpen, setTechSkillsOpen] = useState(true);
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    setCvPreview(null);
    try {
      const data = await getRecommendation(id);
      if (!data) { setError(true); return; }
      setRec(data);
      void markRecommendationViewed(id).then(() => {
        setRec((r) => r && !r.viewedAt ? { ...r, viewedAt: new Date().toISOString() } : r);
      }).catch(() => undefined);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Lấy SAS URL để preview CV ảnh dưới identity card (SCRUM-377).
  useEffect(() => {
    if (!rec?.hasCv) {
      setCvPreview(null);
      return;
    }
    let cancelled = false;
    setCvPreviewLoading(true);
    void getRecommendationCv(rec.id)
      .then((cv) => { if (!cancelled) setCvPreview(cv); })
      .catch(() => { if (!cancelled) setCvPreview(null); })
      .finally(() => { if (!cancelled) setCvPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [rec?.id, rec?.hasCv]);

  useEffect(() => {
    if (!cvLightbox) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setCvLightbox(false);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cvLightbox]);

  async function handleRestore() {
    if (!rec) return;
    setBusy("restore");
    try {
      await restoreRecommendation(rec.id);
      setRec((r) => r ? { ...r, status: "NEW" } : r);
      addToast("success", p.restoreSuccess);
    } catch { addToast("error", p.restoreFailed); }
    finally { setBusy(null); }
  }

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

  async function handleDownloadCv() {
    if (!rec?.hasCv) return;
    setCvBusy(true);
    try {
      const cv = cvPreview ?? await getRecommendationCv(rec.id);
      if (!cvPreview) setCvPreview(cv);
      window.open(cv.downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      addToast("error", p.detail.cvDownloadFailed);
    } finally {
      setCvBusy(false);
    }
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
  // BE allows re-shortlisting a dismissed recommendation to bring it back into
  // play (confirmed live: dismiss → invite fails 409 "shortlist lại trước khi
  // mời"), so DISMISSED isn't fully terminal like INVITED is.
  const canRestore = rec.status === "DISMISSED";
  const initials = getInitials(rec.candidateName || rec.candidateEmail);
  const hasSocial = !!(rec.linkedInUrl || rec.githubUrl);
  const cvFileName = cvPreview?.cvFileName ?? rec.cvFileName;
  const cvIsImage = isImageCv(cvPreview?.contentType, cvFileName);
  const cvIsPdf = isPdfCv(cvPreview?.contentType, cvFileName);

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
              {rec.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={rec.avatarUrl}
                  alt={rec.candidateName}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <div className={cn(
                  "w-16 h-16 rounded-2xl text-white text-xl font-extrabold flex items-center justify-center",
                  avatarColor(rec.candidateName || rec.id)
                )}>
                  {initials || <User size={22} />}
                </div>
              )}
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

            {/* Social quick links */}
            {hasSocial && (
              <div className="flex items-center justify-center gap-2">
                {rec.linkedInUrl && (
                  <a href={rec.linkedInUrl} target="_blank" rel="noopener noreferrer"
                    title={p.detail.linkedIn}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <FaLinkedinIn size={14} />
                  </a>
                )}
                {rec.githubUrl && (
                  <a href={rec.githubUrl} target="_blank" rel="noopener noreferrer"
                    title={p.detail.github}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <FaGithub size={14} />
                  </a>
                )}
              </div>
            )}

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
              ) : canRestore ? (
                <button type="button" onClick={() => void handleRestore()} disabled={busy !== null}
                  className="flex items-center justify-center gap-2 h-9 px-4 text-[13px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-xl transition-colors disabled:opacity-50 border border-violet-200 dark:border-violet-800 w-full">
                  {busy === "restore" ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  {p.card.restoreBtn}
                </button>
              ) : (
                <div className={cn(
                  "flex items-center justify-center gap-2 h-9 text-[13px] font-medium rounded-xl border",
                  "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                )}>
                  <CheckCircle2 size={13} />
                  {p.card.invited}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowOffer(true)}
                disabled={busy !== null || ["SENT", "ACCEPTED"].includes((rec.latestOfferStatus ?? "").toUpperCase())}
                title={
                  rec.latestOfferStatus?.toUpperCase() === "ACCEPTED"
                    ? p.offer.alreadyAccepted
                    : rec.latestOfferStatus?.toUpperCase() === "SENT"
                      ? p.offer.alreadySent
                      : undefined
                }
                className="flex items-center justify-center gap-2 h-9 px-4 text-[13px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl transition-colors disabled:opacity-50 border border-amber-200 dark:border-amber-800 w-full">
                <Send size={13} /> {p.offer.btnLabel}
              </button>
            </div>
          </motion.div>

          {/* CV preview — below identity card */}
          {rec.hasCv && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="hr-glass-card overflow-hidden"
            >
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <p className={cn("text-[12px] font-bold truncate", portalHeadingAlt)}>
                    {p.detail.cvTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDownloadCv()}
                  disabled={cvBusy}
                  className="h-7 px-2 flex items-center gap-1 text-[11px] font-semibold text-primary hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                >
                  {cvBusy ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                  {p.detail.cvDownload}
                </button>
              </div>

              {cvPreviewLoading ? (
                <div className="h-[520px] flex items-center justify-center bg-gray-50 dark:bg-gray-900/40">
                  <Loader2 size={20} className="animate-spin text-primary" />
                </div>
              ) : cvPreview && cvIsImage ? (
                <button
                  type="button"
                  onClick={() => setCvLightbox(true)}
                  className="group relative block w-full text-left max-h-[640px] overflow-y-auto bg-gray-50 dark:bg-gray-900/40 scrollbar-hide"
                  title={p.detail.cvPreviewHint}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cvPreview.downloadUrl}
                    alt={cvPreview.cvFileName || "CV"}
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-contain bg-white dark:bg-gray-950"
                  />
                  <span className="sticky bottom-0 inset-x-0 pointer-events-none flex justify-center pb-3 -mt-10">
                    <span className="opacity-90 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-black/55 shadow-sm">
                      <Maximize2 size={11} />
                      {p.detail.cvPreviewOpen}
                    </span>
                  </span>
                </button>
              ) : cvPreview && cvIsPdf ? (
                <div className="relative w-full bg-gray-50 dark:bg-gray-900/40">
                  <iframe
                    src={cvPreview.downloadUrl}
                    title={cvPreview.cvFileName || "CV"}
                    className="w-full h-[640px] bg-white dark:bg-gray-950"
                  />
                  <button
                    type="button"
                    onClick={() => setCvLightbox(true)}
                    title={p.detail.cvPreviewHint}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-black/55 shadow-sm hover:bg-black/70 transition-colors"
                  >
                    <Maximize2 size={11} />
                    {p.detail.cvPreviewOpen}
                  </button>
                </div>
              ) : cvPreview ? (
                <button
                  type="button"
                  onClick={() => void handleDownloadCv()}
                  className="w-full h-40 flex flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <FileText size={22} className="text-gray-400" />
                  <span className={cn("text-[11px] font-medium px-3 text-center truncate max-w-full", portalSubtextAlt)}>
                    {cvPreview.cvFileName}
                  </span>
                </button>
              ) : (
                <div className="h-40 flex items-center justify-center px-4">
                  <p className={cn("text-[12px] text-center", portalSubtext)}>{p.detail.cvEmpty}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Lý do đề xuất — hiển thị dưới CV */}
          {rec.recommendationReason && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <SectionCard title={p.detail.reason} icon={Sparkles}
                iconBg="bg-amber-50 dark:bg-amber-950/40" iconColor="text-amber-600 dark:text-amber-400">
                <p className={cn("text-[13px] leading-relaxed", portalHeadingAlt)}>
                  {rec.recommendationReason}
                </p>
              </SectionCard>
            </motion.div>
          )}
        </div>

        {/* ── Right: candidate-profile style sections ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col gap-5 min-w-0"
        >
          {/* Heading */}
          <h1 className={cn("text-[22px] font-[800]", portalHeadingAlt)}>{p.detail.profileTitle}</h1>

          {(typeof rec.fitPercent === "number" || rec.jdSkills.length > 0) && (
            <SectionCard title={p.fit.title} icon={Target}
              iconBg="bg-cyan-50 dark:bg-cyan-950/40" iconColor="text-cyan-600 dark:text-cyan-400">
              {typeof rec.fitPercent === "number" && (
                <p className="text-[28px] font-extrabold tabular-nums text-cyan-600 dark:text-cyan-400 mb-3">
                  {rec.fitPercent}%
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
                <div>
                  <p className={cn("font-semibold mb-1", portalSubtextAlt)}>{p.fit.matched}</p>
                  <p>{rec.matchedSkills.join(", ") || "—"}</p>
                </div>
                <div>
                  <p className={cn("font-semibold mb-1", portalSubtextAlt)}>{p.fit.missing}</p>
                  <p>{rec.missingOnCv.join(", ") || "—"}</p>
                </div>
                <div>
                  <p className={cn("font-semibold mb-1", portalSubtextAlt)}>{p.fit.extra}</p>
                  <p>{rec.extraOnCv.join(", ") || "—"}</p>
                </div>
              </div>
              {rec.skillScores.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className={cn("text-[11px] font-semibold", portalSubtextAlt)}>{p.fit.skillScores}</p>
                  {rec.skillScores.map((s) => (
                    <div key={s.skill} className="flex items-center gap-2">
                      <span className="w-28 truncate text-[12px]">{s.skill}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${Math.min(100, s.avgScore)}%` }} />
                      </div>
                      <span className="text-[11px] tabular-nums w-10 text-right">{Math.round(s.avgScore)}</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* ① Thông tin liên hệ */}
          <SectionCard title={t.jobseekerProfilePage.sectionContact} icon={User}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
              <Field label={t.jobseekerProfilePage.fullName}>
                <span className={cn("text-[14px] font-semibold", portalHeadingAlt)}>{rec.candidateName || "—"}</span>
              </Field>
              <Field label={p.detail.phone}>
                {rec.phoneNumber ? (
                  <a href={`tel:${rec.phoneNumber}`} className={cn("text-[14px] hover:text-primary transition-colors", portalHeadingAlt)}>
                    {rec.phoneNumber}
                  </a>
                ) : (
                  <span className={cn("text-[14px] italic", portalSubtextAlt)}>—</span>
                )}
              </Field>
              <Field label="Email" full>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400 shrink-0" />
                  <a href={`mailto:${rec.candidateEmail}`} className={cn("text-[14px] hover:text-primary transition-colors break-all", portalHeadingAlt)}>
                    {rec.candidateEmail}
                  </a>
                </div>
              </Field>
              {rec.address && (
                <Field label={p.detail.address} full>
                  <span className={cn("text-[14px]", portalHeadingAlt)}>{rec.address}</span>
                </Field>
              )}
            </div>
          </SectionCard>

          {/* ② Định hướng nghề nghiệp */}
          <SectionCard title={t.jobseekerProfilePage.sectionCareer} icon={Target}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 mb-5">
              <Field label={p.card.targetRole}>
                {rec.targetRole ? (
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-primary shrink-0" />
                    <span className="text-[14px] font-semibold text-primary">{rec.targetRole}</span>
                  </div>
                ) : (
                  <span className={cn("text-[14px] italic", portalSubtextAlt)}>—</span>
                )}
              </Field>
              {rec.questionSetTitle && (
                <Field label={p.card.questionSet}>
                  <span className={cn("text-[14px]", portalHeadingAlt)}>{rec.questionSetTitle}</span>
                </Field>
              )}
              {rec.completedAt && (
                <Field label={p.detail.completedAt}>
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-gray-400 shrink-0" />
                    <span className={cn("text-[14px]", portalHeadingAlt)}>{formatRelativeTime(rec.completedAt, lang)}</span>
                  </div>
                </Field>
              )}
            </div>
            {rec.bio && (
              <Field label={p.detail.bio}>
                <p className={cn("text-[14px] leading-relaxed whitespace-pre-line mt-1", portalHeadingAlt)}>{rec.bio}</p>
              </Field>
            )}
          </SectionCard>

          {/* ③ CV / Hồ sơ */}
          <SectionCard title={p.detail.cvTitle} icon={FileText}
            iconBg="bg-blue-50 dark:bg-blue-950/40" iconColor="text-blue-600 dark:text-blue-400">
            {rec.hasCv ? (
              <div className="flex flex-col gap-4">
                {/* File row */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                  <FileText size={15} className={cn("shrink-0", portalSubtextAlt)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[13px] font-semibold truncate", portalHeadingAlt)}>{rec.cvFileName || "CV"}</p>
                    {rec.cvUploadedAt && (
                      <p className={cn("text-[11px]", portalSubtextAlt)}>{formatRelativeTime(rec.cvUploadedAt, lang)}</p>
                    )}
                  </div>
                  <button type="button" onClick={() => void handleDownloadCv()} disabled={cvBusy}
                    className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold text-primary hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition-colors shrink-0 disabled:opacity-50">
                    {cvBusy ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    {cvBusy ? p.detail.cvDownloading : p.detail.cvDownload}
                  </button>
                </div>
                {/* Summary — collapsible */}
                {rec.cvSummary && (
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-1">
                    <button
                      type="button"
                      onClick={() => setCvSummaryOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-1 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>{p.detail.cvSummary}</p>
                      <ChevronDown size={13} className={cn("transition-transform duration-200 shrink-0", portalSubtextAlt, !cvSummaryOpen && "-rotate-90")} />
                    </button>
                    {cvSummaryOpen && (
                      <p className={cn("text-[13px] leading-relaxed px-1 pb-1", portalHeadingAlt)}>{rec.cvSummary}</p>
                    )}
                  </div>
                )}
                {/* CV Skills — collapsible + icons */}
                {rec.cvSkills.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-1">
                    <button
                      type="button"
                      onClick={() => setCvSkillsOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-1 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>{p.detail.cvSkills}</p>
                        <span className={cn("text-[10px] font-semibold tabular-nums", portalSubtextAlt)}>({rec.cvSkills.length})</span>
                      </div>
                      <ChevronDown size={13} className={cn("transition-transform duration-200 shrink-0", portalSubtextAlt, !cvSkillsOpen && "-rotate-90")} />
                    </button>
                    {cvSkillsOpen && (
                      <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                        {rec.cvSkills.map((s) => {
                          const si = getSkillIcon(s);
                          const SIcon = si?.icon;
                          return (
                            <span key={s} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                              {SIcon && <SIcon size={10} className={cn("shrink-0", si.className)} />}
                              {s}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className={cn("text-[13px] italic", portalSubtextAlt)}>{p.detail.cvEmpty}</p>
            )}
          </SectionCard>

          {/* ④ Kỹ năng chuyên môn — collapsible + icons */}
          {rec.techStack.length > 0 && (
            <div className="hr-glass-card overflow-hidden">
              <button
                type="button"
                onClick={() => setTechSkillsOpen((v) => !v)}
                className="w-full flex items-center gap-2.5 px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <Sparkles size={15} className="text-gray-800 dark:text-gray-200" />
                </div>
                <h3 className="flex-1 text-[15px] font-bold text-charcoal dark:text-gray-100">
                  {t.jobseekerProfilePage.sectionSkills}
                </h3>
                <span className={cn("text-[11px] font-semibold tabular-nums", portalSubtextAlt)}>
                  {rec.techStack.length}
                </span>
                <ChevronDown size={16} className={cn("transition-transform duration-200 shrink-0 ml-1", portalSubtextAlt, !techSkillsOpen && "-rotate-90")} />
              </button>
              {techSkillsOpen && (
                <div className="px-6 pb-5 flex flex-wrap gap-1.5 border-t border-gray-100 dark:border-gray-800 pt-4">
                  {rec.techStack.map((s) => {
                    const si = getSkillIcon(s);
                    const SIcon = si?.icon;
                    return (
                      <span key={s} className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                        {SIcon && <SIcon size={11} className={cn("shrink-0", si.className)} />}
                        {s}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ⑤ Liên kết mạng xã hội */}
          {(rec.linkedInUrl || rec.githubUrl) && (
            <SectionCard title={t.jobseekerProfilePage.sectionLinks} icon={LinkIcon}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                {rec.linkedInUrl && (
                  <Field label={p.detail.linkedIn}>
                    <a href={rec.linkedInUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[14px] text-primary hover:underline break-all">
                      {rec.linkedInUrl}
                    </a>
                  </Field>
                )}
                {rec.githubUrl && (
                  <Field label={p.detail.github}>
                    <a href={rec.githubUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[14px] text-primary hover:underline break-all">
                      {rec.githubUrl}
                    </a>
                  </Field>
                )}
              </div>
            </SectionCard>
          )}

          {/* ⑥ Phản hồi lời mời */}
          {(rec.invitationResponseMessage || rec.invitationSharedPhoneNumber) && (
            <SectionCard title={p.detail.candidateContactTitle} icon={Phone}
              iconBg="bg-emerald-50 dark:bg-emerald-950/40" iconColor="text-emerald-600 dark:text-emerald-400">
              <p className={cn("text-[12px] mb-4 -mt-2", portalSubtextAlt)}>{p.detail.candidateContactSubtitle}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                {rec.invitationSharedPhoneNumber && (
                  <Field label={p.detail.candidateContactPhone}>
                    <a href={`tel:${rec.invitationSharedPhoneNumber}`}
                      className={cn("text-[14px] hover:text-primary transition-colors", portalHeadingAlt)}>
                      {rec.invitationSharedPhoneNumber}
                    </a>
                  </Field>
                )}
                {rec.invitationResponseMessage && (
                  <Field label={p.detail.candidateContactMessage}
                    full={!rec.invitationSharedPhoneNumber}>
                    <p className={cn("text-[14px] leading-relaxed whitespace-pre-line", portalHeadingAlt)}>
                      {rec.invitationResponseMessage}
                    </p>
                  </Field>
                )}
              </div>
            </SectionCard>
          )}

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

      {showOffer && (
        <OfferModal
          rec={rec}
          labels={p.offer}
          onClose={() => setShowOffer(false)}
          onSent={() => undefined}
        />
      )}

      {cvLightbox && cvPreview && (cvIsImage || cvIsPdf) && typeof document !== "undefined" && createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={() => setCvLightbox(false)}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 shrink-0">
            <p className="text-[13px] font-medium text-white/90 truncate">
              {cvPreview.cvFileName || p.detail.cvTitle}
            </p>
            <button
              type="button"
              onClick={() => setCvLightbox(false)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <XIcon size={18} />
            </button>
          </div>
          <div
            className={cn(
              "flex-1",
              cvIsPdf ? "p-0 min-h-0" : "overflow-auto flex items-start justify-center p-4 sm:p-8"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {cvIsPdf ? (
              <iframe
                src={cvPreview.downloadUrl}
                title={cvPreview.cvFileName || "CV"}
                className="w-full h-full bg-white"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={cvPreview.downloadUrl}
                alt={cvPreview.cvFileName || "CV"}
                referrerPolicy="no-referrer"
                className="max-w-full h-auto rounded-lg shadow-2xl"
              />
            )}
          </div>
        </motion.div>,
        document.body
      )}
    </>
  );
}
