"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import {
  portalCard,
  portalHeading,
  portalInput,
  portalSubtext,
} from "@/shared/utils/portal-ui";

interface TimeLimitDialogProps {
  currentMinutes: number | null;
  saving: boolean;
  onSave: (minutes: number | null) => void;
  onClose: () => void;
}

export function TimeLimitDialog({ currentMinutes, saving, onSave, onClose }: TimeLimitDialogProps) {
  const { t } = useLanguage();
  const d = t.reviewPage.timeLimitDialog;

  const [noLimit, setNoLimit] = useState(currentMinutes == null);
  const [minutes, setMinutes] = useState(String(currentMinutes ?? 45));
  const [error, setError] = useState(false);

  function handleSave() {
    if (noLimit) {
      onSave(null);
      return;
    }
    const n = parseInt(minutes, 10);
    if (!Number.isFinite(n) || n < 1 || n > 480) {
      setError(true);
      return;
    }
    onSave(n);
  }

  function handleClose() {
    if (saving) return;
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-up"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={cn(portalCard, "w-full max-w-sm shadow-2xl animate-scale-in")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-limit-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 id="time-limit-title" className={cn("text-base font-semibold flex items-center gap-2", portalHeading)}>
            <Clock size={16} />
            {d.title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className={cn("p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50", portalSubtext)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className={cn("text-sm", portalSubtext)}>{d.description}</p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={noLimit}
              onChange={(e) => { setNoLimit(e.target.checked); setError(false); }}
              className="w-4 h-4 accent-[#6c47ff]"
            />
            <span className={cn("text-sm font-medium", portalHeading)}>{d.noLimitLabel}</span>
          </label>

          {!noLimit && (
            <div className="space-y-1.5">
              <label className={cn("text-sm font-medium", portalHeading)}>{d.minutesLabel}</label>
              <input
                type="number"
                min={1}
                max={480}
                value={minutes}
                onChange={(e) => { setMinutes(e.target.value); setError(false); }}
                className={cn(
                  "w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors",
                  portalInput,
                  error
                    ? "border-red-300 dark:border-red-700 focus:ring-red-200"
                    : "focus:ring-[#6c47ff]/20 focus:border-[#6c47ff]"
                )}
              />
              {error && <p className="text-xs text-red-600 dark:text-red-400">{d.rangeError}</p>}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className={cn(
              "flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-50",
              portalCard,
              portalHeading,
              "hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            {d.cancelBtn}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#6c47ff] text-white hover:bg-[#5535dd] transition-colors disabled:opacity-60"
          >
            {saving ? d.saving : d.saveBtn}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
