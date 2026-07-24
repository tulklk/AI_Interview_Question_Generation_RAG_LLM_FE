"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, AlertCircle, RefreshCw, Check, X, Loader2, ChevronRight, SlidersHorizontal } from "lucide-react";
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
  const styles: Record<InvitationStatus, string> = {
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400",
    ACCEPTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
    REJECTED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };
  const text: Record<InvitationStatus, string> = {
    PENDING: labels.statusPending,
    ACCEPTED: labels.statusAccepted,
    REJECTED: labels.statusRejected,
  };
  return (
    <span className={cn("inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0", styles[status])}>
      {text[status]}
    </span>
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

  const canAct = invitation.status === "PENDING";

  async function handleAccept() {
    if (busy) return;
    setBusy("accept");
    try {
      await acceptInvitation(invitation.id);
      onStatusChange(invitation.id, "ACCEPTED");
      addToast("success", p.acceptSuccess);
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
        className={cn(
          "hr-glass-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 border-l-4",
          invitation.status === "PENDING" ? "border-l-amber-400 dark:border-l-amber-500" : "border-l-transparent",
          invitation.status === "REJECTED" && "opacity-60"
        )}
      >
        {invitation.companyLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={invitation.companyLogoUrl}
            alt={invitation.companyName}
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-lg object-cover border border-gray-100 dark:border-gray-700 shrink-0"
          />
        ) : (
          <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0", getCompanyColor(invitation.companyName))}>
            {getCompanyInitials(invitation.companyName)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("text-[14px] font-bold truncate", portalHeadingAlt)}>{invitation.companyName || "—"}</p>
            <StatusBadge status={invitation.status} labels={p} />
          </div>
          {invitation.questionSetId ? (
            <Link
              href={`/jobseeker/sets/${invitation.questionSetId}`}
              className="text-[12px] font-medium text-primary hover:underline truncate block mt-0.5"
            >
              {invitation.questionSetTitle || "—"}
            </Link>
          ) : (
            <p className={cn("text-[12px] font-medium truncate mt-0.5", portalSubtextAlt)}>{invitation.questionSetTitle || "—"}</p>
          )}
          <p className={cn("text-[12px] mt-1.5 leading-relaxed", portalSubtextAlt)}>
            {invitation.message || p.noMessage}
          </p>
          {invitation.createdAt && (
            <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1.5">
              {formatRelativeTime(invitation.createdAt, lang)}
            </p>
          )}
        </div>

        {canAct && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowRejectConfirm(true)}
              disabled={busy !== null}
              className="flex items-center gap-1.5 h-9 px-3.5 text-[12px] font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            >
              {busy === "reject" ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              {p.rejectBtn}
            </button>
            <button
              type="button"
              onClick={() => void handleAccept()}
              disabled={busy !== null}
              className="shimmer-button flex items-center gap-1.5 h-9 px-3.5 text-[12px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60"
            >
              {busy === "accept" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {p.acceptBtn}
            </button>
          </div>
        )}

        {!canAct && invitation.questionSetId && invitation.status === "ACCEPTED" && (
          <Link
            href={`/jobseeker/sets/${invitation.questionSetId}`}
            className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline shrink-0"
          >
            <ChevronRight size={13} />
          </Link>
        )}
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
    </>
  );
}

const STATUS_TABS: Array<{ key: "filterAll" | "statusPending" | "statusAccepted" | "statusRejected"; value: InvitationStatus | "" }> = [
  { key: "filterAll", value: "" },
  { key: "statusPending", value: "PENDING" },
  { key: "statusAccepted", value: "ACCEPTED" },
  { key: "statusRejected", value: "REJECTED" },
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

  const displayed = statusFilter ? invitations.filter((i) => i.status === statusFilter) : invitations;

  return (
    <div>
      {!loading && !error && invitations.length > 0 && (
        <div className="hr-glass-card px-4 py-2.5 mb-4 flex items-center gap-3">
          <SlidersHorizontal size={14} className="text-gray-400 shrink-0" />
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    "whitespace-nowrap px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all",
                    active
                      ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100 font-semibold"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  {p[tab.key]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="hr-glass-card p-5 flex items-center gap-4 animate-pulse">
              <div className="w-11 h-11 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-56 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-9 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
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
