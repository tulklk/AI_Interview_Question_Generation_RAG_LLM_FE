"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Star, X as XIcon, Mail, Loader2,
  AlertCircle, RefreshCw, CheckCircle2, Clock, Send,
  User, Sparkles, Phone, FileText, Download, Maximize2,
  Target, ChevronDown, RotateCcw, MapPin, Briefcase,
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
  isCandidateAccepted,
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

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function titleCase(s: string): string {
  if (!s) return s;
  return s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
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
    <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full", styles[status])}>
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
  // CV section collapse
  const [cvSummaryOpen, setCvSummaryOpen] = useState(true);
  const [cvSkillsOpen, setCvSkillsOpen] = useState(true);
  // Chip expansion
  const [extraOnCvExpanded, setExtraOnCvExpanded] = useState(false);
  const [cvSkillsExpanded, setCvSkillsExpanded] = useState(false);
  // CV summary clamp
  const [cvSummaryExpanded, setCvSummaryExpanded] = useState(false);
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
  const canRestore = rec.status === "DISMISSED";
  const initials = getInitials(rec.candidateName || rec.candidateEmail);
  const hasSocial = !!(rec.linkedInUrl || rec.githubUrl);
  const cvFileName = cvPreview?.cvFileName ?? rec.cvFileName;
  const cvIsImage = isImageCv(cvPreview?.contentType, cvFileName);
  const cvIsPdf = isPdfCv(cvPreview?.contentType, cvFileName);
  const scoreColor = rec.score >= 85
    ? "text-emerald-500 dark:text-emerald-400"
    : rec.score >= 70 ? "text-amber-500 dark:text-amber-400"
    : "text-red-500 dark:text-red-400";

  const CHIP_LIMIT = 5;
  const SKILL_CHIP_LIMIT = 6;

  return (
    <>
      {/* Back */}
      <button type="button" onClick={() => router.back()}
        className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium mb-4 hover:text-primary transition-colors", portalSubtext)}>
        <ArrowLeft size={14} /> {p.backToList}
      </button>

      {/* ① Candidate Summary Bar */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="hr-glass-card p-5 mb-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">

          {/* Identity */}
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            {rec.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={rec.avatarUrl} alt={rec.candidateName} referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover ring-2 ring-white dark:ring-gray-700 shadow shrink-0" />
            ) : (
              <div className={cn(
                "w-14 h-14 rounded-full text-white text-xl font-black flex items-center justify-center shadow ring-2 ring-white dark:ring-gray-700 shrink-0",
                avatarColor(rec.candidateName || rec.id)
              )}>
                {initials || <User size={20} />}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h1 className={cn("text-[20px] font-bold leading-tight", portalHeading)}>
                  {rec.candidateName || "—"}
                </h1>
                <StatusChip status={rec.status} labels={p.card} />
                {isCandidateAccepted(rec) && (
                  <span title={p.card.acceptedHint}
                    className="inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 whitespace-nowrap">
                    {p.card.accepted}
                  </span>
                )}
              </div>
              <p className={cn("text-[13px] truncate", portalSubtext)}>{rec.candidateEmail}</p>
              {rec.targetRole && (
                <p className={cn("text-[12px] font-medium mt-0.5 truncate", portalSubtextAlt)}>{rec.targetRole}</p>
              )}
              {hasSocial && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  {rec.linkedInUrl && (
                    <a href={rec.linkedInUrl} target="_blank" rel="noopener noreferrer"
                      title={p.detail.linkedIn}
                      className="h-5 w-5 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                      <FaLinkedinIn size={10} />
                    </a>
                  )}
                  {rec.githubUrl && (
                    <a href={rec.githubUrl} target="_blank" rel="noopener noreferrer"
                      title={p.detail.github}
                      className="h-5 w-5 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                      <FaGithub size={10} />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-14 bg-gray-200 dark:bg-gray-700 shrink-0" />

          {/* Metrics */}
          <div className="flex items-center gap-4 sm:gap-5 flex-wrap shrink-0">
            {/* Evaluation Score */}
            <div className="flex flex-col items-center min-w-12">
              <span className={cn("text-[26px] font-black leading-none tabular-nums", scoreColor)}>
                {rec.score}
              </span>
              <span className={cn("text-[9px] font-bold uppercase tracking-wide mt-0.5 whitespace-nowrap", portalSubtextAlt)}>
                {p.detail.overallScore}
              </span>
            </div>

            {typeof rec.fitPercent === "number" && (
              <>
                <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex flex-col items-center min-w-10">
                  <span className="text-[26px] font-black leading-none tabular-nums text-cyan-500 dark:text-cyan-400">
                    {rec.fitPercent}
                    <span className="text-[13px] font-bold text-cyan-400/80 dark:text-cyan-500/70">%</span>
                  </span>
                  <span className={cn("text-[9px] font-bold uppercase tracking-wide mt-0.5 whitespace-nowrap", portalSubtextAlt)}>
                    Khớp CV–JD
                  </span>
                </div>
              </>
            )}

            <div className="hidden sm:block w-px h-10 bg-gray-200 dark:bg-gray-700 shrink-0" />

            {/* Actions */}
            <div className="flex flex-col gap-1.5 min-w-28">
              {/* Gửi Offer */}
              <button
                type="button"
                onClick={() => setShowOffer(true)}
                disabled={busy !== null || ["SENT", "ACCEPTED"].includes((rec.latestOfferStatus ?? "").toUpperCase())}
                title={
                  rec.latestOfferStatus?.toUpperCase() === "ACCEPTED" ? p.offer.alreadyAccepted
                    : rec.latestOfferStatus?.toUpperCase() === "SENT" ? p.offer.alreadySent
                    : undefined
                }
                className="flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-bold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm">
                <Send size={12} /> {p.offer.btnLabel}
              </button>

              {/* Xem CV */}
              {rec.hasCv && (
                <button
                  type="button"
                  onClick={() => cvPreview ? setCvLightbox(true) : void handleDownloadCv()}
                  disabled={cvBusy || cvPreviewLoading}
                  className="flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-semibold text-primary hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition-colors border border-violet-200 dark:border-violet-800 disabled:opacity-50">
                  {cvPreviewLoading ? <Loader2 size={12} className="animate-spin" /> : <Maximize2 size={12} />}
                  {p.detail.cvView}
                </button>
              )}

              {/* Shortlist / Dismiss / Restore */}
              <div className="flex items-center gap-1">
                {canAct ? (
                  <>
                    {rec.status !== "SHORTLISTED" ? (
                      <button type="button" onClick={() => void handleShortlist()} disabled={busy !== null}
                        className="flex-1 flex items-center justify-center gap-1 h-7 px-2 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-md transition-colors border border-violet-200 dark:border-violet-800 disabled:opacity-50">
                        {busy === "shortlist" ? <Loader2 size={11} className="animate-spin" /> : <Star size={11} />}
                        {p.card.shortlistBtn}
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center gap-1 h-7 px-2 text-[11px] font-semibold text-violet-600 dark:text-violet-400 rounded-md border border-violet-200 dark:border-violet-800">
                        <CheckCircle2 size={11} /> {p.card.shortlisted}
                      </div>
                    )}
                    <button type="button" onClick={() => void handleDismiss()} disabled={busy !== null}
                      className="h-7 w-7 flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 shrink-0">
                      {busy === "dismiss" ? <Loader2 size={12} className="animate-spin" /> : <XIcon size={12} />}
                    </button>
                  </>
                ) : canRestore ? (
                  <button type="button" onClick={() => void handleRestore()} disabled={busy !== null}
                    className="w-full flex items-center justify-center gap-1 h-7 px-2 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-md transition-colors border border-violet-200 dark:border-violet-800 disabled:opacity-50">
                    {busy === "restore" ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                    {p.card.restoreBtn}
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={11} /> {p.card.invited}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ② Recommendation Reason */}
      {rec.recommendationReason && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-2 px-3.5 py-2 mb-5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40"
        >
          <Sparkles size={12} className="text-amber-500 dark:text-amber-400 shrink-0" />
          <p className="text-[12px] leading-snug min-w-0 truncate">
            <span className="font-bold text-amber-600 dark:text-amber-400 text-[10px] uppercase tracking-wide mr-1.5">
              {p.detail.reason} ·
            </span>
            <span className={cn(portalHeadingAlt)}>{rec.recommendationReason}</span>
          </p>
        </motion.div>
      )}

      {/* ③ CV-JD Analysis + Skill Performance — side by side */}
      {(typeof rec.fitPercent === "number" || rec.jdSkills.length > 0 || rec.skillScores.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 items-start"
        >
          {/* CV-JD Analysis */}
          {(typeof rec.fitPercent === "number" || rec.jdSkills.length > 0) && (
            <div className="hr-glass-card p-3.5">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-6 h-6 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center shrink-0">
                  <Target size={13} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className={cn("text-[14px] font-semibold", portalHeadingAlt)}>{p.fit.title}</h3>
              </div>

              {typeof rec.fitPercent === "number" && (
                <>
                  {/* Stats row */}
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="flex flex-col shrink-0">
                      <div className="flex items-end gap-0.5 leading-none">
                        <span className="text-[30px] font-black tabular-nums text-cyan-600 dark:text-cyan-400 leading-none">
                          {rec.fitPercent}
                        </span>
                        <span className="text-[13px] font-bold text-cyan-400 dark:text-cyan-500/70 mb-1">%</span>
                      </div>
                      <p className={cn("text-[9px] font-bold uppercase tracking-wide mt-0.5", portalSubtextAlt)}>
                        {p.fit.title}
                      </p>
                    </div>
                    <div className="w-px h-10 bg-gray-100 dark:bg-gray-800 shrink-0" />
                    <div className="flex gap-2 flex-1">
                      <div className="flex-1 flex flex-col items-center py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-[16px] font-black tabular-nums text-emerald-600 dark:text-emerald-400 leading-none">{rec.matchedSkills.length}</span>
                        <p className="text-[8px] font-bold uppercase tracking-wide text-emerald-500/80 dark:text-emerald-400/70 mt-0.5">{p.fit.matched}</p>
                      </div>
                      <div className="flex-1 flex flex-col items-center py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                        <span className="text-[16px] font-black tabular-nums text-rose-500 dark:text-rose-400 leading-none">{rec.missingOnCv.length}</span>
                        <p className="text-[8px] font-bold uppercase tracking-wide text-rose-400/80 dark:text-rose-400/70 mt-0.5">{p.fit.missing}</p>
                      </div>
                      <div className="flex-1 flex flex-col items-center py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                        <span className="text-[16px] font-black tabular-nums text-blue-500 dark:text-blue-400 leading-none">{rec.extraOnCv.length}</span>
                        <p className="text-[8px] font-bold uppercase tracking-wide text-blue-400/80 dark:text-blue-400/70 mt-0.5">{p.fit.extra}</p>
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3">
                    <motion.div
                      className={cn("h-full rounded-full",
                        rec.fitPercent >= 70 ? "bg-emerald-500" : rec.fitPercent >= 40 ? "bg-amber-500" : "bg-cyan-400"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${rec.fitPercent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </>
              )}

              {/* Skill columns */}
              <div className="grid grid-cols-3 gap-2">
                {/* Khớp — max 3 chips */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block" />
                    {p.fit.matched}
                  </p>
                  {rec.matchedSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {rec.matchedSkills.slice(0, 3).map((s) => {
                        const si = getSkillIcon(s);
                        const SIcon = si?.icon;
                        return (
                          <span key={s} className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {SIcon && <SIcon size={9} className={cn("shrink-0", si.className)} />}
                            {titleCase(s)}
                          </span>
                        );
                      })}
                      {rec.matchedSkills.length > 3 && (
                        <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                          +{rec.matchedSkills.length - 3}
                        </span>
                      )}
                    </div>
                  ) : <span className={cn("text-[11px] italic", portalSubtextAlt)}>—</span>}
                </div>

                {/* Thiếu — max 3 chips */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-400 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 inline-block" />
                    {p.fit.missing}
                  </p>
                  {rec.missingOnCv.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {rec.missingOnCv.slice(0, 3).map((s) => {
                        const si = getSkillIcon(s);
                        const SIcon = si?.icon;
                        return (
                          <span key={s} className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {SIcon && <SIcon size={9} className={cn("shrink-0", si.className)} />}
                            {titleCase(s)}
                          </span>
                        );
                      })}
                      {rec.missingOnCv.length > 3 && (
                        <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400">
                          +{rec.missingOnCv.length - 3}
                        </span>
                      )}
                    </div>
                  ) : <span className={cn("text-[11px] italic", portalSubtextAlt)}>—</span>}
                </div>

                {/* Thêm trên CV */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 inline-block" />
                    {p.fit.extra}
                  </p>
                  {rec.extraOnCv.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {(extraOnCvExpanded ? rec.extraOnCv : rec.extraOnCv.slice(0, CHIP_LIMIT)).map((s) => {
                        const si = getSkillIcon(s);
                        const SIcon = si?.icon;
                        return (
                          <span key={s} className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {SIcon && <SIcon size={9} className={cn("shrink-0", si.className)} />}
                            {titleCase(s)}
                          </span>
                        );
                      })}
                      {rec.extraOnCv.length > CHIP_LIMIT && !extraOnCvExpanded && (
                        <button
                          type="button"
                          onClick={() => setExtraOnCvExpanded(true)}
                          className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          +{rec.extraOnCv.length - CHIP_LIMIT}
                        </button>
                      )}
                    </div>
                  ) : <span className={cn("text-[11px] italic", portalSubtextAlt)}>—</span>}
                </div>
              </div>
            </div>
          )}

          {/* Skill Performance */}
          {rec.skillScores.length > 0 && (
            <div className="hr-glass-card p-3.5">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-6 h-6 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                  <Star size={13} className="text-violet-500 dark:text-violet-400" />
                </div>
                <h3 className={cn("text-[14px] font-semibold", portalHeadingAlt)}>{p.fit.skillScores}</h3>
              </div>
              <div className="space-y-2">
                {rec.skillScores.map((s) => {
                  const si = getSkillIcon(s.skill);
                  const SIcon = si?.icon;
                  const pct = Math.min(100, Math.round(s.avgScore));
                  const barColor = pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-cyan-500";
                  const sc = pct >= 85
                    ? "text-emerald-600 dark:text-emerald-400"
                    : pct >= 70 ? "text-amber-600 dark:text-amber-400"
                    : "text-cyan-600 dark:text-cyan-400";
                  return (
                    <div key={s.skill} className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5 w-28 shrink-0">
                        {SIcon
                          ? <SIcon size={12} className={cn("shrink-0", si.className)} />
                          : <span className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700 shrink-0" />
                        }
                        <span className={cn("text-[12px] font-medium truncate", portalHeadingAlt)}>{capitalize(s.skill)}</span>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <motion.div
                          className={cn("h-full rounded-full", barColor)}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                        />
                      </div>
                      <span className={cn("text-[12px] font-bold tabular-nums w-7 text-right shrink-0", sc)}>{pct}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ④ Candidate Information — merged */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="hr-glass-card p-5 mb-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <User size={13} className={portalSubtextAlt} />
          </div>
          <h3 className={cn("text-[14px] font-semibold", portalHeadingAlt)}>Thông tin ứng viên</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
          {/* Email */}
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Mail size={9} className="text-gray-400 shrink-0" />
              <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>Email</p>
            </div>
            <a href={`mailto:${rec.candidateEmail}`}
              className={cn("text-[12px] hover:text-primary transition-colors truncate block", portalHeadingAlt)}>
              {rec.candidateEmail}
            </a>
          </div>
          {/* Phone */}
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Phone size={9} className="text-gray-400 shrink-0" />
              <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>{p.detail.phone}</p>
            </div>
            {rec.phoneNumber
              ? <a href={`tel:${rec.phoneNumber}`} className={cn("text-[12px] hover:text-primary transition-colors", portalHeadingAlt)}>{rec.phoneNumber}</a>
              : <span className={cn("text-[12px] italic", portalSubtextAlt)}>—</span>
            }
          </div>
          {/* Target role */}
          {rec.targetRole && (
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Briefcase size={9} className="text-gray-400 shrink-0" />
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>{p.card.targetRole}</p>
              </div>
              <span className="text-[12px] font-semibold text-primary">{rec.targetRole}</span>
            </div>
          )}
          {/* Status */}
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <CheckCircle2 size={9} className="text-gray-400 shrink-0" />
              <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>Trạng thái</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <StatusChip status={rec.status} labels={p.card} />
              {isCandidateAccepted(rec) && (
                <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  {p.card.accepted}
                </span>
              )}
            </div>
          </div>
          {/* Question set */}
          {rec.questionSetTitle && (
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <FileText size={9} className="text-gray-400 shrink-0" />
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>{p.card.questionSet}</p>
              </div>
              <span className={cn("text-[12px]", portalHeadingAlt)}>{rec.questionSetTitle}</span>
            </div>
          )}
          {/* Completed at */}
          {rec.completedAt && (
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Clock size={9} className="text-gray-400 shrink-0" />
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>{p.detail.completedAt}</p>
              </div>
              <span className={cn("text-[12px]", portalHeadingAlt)}>{formatRelativeTime(rec.completedAt, lang)}</span>
            </div>
          )}
          {/* Address */}
          {rec.address && (
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <MapPin size={9} className="text-gray-400 shrink-0" />
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>{p.detail.address}</p>
              </div>
              <span className={cn("text-[12px]", portalHeadingAlt)}>{rec.address}</span>
            </div>
          )}
          {/* LinkedIn */}
          {rec.linkedInUrl && (
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <FaLinkedinIn size={9} className="text-gray-400 shrink-0" />
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>LinkedIn</p>
              </div>
              <a href={rec.linkedInUrl} target="_blank" rel="noopener noreferrer"
                className="text-[12px] text-primary hover:underline truncate block">{rec.linkedInUrl}</a>
            </div>
          )}
          {/* GitHub */}
          {rec.githubUrl && (
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <FaGithub size={9} className="text-gray-400 shrink-0" />
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>GitHub</p>
              </div>
              <a href={rec.githubUrl} target="_blank" rel="noopener noreferrer"
                className="text-[12px] text-primary hover:underline truncate block">{rec.githubUrl}</a>
            </div>
          )}
          {/* Bio — full width */}
          {rec.bio && (
            <div className="col-span-2 sm:col-span-4">
              <div className="flex items-center gap-1 mb-0.5">
                <User size={9} className="text-gray-400 shrink-0" />
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>{p.detail.bio}</p>
              </div>
              <p className={cn("text-[12px] leading-relaxed", portalHeadingAlt)}>{rec.bio}</p>
            </div>
          )}
        </div>

        {/* Invitation response — only show when there's actual phone/message data */}
        {(rec.invitationSharedPhoneNumber || rec.invitationResponseMessage) && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5 mb-2">
              <Phone size={12} className="text-emerald-500 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {p.detail.candidateContactTitle}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              {rec.invitationSharedPhoneNumber && (
                <div>
                  <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-0.5", portalSubtextAlt)}>{p.detail.candidateContactPhone}</p>
                  <a href={`tel:${rec.invitationSharedPhoneNumber}`}
                    className={cn("text-[13px] hover:text-primary transition-colors", portalHeadingAlt)}>
                    {rec.invitationSharedPhoneNumber}
                  </a>
                </div>
              )}
              {rec.invitationResponseMessage && (
                <div className="col-span-2 sm:col-span-3">
                  <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-0.5", portalSubtextAlt)}>{p.detail.candidateContactMessage}</p>
                  <p className={cn("text-[13px] leading-relaxed whitespace-pre-line", portalHeadingAlt)}>
                    {rec.invitationResponseMessage}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* ⑤ CV section */}
      {rec.hasCv && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="hr-glass-card p-5 mb-5"
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                <FileText size={13} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <h3 className={cn("text-[14px] font-semibold", portalHeadingAlt)}>{p.detail.cvTitle}</h3>
                {cvFileName && (
                  <p className={cn("text-[12px] font-semibold truncate", portalHeadingAlt)}>{cvFileName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {cvPreview && (cvIsImage || cvIsPdf) && (
                <button type="button" onClick={() => setCvLightbox(true)}
                  className="flex items-center gap-1.5 h-7 px-3 text-[11px] font-semibold text-primary border border-primary/30 dark:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-lg transition-colors">
                  <Maximize2 size={11} /> {p.detail.cvView}
                </button>
              )}
              <button type="button" onClick={() => void handleDownloadCv()} disabled={cvBusy}
                className="flex items-center gap-1.5 h-7 px-3 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50">
                {cvBusy ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                {p.detail.cvDownload}
              </button>
            </div>
          </div>

          {/* CV Summary — collapsible */}
          {rec.cvSummary && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-2 mb-2">
              <button
                type="button"
                onClick={() => setCvSummaryOpen((v) => !v)}
                className="w-full flex items-center justify-between mb-1 hover:opacity-75 transition-opacity"
              >
                <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>{p.detail.cvSummary}</p>
                <ChevronDown size={12} className={cn("transition-transform duration-200 shrink-0", portalSubtextAlt, cvSummaryOpen ? "rotate-0" : "-rotate-90")} />
              </button>
              <AnimatePresence initial={false}>
                {cvSummaryOpen && (
                  <motion.div
                    key="cv-summary"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className={cn(
                      "text-[13px] leading-relaxed",
                      portalHeadingAlt,
                      !cvSummaryExpanded && "line-clamp-2"
                    )}>
                      {rec.cvSummary}
                    </p>
                    {!cvSummaryExpanded && rec.cvSummary.length > 100 && (
                      <button
                        type="button"
                        onClick={() => setCvSummaryExpanded(true)}
                        className="text-[11px] font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                      >
                        · Xem thêm
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* CV Skills — collapsible with truncation */}
          {rec.cvSkills.length > 0 && (
            <div className={cn("pt-2", rec.cvSummary ? "border-t border-gray-100 dark:border-gray-800" : "")}>
              <button
                type="button"
                onClick={() => setCvSkillsOpen((v) => !v)}
                className="w-full flex items-center justify-between mb-1 hover:opacity-75 transition-opacity"
              >
                <div className="flex items-center gap-1.5">
                  <p className={cn("text-[10px] font-bold uppercase tracking-wider", portalSubtextAlt)}>{p.detail.cvSkills}</p>
                  <span className={cn("text-[10px] font-semibold tabular-nums", portalSubtextAlt)}>({rec.cvSkills.length})</span>
                </div>
                <ChevronDown size={12} className={cn("transition-transform duration-200 shrink-0", portalSubtextAlt, cvSkillsOpen ? "rotate-0" : "-rotate-90")} />
              </button>
              <AnimatePresence initial={false}>
                {cvSkillsOpen && (
                  <motion.div
                    key="cv-skills"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(cvSkillsExpanded ? rec.cvSkills : rec.cvSkills.slice(0, SKILL_CHIP_LIMIT)).map((s) => {
                        const si = getSkillIcon(s);
                        const SIcon = si?.icon;
                        return (
                          <span key={s} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                            {SIcon && <SIcon size={9} className={cn("shrink-0", si.className)} />}
                            {titleCase(s)}
                          </span>
                        );
                      })}
                      {rec.cvSkills.length > SKILL_CHIP_LIMIT && !cvSkillsExpanded && (
                        <button
                          type="button"
                          onClick={() => setCvSkillsExpanded(true)}
                          className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          +{rec.cvSkills.length - SKILL_CHIP_LIMIT} kỹ năng khác
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* Modals */}
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
