"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, UserCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOverlayTransition } from "@/hooks/use-overlay-transition";

export type ConfirmDialogVariant = "danger" | "primary";

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
          "relative w-full max-w-sm rounded-xl border border-[#e5e7eb] bg-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]",
          exiting ? "animate-scale-out" : "animate-scale-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-[#f5f7fb] hover:text-gray-600 disabled:opacity-50"
          aria-label={content.cancelLabel}
        >
          <X size={15} />
        </button>

        <div className="px-6 pb-5 pt-6">
          <div
            className={cn(
              "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full",
              isDanger ? "bg-red-50 text-red-600" : "bg-[#f5f3ff] text-[#6c47ff]"
            )}
          >
            <Icon size={22} />
          </div>

          <h3
            id="confirm-dialog-title"
            className="text-center text-base font-bold text-[#111827]"
          >
            {content.title}
          </h3>
          <p
            id="confirm-dialog-desc"
            className="mt-2 text-center text-sm leading-relaxed text-[#6b7280]"
          >
            {content.message}
          </p>
        </div>

        <div className="flex gap-3 border-t border-[#e5e7eb] px-6 py-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#f9fafb] disabled:opacity-50"
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
                : "bg-[#6c47ff] hover:bg-[#5a3dd9]"
            )}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {content.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
