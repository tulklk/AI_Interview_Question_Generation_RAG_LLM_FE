"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, Send, X as XIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { portalDivider, portalHeading } from "@/shared/utils/portal-ui";

export interface InviteCandidateTarget {
  candidateName: string;
  candidateEmail: string;
  questionSetTitle: string;
  score: number | null;
}

function buildDefaultInviteMessage(template: string, target: InviteCandidateTarget): string {
  return template
    .replace("{{name}}", target.candidateName || "")
    .replace("{{title}}", target.questionSetTitle || "")
    .replace("{{score}}", target.score != null ? String(Math.round(target.score)) : "—");
}

interface InviteCandidateModalProps {
  target: InviteCandidateTarget;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
}

export function InviteCandidateModal({ target, onClose, onSend }: InviteCandidateModalProps) {
  const { t } = useLanguage();
  const labels = t.hrRecommendationsPage.invite;
  const p = t.hrRecommendationsPage;
  const { addToast } = useToast();
  const [message, setMessage] = useState(() => buildDefaultInviteMessage(labels.defaultMessage, target));
  const [sending, setSending] = useState(false);

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
  }, [onClose]);

  async function handleSend() {
    setSending(true);
    try {
      await onSend(message);
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col"
        style={{ maxHeight: "min(680px, 90vh)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-0.5 bg-linear-to-r from-violet-500 via-primary to-cyan-400 shrink-0" />
        <div className={cn("flex items-center justify-between px-5 py-4 border-b shrink-0", portalDivider)}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <Mail size={15} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className={cn("text-[14px] font-bold truncate", portalHeading)}>{labels.modalTitle}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {labels.to}: <span className="font-semibold text-gray-700 dark:text-gray-300">{target.candidateName}</span>
                {" "}
                <span className="text-gray-400 dark:text-gray-500">({target.candidateEmail})</span>
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
