"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Mail, AlertCircle, RefreshCw, Check, X, Loader2,
  Clock, CheckCircle2, XCircle, MessageSquare,
  Eye, ExternalLink, Send, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  listInvitations,
  acceptInvitation,
  rejectInvitation,
  type CandidateInvitation,
  type InvitationStatus,
} from "@/features/candidate/services/invitation.service";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { getCompanyInitials, getCompanyColor } from "@/features/candidate/utils/company-visual";
import {
  portalHeading,
  portalHeadingAlt,
  portalSubtext,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

const PAGE_SIZE = 6;

// ── Shared badge ──────────────────────────────────────────────────────────────

interface StatusLabels {
  statusPending: string;
  statusAccepted: string;
  statusRejected: string;
}

function StatusBadge({ status, labels }: { status: InvitationStatus; labels: StatusLabels }) {
  const config: Record<InvitationStatus, { cls: string; icon: React.ReactNode }> = {
    PENDING: {
      cls: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40",
      icon: <Clock size={10} />,
    },
    ACCEPTED: {
      cls: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40",
      icon: <CheckCircle2 size={10} />,
    },
    REJECTED: {
      cls: "bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700",
      icon: <XCircle size={10} />,
    },
  };
  const text: Record<InvitationStatus, string> = {
    PENDING: labels.statusPending,
    ACCEPTED: labels.statusAccepted,
    REJECTED: labels.statusRejected,
  };
  const { cls, icon } = config[status];
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0",
      cls
    )}>
      {icon}
      {text[status]}
    </span>
  );
}

// ── Company logo / initials ───────────────────────────────────────────────────

function CompanyAvatar({
  logoUrl, name, size = "sm",
}: {
  logoUrl?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "w-12 h-12" : "w-9 h-9";
  const text = size === "md" ? "text-sm" : "text-[11px]";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        className={cn(dim, "rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-700")}
      />
    );
  }
  return (
    <div className={cn(dim, "rounded-xl text-white font-bold flex items-center justify-center shrink-0", text, getCompanyColor(name))}>
      {getCompanyInitials(name)}
    </div>
  );
}

// ── AcceptModal ───────────────────────────────────────────────────────────────

const PHONE_RE = /^0\d{9}$/;

interface AcceptModalProps {
  invitation: CandidateInvitation;
  onClose: () => void;
  onAccept: (payload: { responseMessage?: string; phoneNumber?: string }) => Promise<void>;
}

function AcceptModal({ invitation, onClose, onAccept }: AcceptModalProps) {
  const { t } = useLanguage();
  const p = t.jobseekerInvitationsPage;
  const m = p.acceptModal;
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const phoneInvalid = phoneTouched && phone.trim() !== "" && !PHONE_RE.test(phone.trim());

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleConfirm() {
    if (phone.trim() && !PHONE_RE.test(phone.trim())) {
      setPhoneTouched(true);
      return;
    }
    setAccepting(true);
    try {
      await onAccept({ responseMessage: message.trim() || undefined, phoneNumber: phone.trim() || undefined });
    } finally {
      setAccepting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
      onClick={accepting ? undefined : onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-0.5 bg-linear-to-r from-violet-500 via-primary to-cyan-400" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Check size={14} className="text-primary" />
            </div>
            <p className="text-[15px] font-bold text-gray-900 dark:text-gray-100">{m.title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={accepting}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3.5">
          <p className={cn("text-[12px] leading-relaxed", portalSubtextAlt)}>{m.subtitle}</p>
          {/* Company chip */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <CompanyAvatar logoUrl={invitation.companyLogoUrl} name={invitation.companyName} size="sm" />
            <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">{invitation.companyName}</span>
            {invitation.questionSetTitle && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="text-[12px] text-gray-500 dark:text-gray-400 truncate">{invitation.questionSetTitle}</span>
              </>
            )}
          </div>
          <div className="space-y-1.5">
            <label className={cn("text-[12px] font-semibold", portalHeadingAlt)}>{m.messageLabel}</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder={m.messagePlaceholder} rows={3} maxLength={2000}
              className="w-full text-[13px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className={cn("text-[12px] font-semibold", portalHeadingAlt)}>{m.phoneLabel}</label>
            <input type="tel" inputMode="numeric" value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onBlur={() => setPhoneTouched(true)} maxLength={10} placeholder={m.phonePlaceholder}
              className={cn(
                "w-full text-[13px] bg-gray-50 dark:bg-gray-800 border rounded-xl px-3 py-2.5 outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 transition-all",
                phoneInvalid
                  ? "border-red-400 dark:border-red-600 focus:ring-red-200 dark:focus:ring-red-900"
                  : "border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/10"
              )} />
            {phoneInvalid && <p className="text-[11px] text-red-500 font-medium">{m.phoneInvalid}</p>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <button type="button" onClick={onClose} disabled={accepting}
            className="h-9 px-4 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50">
            {m.cancelBtn}
          </button>
          <button type="button" onClick={() => void handleConfirm()} disabled={accepting}
            className="shimmer-button flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60">
            {accepting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {accepting ? m.accepting : m.confirmBtn}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

// ── Detail dialog ─────────────────────────────────────────────────────────────

interface DetailDialogProps {
  invitation: CandidateInvitation;
  onClose: () => void;
  onStatusChange: (id: string, status: InvitationStatus) => void;
}

function InvitationDetailDialog({ invitation, onClose, onStatusChange }: DetailDialogProps) {
  const { t, lang } = useLanguage();
  const p = t.jobseekerInvitationsPage;
  const { addToast } = useToast();
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);

  const canAct = invitation.status === "PENDING";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !showRejectConfirm && !showAcceptModal) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, showRejectConfirm, showAcceptModal]);

  async function handleAccept(payload: { responseMessage?: string; phoneNumber?: string }) {
    setBusy("accept");
    try {
      await acceptInvitation(invitation.id, payload);
      onStatusChange(invitation.id, "ACCEPTED");
      addToast("success", p.acceptSuccess);
      setShowAcceptModal(false);
      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      addToast("error", status === 409 ? p.alreadyResponded : p.acceptFailed);
    } finally {
      setBusy(null);
    }
  }

  async function handleReject() {
    setBusy("reject");
    try {
      await rejectInvitation(invitation.id);
      onStatusChange(invitation.id, "REJECTED");
      addToast("success", p.rejectSuccess);
      setShowRejectConfirm(false);
      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      addToast("error", status === 409 ? p.alreadyResponded : p.rejectFailed);
    } finally {
      setBusy(null);
      setShowRejectConfirm(false);
    }
  }

  // Header gradient tinted by status
  const headerBg =
    invitation.status === "PENDING"
      ? "bg-linear-to-br from-amber-50 via-white to-white dark:from-amber-950/25 dark:via-gray-900 dark:to-gray-900"
      : invitation.status === "ACCEPTED"
        ? "bg-linear-to-br from-emerald-50 via-white to-white dark:from-emerald-950/25 dark:via-gray-900 dark:to-gray-900"
        : "bg-linear-to-br from-gray-50 via-white to-white dark:from-gray-800/50 dark:via-gray-900 dark:to-gray-900";

  return createPortal(
    <>
      {/* Overlay + dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={() => { if (!showRejectConfirm && !showAcceptModal) onClose(); }}
      >
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Gradient header ── */}
          <div className={cn("relative px-6 pt-6 pb-5", headerBg)}>
            {/* X close */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>

            {/* Company identity */}
            <div className="flex items-start gap-4 pr-8">
              {/* Logo */}
              <div className="shrink-0 w-14 h-14 rounded-2xl overflow-hidden shadow-md ring-2 ring-white dark:ring-gray-800">
                {invitation.companyLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={invitation.companyLogoUrl}
                    alt={invitation.companyName}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={cn(
                    "w-full h-full flex items-center justify-center text-white font-bold text-[15px]",
                    getCompanyColor(invitation.companyName)
                  )}>
                    {getCompanyInitials(invitation.companyName)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <p className={cn("text-[17px] font-bold leading-tight mb-1.5", portalHeading)}>
                  {invitation.companyName || "—"}
                </p>
                {invitation.questionSetId ? (
                  <Link
                    href={`/candidate/sets/${invitation.questionSetId}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline truncate w-fit mb-2"
                  >
                    {invitation.questionSetTitle || "—"}
                    <ExternalLink size={9} className="shrink-0" />
                  </Link>
                ) : (
                  <p className={cn("text-[12px] font-medium truncate mb-2", portalSubtext)}>
                    {invitation.questionSetTitle || "—"}
                  </p>
                )}
                <StatusBadge status={invitation.status} labels={p} />
              </div>
            </div>

            {/* Timestamp pills row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-black/6 dark:border-white/6">
              <span className="flex items-center gap-1.5">
                <Clock size={11} className="text-gray-400 shrink-0" />
                <span className={cn("text-[11px]", portalSubtextAlt)}>{p.detailDialog.sentAt}:</span>
                <span className={cn("text-[11px] font-semibold", portalHeadingAlt)}>
                  {invitation.createdAt ? formatRelativeTime(invitation.createdAt, lang) : "—"}
                </span>
              </span>
              {invitation.respondedAt && (
                <>
                  <span className="text-gray-300 dark:text-gray-700 select-none">·</span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                    <span className={cn("text-[11px]", portalSubtextAlt)}>{p.detailDialog.respondedAt}:</span>
                    <span className={cn("text-[11px] font-semibold", portalHeadingAlt)}>
                      {formatRelativeTime(invitation.respondedAt, lang)}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          {(invitation.scheduledAtUtc || invitation.meetingLink || invitation.location) && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2", portalSubtextAlt)}>
                {p.detailDialog.schedule}
              </p>
              {invitation.scheduledAtUtc && (
                <p className={cn("text-[13px]", portalHeadingAlt)}>
                  {new Date(invitation.scheduledAtUtc).toLocaleString()}
                  {invitation.timeZoneId ? ` (${invitation.timeZoneId})` : ""}
                </p>
              )}
              {invitation.meetingLink && (
                <a href={invitation.meetingLink} target="_blank" rel="noopener noreferrer" className="text-[13px] text-primary font-semibold">
                  {p.detailDialog.meetingLink}
                </a>
              )}
              {invitation.location && (
                <p className={cn("text-[13px] mt-1", portalHeadingAlt)}>
                  {p.detailDialog.location}: {invitation.location}
                </p>
              )}
            </div>
          )}

          {/* ── Message section ── */}
          <div className="px-6 py-5">
            <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-3", portalSubtextAlt)}>
              {p.detailDialog.message}
            </p>
            <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
              <p className={cn(
                "text-[13px] leading-7 whitespace-pre-wrap",
                invitation.message
                  ? "text-gray-700 dark:text-gray-200"
                  : "text-gray-400 dark:text-gray-600 italic"
              )}>
                {invitation.message || p.noMessage}
              </p>
            </div>
          </div>

          {/* ── Footer — only for PENDING ── */}
          {canAct && (
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <button
                type="button"
                onClick={() => setShowRejectConfirm(true)}
                disabled={busy !== null}
                className="flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all disabled:opacity-50"
              >
                {busy === "reject" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                {p.rejectBtn}
              </button>
              <button
                type="button"
                onClick={() => setShowAcceptModal(true)}
                disabled={busy !== null}
                className="shimmer-button flex items-center gap-1.5 h-9 px-5 text-[13px] font-semibold text-white hr-cta-btn rounded-xl disabled:opacity-60"
              >
                <Check size={13} />
                {p.acceptBtn}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Nested dialogs at a higher z */}
      <ConfirmDialog
        open={showRejectConfirm}
        title={p.rejectConfirm.title}
        message={p.rejectConfirm.message}
        confirmLabel={p.rejectConfirm.confirmLabel}
        cancelLabel={p.rejectConfirm.cancelLabel}
        variant="danger"
        loading={busy === "reject"}
        onConfirm={() => void handleReject()}
        onCancel={() => setShowRejectConfirm(false)}
      />
      {showAcceptModal && (
        <AcceptModal
          invitation={invitation}
          onClose={() => setShowAcceptModal(false)}
          onAccept={handleAccept}
        />
      )}
    </>,
    document.body
  );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

const STATUS_TABS: Array<{
  key: "filterAll" | "statusPending" | "statusAccepted" | "statusRejected";
  value: InvitationStatus | "";
  activeColor: string;
}> = [
  { key: "filterAll",      value: "",         activeColor: "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" },
  { key: "statusPending",  value: "PENDING",  activeColor: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 shadow-sm" },
  { key: "statusAccepted", value: "ACCEPTED", activeColor: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 shadow-sm" },
  { key: "statusRejected", value: "REJECTED", activeColor: "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-sm" },
];

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[2.5fr_1fr_1fr_140px] gap-4 px-6 py-4 items-center animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="h-2.5 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
          <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-7 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InvitationsList() {
  const { t, lang } = useLanguage();
  const p = t.jobseekerInvitationsPage;

  const [invitations, setInvitations] = useState<CandidateInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | "">("");
  const [page, setPage] = useState(1);
  const [detailTarget, setDetailTarget] = useState<CandidateInvitation | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listInvitations()
      .then((items) => { if (!cancelled) setInvitations(items); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  function handleStatusChange(id: string, status: InvitationStatus) {
    setInvitations((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  function handleFilterChange(v: InvitationStatus | "") {
    setStatusFilter(v);
    setPage(1);
  }

  const counts: Record<string, number> = {
    "":       invitations.length,
    PENDING:  invitations.filter((i) => i.status === "PENDING").length,
    ACCEPTED: invitations.filter((i) => i.status === "ACCEPTED").length,
    REJECTED: invitations.filter((i) => i.status === "REJECTED").length,
  };

  const filtered  = statusFilter ? invitations.filter((i) => i.status === statusFilter) : invitations;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      {/* Filter tabs */}
      {!loading && !error && invitations.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl mb-5 w-fit">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            const count = counts[tab.value];
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleFilterChange(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all",
                  active
                    ? tab.activeColor
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                {p[tab.key]}
                {count > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0 rounded-full min-w-4.5 text-center",
                    active
                      ? "bg-current/10 text-current"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="hr-glass-card overflow-hidden"
      >
        {/* Table header */}
        {(!loading || invitations.length > 0) && (
          <div className="grid grid-cols-[2.5fr_1fr_1fr_140px] gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
            {[p.table.company, p.table.status, p.table.sentAt, p.table.actions].map((col) => (
              <span key={col} className={cn("text-[11px] font-bold uppercase tracking-wide", portalSubtextAlt)}>
                {col}
              </span>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={loading ? "loading" : `f${statusFilter}-p${safePage}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {loading ? (
              <SkeletonRows />
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <AlertCircle size={28} className="text-red-500" />
                <p className={cn("text-[14px]", portalSubtextAlt)}>{p.loadFailed}</p>
                <button type="button" onClick={() => setReloadKey((k) => k + 1)}
                  className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline">
                  <RefreshCw size={13} />{p.retryBtn}
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Mail}
                title={invitations.length === 0 ? p.emptyState : p.noMatchingInvitations}
                className="py-12"
              />
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginated.map((inv) => (
                  <motion.li
                    key={inv.id}
                    whileHover={{ scale: 1.002 }}
                    className={cn(
                      "hr-table-row grid grid-cols-[2.5fr_1fr_1fr_140px] gap-4 px-6 py-4 items-center",
                      inv.status === "REJECTED" && "opacity-55"
                    )}
                  >
                    {/* Company + question set */}
                    <div className="flex items-center gap-3 min-w-0">
                      <CompanyAvatar logoUrl={inv.companyLogoUrl} name={inv.companyName} size="sm" />
                      <div className="min-w-0">
                        <p className={cn("text-[13px] font-semibold truncate", portalHeadingAlt)}>
                          {inv.companyName || "—"}
                        </p>
                        <p className={cn("text-[11px] truncate", portalSubtextAlt)}>
                          {inv.questionSetTitle || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <StatusBadge status={inv.status} labels={p} />

                    {/* Sent at */}
                    <p className={cn("text-[12px] flex items-center gap-1", portalSubtextAlt)}>
                      <Clock size={11} className="shrink-0" />
                      {inv.createdAt ? formatRelativeTime(inv.createdAt, lang) : "—"}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDetailTarget(inv)}
                        className={cn(
                          "flex items-center gap-1.5 h-7.5 px-3 text-[11px] font-semibold rounded-lg transition-colors",
                          "hover:text-primary hover:bg-[#F5F3FF] dark:hover:bg-purple-950/30",
                          portalSubtextAlt
                        )}
                      >
                        <Eye size={13} />
                        {p.viewDetailBtn}
                      </button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Pagination footer */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className={cn("text-xs tabular-nums", portalSubtextAlt)}>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={safePage === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                const nearCurrent = Math.abs(pg - safePage) <= 1;
                const isFirst = pg === 1;
                const isLast = pg === totalPages;
                if (!isFirst && !isLast && !nearCurrent) {
                  if (pg === 2 || pg === totalPages - 1) {
                    return <span key={pg} className={cn("text-xs px-0.5", portalSubtextAlt)}>…</span>;
                  }
                  return null;
                }
                return (
                  <button key={pg} type="button" onClick={() => setPage(pg)}
                    className={cn(
                      "inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                      pg === safePage
                        ? "bg-primary text-white shadow-sm"
                        : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}>
                    {pg}
                  </button>
                );
              })}
              <button type="button" onClick={() => setPage((v) => Math.min(totalPages, v + 1))} disabled={safePage === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Mobile card list */}
      <div className="md:hidden mt-4 flex flex-col gap-3">
        {!loading && !error && paginated.map((inv) => (
          <div
            key={inv.id}
            className={cn("hr-glass-card p-4 flex flex-col gap-3", inv.status === "REJECTED" && "opacity-55")}
          >
            <div className="flex items-start gap-3">
              <CompanyAvatar logoUrl={inv.companyLogoUrl} name={inv.companyName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{inv.companyName || "—"}</p>
                  <StatusBadge status={inv.status} labels={p} />
                </div>
                <p className={cn("text-[11px] truncate mt-0.5", portalSubtextAlt)}>{inv.questionSetTitle || "—"}</p>
                {inv.createdAt && (
                  <p className={cn("text-[11px] mt-1 flex items-center gap-1", portalSubtextAlt)}>
                    <Clock size={10} />
                    {formatRelativeTime(inv.createdAt, lang)}
                  </p>
                )}
              </div>
            </div>
            <button type="button" onClick={() => setDetailTarget(inv)}
              className="flex items-center justify-center gap-1.5 h-8.5 text-[12px] font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
              <Eye size={13} />
              {p.viewDetailBtn}
            </button>
          </div>
        ))}
      </div>

      {/* Detail dialog */}
      <AnimatePresence>
        {detailTarget && (
          <InvitationDetailDialog
            invitation={detailTarget}
            onClose={() => setDetailTarget(null)}
            onStatusChange={handleStatusChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
