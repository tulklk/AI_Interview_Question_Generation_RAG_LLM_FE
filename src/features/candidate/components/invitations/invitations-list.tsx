"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Mail, AlertCircle, RefreshCw, Check, X, Loader2,
  ChevronRight, Send, Clock, CheckCircle2, XCircle, MessageSquare,
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
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

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
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0", cls)}>
      {icon}
      {text[status]}
    </span>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={accepting ? undefined : onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient top accent */}
        <div className="h-0.5 bg-linear-to-r from-violet-500 via-primary to-cyan-400" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Check size={14} className="text-primary" />
            </div>
            <p className="text-[15px] font-bold text-gray-900 dark:text-gray-100">{m.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={accepting}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3.5">
          <p className={cn("text-[12px] leading-relaxed", portalSubtextAlt)}>{m.subtitle}</p>
          {/* Company chip */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            {invitation.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={invitation.companyLogoUrl} alt={invitation.companyName} className="w-5 h-5 rounded object-cover" />
            ) : (
              <div className={cn("w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold", getCompanyColor(invitation.companyName))}>
                {getCompanyInitials(invitation.companyName)}
              </div>
            )}
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
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={m.messagePlaceholder}
              rows={3}
              maxLength={2000}
              className="w-full text-[13px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className={cn("text-[12px] font-semibold", portalHeadingAlt)}>{m.phoneLabel}</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onBlur={() => setPhoneTouched(true)}
              maxLength={10}
              placeholder={m.phonePlaceholder}
              className={cn(
                "w-full text-[13px] bg-gray-50 dark:bg-gray-800 border rounded-xl px-3 py-2.5 outline-none focus:ring-2 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 transition-all",
                phoneInvalid
                  ? "border-red-400 dark:border-red-600 focus:ring-red-200 dark:focus:ring-red-900"
                  : "border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary/10"
              )}
            />
            {phoneInvalid && <p className="text-[11px] text-red-500 font-medium">{m.phoneInvalid}</p>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={accepting}
            className="h-9 px-4 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {m.cancelBtn}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={accepting}
            className="shimmer-button flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60"
          >
            {accepting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {accepting ? m.accepting : m.confirmBtn}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

function InvitationCard({
  invitation,
  index,
  onStatusChange,
}: {
  invitation: CandidateInvitation;
  index: number;
  onStatusChange: (id: string, status: InvitationStatus) => void;
}) {
  const { t, lang } = useLanguage();
  const p = t.jobseekerInvitationsPage;
  const { addToast } = useToast();
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);

  const canAct = invitation.status === "PENDING";
  const isPending = invitation.status === "PENDING";

  async function handleAccept(payload: { responseMessage?: string; phoneNumber?: string }) {
    setBusy("accept");
    try {
      await acceptInvitation(invitation.id, payload);
      onStatusChange(invitation.id, "ACCEPTED");
      addToast("success", p.acceptSuccess);
      setShowAcceptModal(false);
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
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      addToast("error", status === 409 ? p.alreadyResponded : p.rejectFailed);
    } finally {
      setBusy(null);
      setShowRejectConfirm(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
        className={cn(
          "hr-glass-card overflow-hidden transition-opacity",
          invitation.status === "REJECTED" && "opacity-55"
        )}
      >
        {/* Pending accent stripe */}
        {isPending && (
          <div className="h-0.5 bg-linear-to-r from-amber-400 via-amber-300 to-transparent" />
        )}

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start gap-3.5">
            {/* Company logo */}
            <div className="shrink-0 mt-0.5">
              {invitation.companyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={invitation.companyLogoUrl}
                  alt={invitation.companyName}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  className="w-12 h-12 rounded-xl object-cover border border-gray-100 dark:border-gray-700 shadow-sm"
                />
              ) : (
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm", getCompanyColor(invitation.companyName))}>
                  {getCompanyInitials(invitation.companyName)}
                </div>
              )}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={cn("text-[14px] font-bold leading-tight", portalHeadingAlt)}>
                  {invitation.companyName || "—"}
                </p>
                <StatusBadge status={invitation.status} labels={p} />
              </div>

              {/* Role / question set */}
              {invitation.questionSetId ? (
                <Link
                  href={`/jobseeker/sets/${invitation.questionSetId}`}
                  className="text-[12px] font-semibold text-primary hover:underline truncate mt-0.5 flex items-center gap-1 w-fit"
                >
                  {invitation.questionSetTitle || "—"}
                  <ChevronRight size={11} className="shrink-0" />
                </Link>
              ) : (
                <p className={cn("text-[12px] font-medium truncate mt-0.5", portalSubtextAlt)}>
                  {invitation.questionSetTitle || "—"}
                </p>
              )}

              {/* Timestamp */}
              {invitation.createdAt && (
                <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1 flex items-center gap-1">
                  <Clock size={10} />
                  {formatRelativeTime(invitation.createdAt, lang)}
                </p>
              )}
            </div>
          </div>

          {/* Message callout */}
          {invitation.message && (
            <div className="mt-3.5 flex gap-2.5 px-3.5 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60">
              <MessageSquare size={13} className="text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
              <p className={cn("text-[12px] leading-relaxed", portalSubtextAlt)}>
                {invitation.message}
              </p>
            </div>
          )}

          {/* Action row */}
          {canAct && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectConfirm(true)}
                disabled={busy !== null}
                className="flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all disabled:opacity-50"
              >
                {busy === "reject" ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                {p.rejectBtn}
              </button>
              <button
                type="button"
                onClick={() => setShowAcceptModal(true)}
                disabled={busy !== null}
                className="shimmer-button flex items-center gap-1.5 h-8 px-4 text-[12px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60"
              >
                <Check size={12} />
                {p.acceptBtn}
              </button>
            </div>
          )}
        </div>
      </motion.div>

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
    </>
  );
}

const STATUS_TABS: Array<{
  key: "filterAll" | "statusPending" | "statusAccepted" | "statusRejected";
  value: InvitationStatus | "";
  activeColor: string;
}> = [
  { key: "filterAll", value: "", activeColor: "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" },
  { key: "statusPending", value: "PENDING", activeColor: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 shadow-sm" },
  { key: "statusAccepted", value: "ACCEPTED", activeColor: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 shadow-sm" },
  { key: "statusRejected", value: "REJECTED", activeColor: "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-sm" },
];

export function InvitationsList() {
  const { t } = useLanguage();
  const p = t.jobseekerInvitationsPage;

  const [invitations, setInvitations] = useState<CandidateInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<InvitationStatus | "">("");

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

  const counts = {
    "": invitations.length,
    PENDING: invitations.filter((i) => i.status === "PENDING").length,
    ACCEPTED: invitations.filter((i) => i.status === "ACCEPTED").length,
    REJECTED: invitations.filter((i) => i.status === "REJECTED").length,
  };

  const displayed = statusFilter ? invitations.filter((i) => i.status === statusFilter) : invitations;

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
                onClick={() => setStatusFilter(tab.value)}
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

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="hr-glass-card p-5 animate-pulse">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-36 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
              <div className="mt-3.5 h-14 rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="mt-4 flex justify-end gap-2">
                <div className="h-8 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="h-8 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className={cn("text-[14px]", portalSubtextAlt)}>{p.loadFailed}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline"
          >
            <RefreshCw size={13} />
            {p.retryBtn}
          </button>
        </div>
      ) : invitations.length === 0 ? (
        <EmptyState icon={Mail} title={p.emptyState} />
      ) : displayed.length === 0 ? (
        <EmptyState icon={Mail} title={p.noMatchingInvitations} />
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map((inv, i) => (
            <InvitationCard key={inv.id} invitation={inv} index={i} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
