"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, UserCheck, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useOverlayTransition } from "@/shared/hooks/use-overlay-transition";

export type ConfirmDialogVariant = "danger" | "primary";

interface ConfirmDialogExtraAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional tertiary destructive action, rendered as a text link below the main buttons. */
  extraAction?: ConfirmDialogExtraAction;
}

interface LatchedContent {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: ConfirmDialogVariant;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
  extraAction,
}: ConfirmDialogProps) {
  const { mounted, exiting } = useOverlayTransition(open, 250);
  const [content, setContent] = useState<LatchedContent>({
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant,
  });

  useEffect(() => {
    if (open) {
      setContent({ title, message, confirmLabel, cancelLabel, variant });
    }
  }, [open, title, message, confirmLabel, cancelLabel, variant]);

  if (!mounted) return null;

  const isDanger = content.variant === "danger";
  const Icon = isDanger ? AlertTriangle : UserCheck;

  function handleCancel() {
    if (exiting || loading) return;
    onCancel();
  }

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-sm",
          exiting ? "animate-fade-out" : "animate-fade-in"
        )}
        onClick={loading ? undefined : handleCancel}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className={cn(
          "relative w-full max-w-sm rounded-xl border border-border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.4)]",
          exiting ? "animate-scale-out" : "animate-scale-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 transition-colors hover:bg-page-bg dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          aria-label={content.cancelLabel}
        >
          <X size={15} />
        </button>

        <div className="px-6 pb-5 pt-6">
          <div
            className={cn(
              "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full",
              isDanger ? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400" : "bg-lavender dark:bg-primary/15 text-primary"
            )}
          >
            <Icon size={22} />
          </div>

          <h3
            id="confirm-dialog-title"
            className="text-center text-base font-bold text-charcoal dark:text-gray-100"
          >
            {content.title}
          </h3>
          <p
            id="confirm-dialog-desc"
            className="mt-2 whitespace-pre-line text-center text-sm leading-relaxed text-[#6b7280] dark:text-gray-400"
          >
            {content.message}
          </p>
        </div>

        <div className="flex gap-3 border-t border-border dark:border-gray-700 px-6 py-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-border dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-charcoal dark:text-gray-100 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {content.cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50",
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:bg-primary-hover"
            )}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {content.confirmLabel}
          </button>
        </div>

        {extraAction && (
          <div className="border-t border-border dark:border-gray-700 px-6 py-3 text-center">
            <button
              type="button"
              onClick={extraAction.onClick}
              disabled={loading || extraAction.loading}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
            >
              {extraAction.loading ? <Loader2 size={13} className="animate-spin" /> : null}
              {extraAction.label}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
