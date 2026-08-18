"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users, RefreshCw, AlertCircle, Search,
  ChevronLeft, ChevronRight, Star, X as XIcon,
  Mail, CheckCircle2, Loader2, Send, SlidersHorizontal, Phone, RotateCcw,
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
  sendRecommendationOffer,
  restoreRecommendation,
  isCandidateAccepted,
  type CandidateRecommendation,
  type RecommendationStatus,
  type RecommendationSortBy,
  type RecommendationSortDir,
} from "@/features/hr/services/recommendation.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import { InviteScheduleFields, defaultInviteSchedule, toInvitePayload } from "./invite-schedule-fields";
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

function titleCase(s: string): string {
  if (!s) return s;
  return s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
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
  const { ring, text, bg } =
    score >= 85
      ? { ring: "ring-emerald-400 dark:ring-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" }
      : score >= 70
        ? { ring: "ring-amber-400 dark:ring-amber-500",   text: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/40" }
        : { ring: "ring-red-400 dark:ring-red-500",       text: "text-red-500 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-950/40" };
  return (
    <div className={cn("w-12 h-12 rounded-full ring-2 flex flex-col items-center justify-center shrink-0", ring, bg)}>
      <span className={cn("text-[15px] font-extrabold tabular-nums leading-none", text)}>{score}</span>
      <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 leading-none mt-0.5">pts</span>
    </div>
  );
}

function StatusBadge({ status, labels }: { status: RecommendationStatus; labels: Record<string, string> }) {
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

function buildDefaultInviteMessage(template: string, rec: CandidateRecommendation): string {
  return template
    .replace("{{name}}", rec.candidateName || "")
    .replace("{{title}}", rec.questionSetTitle || "")
    .replace("{{score}}", String(rec.score));
}

function InviteModal({ rec, onClose, onSent, labels }: InviteModalProps) {
  const [message, setMessage] = useState(() => buildDefaultInviteMessage(labels.defaultMessage, rec));
  const [schedule, setSchedule] = useState(defaultInviteSchedule);
  const [sending, setSending] = useState(false);
  const { addToast } = useToast();
  const { t } = useLanguage();
  const p = t.hrRecommendationsPage;

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

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      onClick={sending ? undefined : onClose}
    >
      {/* Backdrop — only covers content area visually but not sidebar stacking */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
        style={{ maxHeight: "min(680px, 90vh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient top accent */}
        <div className="h-0.5 bg-linear-to-r from-violet-500 via-primary to-cyan-400 shrink-0" />

        {/* Header */}
        <div className={cn("flex items-center justify-between px-5 py-4 border-b shrink-0", portalDivider)}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <Mail size={15} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className={cn("text-[14px] font-bold truncate", portalHeading)}>{labels.modalTitle}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {labels.to}: <span className="font-semibold text-gray-700 dark:text-gray-300">{rec.candidateName}</span>
                {" "}
                <span className="text-gray-400 dark:text-gray-500">({rec.candidateEmail})</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 disabled:opacity-50"
          >
            <XIcon size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <InviteScheduleFields value={schedule} onChange={setSchedule} labels={labels} />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={labels.messagePlaceholder}
            className="w-full text-[13px] leading-relaxed bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 transition-all"
            style={{ minHeight: "280px" }}
            autoFocus
          />
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-right">{message.length} / 2000</p>
        </div>

        {/* Footer */}
        <div className={cn("flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0 bg-gray-50/50 dark:bg-gray-900/50", portalDivider)}>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="h-9 px-4 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {labels.cancelBtn}
          </button>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !message.trim()}
            className="shimmer-button flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {sending ? labels.sending : labels.sendBtn}
          </button>
        </div>
      </motion.div>
    </div>,
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
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      onClick={sending ? undefined : onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
        style={{ maxHeight: "min(680px, 90vh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-0.5 bg-linear-to-r from-amber-500 via-primary to-cyan-400 shrink-0" />

        <div className={cn("flex items-center justify-between px-5 py-4 border-b shrink-0", portalDivider)}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
              <Mail size={15} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className={cn("text-[14px] font-bold truncate", portalHeading)}>{labels.modalTitle}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {labels.to}: <span className="font-semibold text-gray-700 dark:text-gray-300">{rec.candidateName}</span>
                {" "}
                <span className="text-gray-400 dark:text-gray-500">({rec.candidateEmail})</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 disabled:opacity-50"
          >
            <XIcon size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{labels.explanation}</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, OFFER_MAX_LEN))}
            placeholder={labels.messagePlaceholder}
            className="w-full text-[13px] leading-relaxed bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 transition-all"
            style={{ minHeight: "280px" }}
            autoFocus
          />
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-right">{message.length} / {OFFER_MAX_LEN}</p>
        </div>

        <div className={cn("flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0 bg-gray-50/50 dark:bg-gray-900/50", portalDivider)}>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="h-9 px-4 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {labels.cancelBtn}
          </button>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !message.trim()}
            className="shimmer-button flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {sending ? labels.sending : labels.sendBtn}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Contact Info Modal
// ---------------------------------------------------------------------------

interface ContactInfoModalProps {
  rec: CandidateRecommendation;
  labels: ReturnType<typeof useLanguage>["t"]["hrRecommendationsPage"];
  onClose: () => void;
}

function ContactInfoModal({ rec, labels, onClose }: ContactInfoModalProps) {
  const d = labels.detail;
  const c = labels.card;

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

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-0.5 bg-linear-to-r from-emerald-500 via-primary to-cyan-400 shrink-0" />

        <div className={cn("flex items-center justify-between px-5 py-4 border-b shrink-0", portalDivider)}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
              <Phone size={15} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className={cn("text-[14px] font-bold truncate", portalHeading)}>{d.candidateContactTitle}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{rec.candidateName}</span>
                {" "}
                <span className="text-gray-400 dark:text-gray-500">({rec.candidateEmail})</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            <XIcon size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <p className={cn("text-[12px] leading-relaxed", portalSubtextAlt)}>{d.candidateContactSubtitle}</p>

          {rec.invitationSharedPhoneNumber && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                {d.candidateContactPhone}
              </p>
              <a
                href={`tel:${rec.invitationSharedPhoneNumber}`}
                className={cn("text-[15px] font-medium hover:text-primary transition-colors", portalHeadingAlt)}
              >
                {rec.invitationSharedPhoneNumber}
              </a>
            </div>
          )}

          {rec.invitationResponseMessage && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
                {d.candidateContactMessage}
              </p>
              <p className={cn("text-[14px] leading-relaxed whitespace-pre-line", portalHeadingAlt)}>
                {rec.invitationResponseMessage}
              </p>
            </div>
          )}
        </div>

        <div className={cn("flex items-center justify-end px-5 py-4 border-t shrink-0 bg-gray-50/50 dark:bg-gray-900/50", portalDivider)}>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {c.contactPanelClose}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Candidate card row
// ---------------------------------------------------------------------------

interface RowProps {
  rec: CandidateRecommendation;
  lang: Lang;
  labels: ReturnType<typeof useLanguage>["t"]["hrRecommendationsPage"];
  index: number;
  selected: boolean;
  onToggleSelect: (rec: CandidateRecommendation) => void;
  onStatusChange: (id: string, status: RecommendationStatus) => void;
}

function CandidateRow({ rec, lang, labels, index, selected, onToggleSelect, onStatusChange }: RowProps) {
  const [busy, setBusy] = useState<"shortlist" | "dismiss" | "restore" | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const skillBtnRef = useRef<HTMLButtonElement>(null);
  const skillPopoverRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();
  const c = labels.card;
  const canAct = rec.status !== "INVITED" && rec.status !== "DISMISSED";
  // BE allows re-shortlisting a dismissed recommendation to bring it back into
  // play (confirmed live: dismiss → invite fails 409 "shortlist lại trước khi
  // mời"), so DISMISSED isn't fully terminal like INVITED is — keep the
  // shortlist action available instead of hiding every action.
  const canRestore = rec.status === "DISMISSED";
  const unread = rec.status === "NEW" && !rec.viewedAt;
  const initials = getInitials(rec.candidateName || rec.candidateEmail);
  const visibleSkills = rec.techStack.slice(0, 3);
  const extraSkills = rec.techStack.length - 3;
  const hasContact = !!(rec.invitationResponseMessage || rec.invitationSharedPhoneNumber);

  // Close skill popover when clicking outside (both the popover and the trigger button)
  useEffect(() => {
    if (!showAllSkills) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const inPopover = skillPopoverRef.current?.contains(target);
      const onBtn = skillBtnRef.current?.contains(target);
      if (!inPopover && !onBtn) setShowAllSkills(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAllSkills]);

  async function handleRestore() {
    setBusy("restore");
    try {
      await restoreRecommendation(rec.id);
      onStatusChange(rec.id, "NEW");
      addToast("success", labels.restoreSuccess);
    } catch { addToast("error", labels.restoreFailed); }
    finally { setBusy(null); }
  }

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

  // Score-based left accent colour
  const accentBar =
    rec.score >= 85 ? "bg-emerald-400"
    : rec.score >= 70 ? "bg-amber-400"
    : "bg-red-400";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className={cn(
          "group relative flex flex-col sm:flex-row sm:items-center gap-4 pl-5 pr-4 sm:pr-5 py-4",
          "border-b border-gray-100 dark:border-gray-800 last:border-b-0",
          "hover:bg-gray-50/70 dark:hover:bg-gray-800/30 transition-colors duration-150",
          rec.status === "DISMISSED" && "opacity-50"
        )}
      >
        {/* Left accent bar */}
        <div className={cn("absolute left-0 top-3 bottom-3 w-0.75 rounded-full opacity-0 group-hover:opacity-100 transition-opacity", accentBar)} />

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(rec)}
            className="rounded border-gray-300"
            aria-label={labels.compareBar}
          />
          {unread && (
            <span title={c.unread} className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
          )}
        </div>
        {/* Avatar */}
        <div className={cn(
          "w-11 h-11 rounded-xl text-white text-[13px] font-bold flex items-center justify-center shrink-0 shadow-sm",
          avatarColor(rec.candidateName || rec.id)
        )}>
          {initials || "?"}
        </div>

        {/* Identity block */}
        <div className="min-w-0 flex-1">
          {/* Row 1: name + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("text-sm font-bold leading-tight", portalHeadingAlt)}>
              {rec.candidateName || "—"}
            </p>
            <StatusBadge status={rec.status} labels={c} />
            {isCandidateAccepted(rec) && (
              <span
                title={c.acceptedHint}
                className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 whitespace-nowrap"
              >
                {c.accepted}
              </span>
            )}
            {typeof rec.fitPercent === "number" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400">
                {c.fitPercent} {rec.fitPercent}%
              </span>
            )}
            {hasContact && (
              <button
                type="button"
                title={c.contactShared}
                aria-label={c.contactShared}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowContact(true);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 whitespace-nowrap cursor-pointer hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 transition-opacity"
              >
                <Phone size={9} />
                {c.contactBadge}
              </button>
            )}
          </div>

          {/* Row 2: email · role */}
          <p className={cn("text-[11px] truncate mt-0.5", portalSubtextAlt)}>
            {rec.candidateEmail}
            {rec.targetRole && (
              <span className="text-primary font-semibold"> · {rec.targetRole}</span>
            )}
          </p>

          {/* Row 3: question set title · time */}
          <p className={cn("text-[11px] truncate mt-0.5", portalSubtextAlt)}>
            <span className="font-medium text-gray-600 dark:text-gray-300">{rec.questionSetTitle || "—"}</span>
            {rec.completedAt && (
              <span className="text-gray-400 dark:text-gray-500"> · {formatRelativeTime(rec.completedAt, lang)}</span>
            )}
          </p>

          {/* Row 4: skill tags */}
          {rec.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 items-center">
              {visibleSkills.map((s) => {
                const si = getSkillIcon(s);
                const SIcon = si?.icon;
                return (
                  <span key={s} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                    {SIcon && <SIcon size={9} className={cn("shrink-0", si.className)} />}
                    {titleCase(s)}
                  </span>
                );
              })}
              {extraSkills > 0 && (
                <>
                  <button
                    ref={skillBtnRef}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!showAllSkills && skillBtnRef.current) {
                        const r = skillBtnRef.current.getBoundingClientRect();
                        setPopoverPos({ top: r.bottom + 6, left: r.left });
                      }
                      setShowAllSkills((v) => !v);
                    }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                  >
                    +{extraSkills}
                  </button>
                  {showAllSkills && popoverPos && typeof document !== "undefined" && createPortal(
                    <div
                      ref={skillPopoverRef}
                      style={{ position: "fixed", top: popoverPos.top, left: popoverPos.left, zIndex: 9999 }}
                      className="w-72 max-h-56 overflow-y-auto p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                        Tất cả kỹ năng ({rec.techStack.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.techStack.map((s) => {
                          const si = getSkillIcon(s);
                          const SIcon = si?.icon;
                          return (
                            <span key={s} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                              {SIcon && <SIcon size={10} className={cn("shrink-0", si.className)} />}
                              {titleCase(s)}
                            </span>
                          );
                        })}
                      </div>
                    </div>,
                    document.body
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: score + action strip */}
        <div className="flex items-center gap-3 shrink-0 pl-2 sm:pl-0">
          {/* Score badge */}
          <ScoreBadge score={rec.score} />

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 shrink-0" />

          {/* Action buttons */}
          <div className="flex items-center gap-0.5">
            {canAct ? (
              <>
                {rec.status !== "SHORTLISTED" ? (
                  <button type="button" onClick={() => void handleShortlist()} disabled={busy !== null}
                    title={c.shortlistBtn}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors disabled:opacity-40">
                    {busy === "shortlist" ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
                  </button>
                ) : (
                  <span title={c.shortlisted} className="h-8 w-8 flex items-center justify-center text-violet-500">
                    <CheckCircle2 size={14} />
                  </span>
                )}
                <button type="button" onClick={() => setShowInvite(true)} disabled={busy !== null}
                  title={c.inviteBtn}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-40">
                  <Mail size={14} />
                </button>
                <button type="button" onClick={() => void handleDismiss()} disabled={busy !== null}
                  title={c.dismissBtn}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40">
                  {busy === "dismiss" ? <Loader2 size={14} className="animate-spin" /> : <XIcon size={14} />}
                </button>
              </>
            ) : canRestore ? (
              <button type="button" onClick={() => void handleRestore()} disabled={busy !== null}
                title={c.restoreBtn}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors disabled:opacity-40">
                {busy === "restore" ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowOffer(true)}
              disabled={busy !== null || ["SENT", "ACCEPTED"].includes((rec.latestOfferStatus ?? "").toUpperCase())}
              title={
                ["SENT", "ACCEPTED"].includes((rec.latestOfferStatus ?? "").toUpperCase())
                  ? (rec.latestOfferStatus?.toUpperCase() === "ACCEPTED" ? labels.offer.alreadyAccepted : labels.offer.alreadySent)
                  : labels.offer.btnLabel
              }
              className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors disabled:opacity-40">
              <Send size={14} />
            </button>
          </div>

          {/* Detail CTA */}
          <Link
            href={`/hr/candidate-recommendations/${rec.id}`}
            className="h-8 px-3 flex items-center gap-1 text-[12px] font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all duration-150 shrink-0 whitespace-nowrap"
          >
            {c.viewDetailBtn}
            <span className="text-[10px] opacity-70">→</span>
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
      {showOffer && (
        <OfferModal
          rec={rec}
          labels={labels.offer}
          onClose={() => setShowOffer(false)}
          onSent={() => undefined}
        />
      )}
      {showContact && hasContact && (
        <ContactInfoModal
          rec={rec}
          labels={labels}
          onClose={() => setShowContact(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main List
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

// Backend accepts: NEW, SHORTLISTED, DISMISSED, INVITED — VIEWED is not a valid filter value
const STATUS_TABS: Array<{ key: string; value: string }> = [
  { key: "allStatuses",       value: "" },
  { key: "statusNew",         value: "NEW" },
  { key: "statusUnviewed",    value: "UNVIEWED" },
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

type SortOption = { key: string; sortBy: RecommendationSortBy; sortDir: RecommendationSortDir };

const SORT_OPTIONS: SortOption[] = [
  { key: "sortScoreDesc", sortBy: "score", sortDir: "desc" },
  { key: "sortScoreAsc", sortBy: "score", sortDir: "asc" },
  { key: "sortDateDesc", sortBy: "date", sortDir: "desc" },
  { key: "sortDateAsc", sortBy: "date", sortDir: "asc" },
];

export function RecommendationsList() {
  const { t, lang } = useLanguage();
  const p = t.hrRecommendationsPage;
  const searchParams = useSearchParams();

  const [items, setItems] = useState<CandidateRecommendation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");
  const [minScore, setMinScore] = useState<number | undefined>(undefined);
  const [sortKey, setSortKey] = useState("sortScoreDesc");
  const [searchSet, setSearchSet] = useState("");
  const [selected, setSelected] = useState<CandidateRecommendation[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    if (searchParams.get("unviewed") === "true") setStatusFilter("UNVIEWED");
    const st = searchParams.get("status");
    if (st) setStatusFilter(st);
  }, [searchParams]);

  const sortOption = SORT_OPTIONS.find((o) => o.key === sortKey) ?? SORT_OPTIONS[0];
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await listRecommendations({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter && statusFilter !== "UNVIEWED" ? statusFilter : undefined,
        unviewed: statusFilter === "UNVIEWED" || undefined,
        minScore,
        sortBy: sortOption.sortBy,
        sortDir: sortOption.sortDir,
      });
      setItems(res.items);
      setTotalCount(res.totalCount);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [page, statusFilter, minScore, sortOption.sortBy, sortOption.sortDir]);

  useEffect(() => { void fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [statusFilter, minScore, sortKey]);

  function handleStatusChange(id: string, status: RecommendationStatus) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  function handleToggleSelect(rec: CandidateRecommendation) {
    setSelected((prev) => {
      const exists = prev.some((x) => x.id === rec.id);
      if (exists) return prev.filter((x) => x.id !== rec.id);
      if (prev.length >= 3) {
        addToast("error", p.compareMax);
        return prev;
      }
      if (prev.length > 0 && prev[0].questionSetId !== rec.questionSetId) {
        addToast("error", p.compareNeedSameSet);
        return prev;
      }
      return [...prev, rec];
    });
  }

  // Search title vẫn client-side (BE SCRUM-328 chưa hỗ trợ search title).
  const displayed = items.filter((r) =>
    searchSet.trim()
      ? r.questionSetTitle.toLowerCase().includes(searchSet.toLowerCase())
      : true
  );

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className={cn("text-2xl font-bold", portalHeading)}>{p.heading}</h2>
          <p className={cn("text-sm mt-1", portalSubtext)}>{p.subtext}</p>
        </div>
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

        {/* Score filter — server-side MinScore (SCRUM-328) */}
        <select
          value={minScore ?? ""}
          onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : undefined)}
          className="h-8 px-3 text-[12px] font-medium bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20 transition-colors cursor-pointer">
          {SCORE_FILTERS.map((f) => (
            <option key={f.key} value={f.min ?? ""}>{p.filters[f.key as keyof typeof p.filters]}</option>
          ))}
        </select>

        {/* Sort — server-side SortBy/SortDir (SCRUM-328) */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="h-8 px-3 text-[12px] font-medium bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-primary/20 transition-colors cursor-pointer">
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{p.filters[o.key as keyof typeof p.filters]}</option>
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

      {/* List */}
      {loading ? (
        <div className="hr-glass-card overflow-hidden">
          <div className="flex flex-col">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3.5 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="h-2.5 w-56 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                  <div className="h-2.5 w-32 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                </div>
                <div className="h-8 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
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
          {displayed.map((rec, i) => (
            <CandidateRow
              key={rec.id}
              rec={rec}
              lang={lang}
              labels={p}
              index={i}
              selected={selected.some((x) => x.id === rec.id)}
              onToggleSelect={handleToggleSelect}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {selected.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 hr-glass-card px-4 py-3 flex items-center gap-3 shadow-lg">
          <span className="text-[13px] font-medium">{selected.length} / 3</span>
          <Link
            href={`/hr/candidate-recommendations/compare?ids=${selected.map((x) => x.id).join(",")}`}
            className="h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-lg"
          >
            {p.compareBar}
          </Link>
          <button type="button" onClick={() => setSelected([])} className="text-[12px] text-gray-500">
            {p.invite.cancelBtn}
          </button>
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
