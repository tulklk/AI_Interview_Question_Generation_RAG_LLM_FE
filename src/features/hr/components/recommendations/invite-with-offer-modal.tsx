"use client";

/**
 * SCRUM-481: gộp Mời phỏng vấn (in-app) + Gửi Offer (email) thành 1 form.
 * Checkbox email mặc định bật; candidate FE/API không đổi.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, Send, X as XIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalDivider, portalHeading } from "@/shared/utils/portal-ui";
import { getCurrentUser } from "@/features/auth/services/user.service";
import {
  inviteRecommendation,
  sendRecommendationOffer,
  type CandidateRecommendation,
} from "@/features/hr/services/recommendation.service";
import { applyInviteScoreTemplate } from "@/features/hr/utils/score-band";
import { InviteScheduleFields, defaultInviteSchedule, toInvitePayload } from "./invite-schedule-fields";

const INVITE_MSG_MAX = 2000;
const OFFER_MSG_MAX = 5000;

function buildDefaultMessage(template: string, rec: CandidateRecommendation): string {
  return applyInviteScoreTemplate(template, rec.score)
    .replace("{{name}}", rec.candidateName || "")
    .replace("{{title}}", rec.questionSetTitle || "");
}

function isOfferBlocked(status: string | null | undefined): boolean {
  const s = (status ?? "").toUpperCase();
  return s === "SENT" || s === "ACCEPTED";
}

export interface InviteWithOfferModalProps {
  rec: CandidateRecommendation;
  onClose: () => void;
  /** Gọi khi invitation in-app được tạo (hoặc đã INVITED sẵn). */
  onInvited: () => void;
  /** Gọi khi email offer gửi thành công. */
  onOfferSent?: () => void;
}

export function InviteWithOfferModal({
  rec,
  onClose,
  onInvited,
  onOfferSent,
}: InviteWithOfferModalProps) {
  const { t } = useLanguage();
  const labels = t.hrRecommendationsPage.invite;
  const offerLabels = t.hrRecommendationsPage.offer;
  const p = t.hrRecommendationsPage;
  const { addToast } = useToast();

  const alreadyInvited = rec.status === "INVITED";
  const offerBlocked = isOfferBlocked(rec.latestOfferStatus);

  const [message, setMessage] = useState(() =>
    buildDefaultMessage(labels.defaultMessage, rec),
  );
  const [schedule, setSchedule] = useState(defaultInviteSchedule);
  // SCRUM-481: mặc định bật; nếu đã INVITED thì buộc bật (chỉ còn gửi email).
  const [sendEmail, setSendEmail] = useState(true);
  const [sending, setSending] = useState(false);

  const msgMax = sendEmail || alreadyInvited ? OFFER_MSG_MAX : INVITE_MSG_MAX;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    void getCurrentUser()
      .then((u) => {
        const tpl = u.hrProfile?.inviteMessageTemplate?.trim();
        if (tpl) setMessage(buildDefaultMessage(tpl, rec));
      })
      .catch(() => undefined);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;

    // Đã mời rồi mà không gửi email → không còn việc gì để làm.
    if (alreadyInvited && !sendEmail) {
      addToast("error", labels.emailRequiredWhenInvited);
      return;
    }
    if (sendEmail && offerBlocked) {
      addToast(
        "error",
        rec.latestOfferStatus?.toUpperCase() === "ACCEPTED"
          ? offerLabels.alreadyAccepted
          : offerLabels.alreadySent,
      );
      return;
    }

    setSending(true);
    try {
      let invitedOk = alreadyInvited;

      if (!alreadyInvited) {
        await inviteRecommendation(
          rec.id,
          toInvitePayload(trimmed.slice(0, INVITE_MSG_MAX), schedule),
        );
        invitedOk = true;
        onInvited();
      }

      if (sendEmail) {
        await sendRecommendationOffer(rec.id, trimmed.slice(0, OFFER_MSG_MAX));
        onOfferSent?.();
        addToast(
          "success",
          invitedOk && !alreadyInvited
            ? labels.sendSuccessWithEmail
            : offerLabels.sendSuccess,
        );
      } else {
        addToast("success", p.inviteSuccess);
      }

      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        // Invite 409 hoặc offer 409 — phân biệt nhẹ theo đã mời chưa.
        addToast(
          "error",
          alreadyInvited || sendEmail
            ? (offerLabels.alreadySent || p.alreadyActed)
            : p.alreadyActed,
        );
      } else {
        addToast("error", sendEmail ? offerLabels.sendFailed : p.inviteFailed);
      }
    } finally {
      setSending(false);
    }
  }

  const emailForced = alreadyInvited;
  const checkboxChecked = emailForced ? true : sendEmail;

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
        style={{ maxHeight: "min(720px, 92vh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-0.5 bg-linear-to-r from-violet-500 via-primary to-cyan-400 shrink-0" />

        <div className={cn("flex items-center justify-between px-5 py-4 border-b shrink-0", portalDivider)}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <Mail size={15} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className={cn("text-[14px] font-bold truncate", portalHeading)}>
                {alreadyInvited ? labels.emailOnlyModalTitle : labels.modalTitle}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {labels.to}:{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {rec.candidateName}
                </span>{" "}
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
          {!alreadyInvited && (
            <InviteScheduleFields value={schedule} onChange={setSchedule} labels={labels} />
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, msgMax))}
            placeholder={labels.messagePlaceholder}
            maxLength={msgMax}
            className="w-full text-[13px] leading-relaxed bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100 transition-all"
            style={{ minHeight: alreadyInvited ? "220px" : "200px" }}
            autoFocus
          />
          <p
            className={`text-[11px] mt-2 text-right ${
              message.length >= msgMax - 100
                ? "text-amber-500 dark:text-amber-400 font-medium"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {message.length} / {msgMax}
          </p>

          <label
            className={cn(
              "mt-4 flex items-start gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors",
              checkboxChecked
                ? "border-violet-200 bg-violet-50/80 dark:border-violet-800 dark:bg-violet-950/30"
                : "border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/50",
              emailForced && "opacity-90 cursor-default",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
              checked={checkboxChecked}
              disabled={emailForced || sending || offerBlocked}
              onChange={(e) => setSendEmail(e.target.checked)}
            />
            <span className="min-w-0">
              <span className={cn("block text-[13px] font-semibold", portalHeading)}>
                {labels.sendEmailCheckbox}
              </span>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                {alreadyInvited
                  ? labels.sendEmailHintInvited
                  : labels.sendEmailHint}
              </span>
            </span>
          </label>
        </div>

        <div
          className={cn(
            "flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0 bg-gray-50/50 dark:bg-gray-900/50",
            portalDivider,
          )}
        >
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
            disabled={
              sending ||
              !message.trim() ||
              message.length > msgMax ||
              (checkboxChecked && offerBlocked) ||
              (alreadyInvited && offerBlocked)
            }
            className="shimmer-button flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {sending ? labels.sending : labels.sendBtn}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
