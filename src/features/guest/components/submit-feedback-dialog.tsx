"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Star, X, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useOverlayTransition } from "@/shared/hooks/use-overlay-transition";
import { submitFeedback } from "@/features/guest/services/feedback.service";

interface SubmitFeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

// ── Star picker ───────────────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
  labels,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: string[];
}) {
  const [hovered, setHovered] = useState(0);
  // Track which star was just clicked to apply pop animation once
  const [justClicked, setJustClicked] = useState(0);
  const active = hovered || value;

  function handleClick(star: number) {
    onChange(star);
    setJustClicked(star);
    // Reset so animation can retrigger on same star
    setTimeout(() => setJustClicked(0), 350);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= active;
          const isClicked = justClicked === star;
          return (
            <button
              key={star}
              type="button"
              onClick={() => handleClick(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className={cn(
                "relative focus:outline-none transition-transform duration-100",
                "hover:scale-125 active:scale-95",
                isClicked && "star-selected"
              )}
              style={{ transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)" }}
            >
              {/* Ripple on click */}
              {isClicked && (
                <span
                  className="absolute inset-0 rounded-full bg-amber-400/25 pointer-events-none feedback-success-ring"
                  aria-hidden="true"
                />
              )}
              <Star
                size={30}
                className={cn(
                  "relative z-10 transition-all",
                  isActive
                    ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                    : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700",
                  hovered > 0 && star <= hovered && !isActive
                    ? "fill-amber-200 text-amber-200"
                    : ""
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Label transitions with CSS */}
      <div className="h-5 overflow-hidden relative w-full flex items-center justify-center">
        <p
          className={cn(
            "text-xs font-semibold text-amber-600 dark:text-amber-400 text-center transition-all duration-200",
            active > 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          {labels[active] ?? ""}
        </p>
      </div>
    </div>
  );
}

// ── Success icon with spring animation ───────────────────────────────────────

function SuccessIcon() {
  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      {/* Outer glow ring — pulses outward */}
      <span
        className="absolute inset-0 rounded-full bg-emerald-400/20"
        style={{ animation: "rippleOut 1.4s ease-out 0.4s infinite" }}
        aria-hidden="true"
      />
      {/* Inner ring */}
      <span
        className="absolute inset-2 rounded-full bg-emerald-100 dark:bg-emerald-950/60"
        aria-hidden="true"
      />
      {/* Icon with spring bounce */}
      <div className="relative z-10 feedback-success-icon">
        {/* Custom SVG check — draws itself */}
        <svg
          viewBox="0 0 40 40"
          width="40"
          height="40"
          fill="none"
          className="text-emerald-500"
        >
          <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
          <polyline
            points="10,20 17,27 30,13"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="40"
            strokeDashoffset="0"
            style={{
              animation: "checkDraw 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both",
            }}
          />
        </svg>
      </div>
    </div>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────

export function SubmitFeedbackDialog({ open, onClose }: SubmitFeedbackDialogProps) {
  const { t } = useLanguage();
  const p = t.submitFeedbackDialog;
  const { mounted, exiting } = useOverlayTransition(open);
  const visible = mounted && !exiting;

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<{ rating?: string; content?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Key to remount form body and re-trigger stagger animations on reopen
  const [formKey, setFormKey] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setRating(0);
      setContent("");
      setErrors({});
      setDone(false);
      setSubmitting(false);
      setFormKey((k) => k + 1);
      setTimeout(() => textareaRef.current?.focus(), 140);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function validate() {
    const e: typeof errors = {};
    if (!rating) e.rating = p.ratingRequired;
    if (content.trim().length < 10) e.content = p.contentMinLength;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    try {
      await submitFeedback({ rating, content: content.trim() });
      setDone(true);
    } catch {
      setErrors({ content: p.errorMessage });
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "transition-opacity duration-220",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 backdrop-blur-sm transition-all duration-300",
          visible
            ? "bg-black/45 dark:bg-black/65"
            : "bg-black/0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — spring enter/exit */}
      <div
        className={cn(
          "relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden",
          "border border-gray-100 dark:border-gray-800",
          "transition-all",
          visible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-[0.93] translate-y-4"
        )}
        style={{
          transitionDuration: visible ? "300ms" : "200ms",
          transitionTimingFunction: visible
            ? "cubic-bezier(0.34, 1.4, 0.64, 1)"
            : "cubic-bezier(0.4, 0, 1, 1)",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "absolute top-4 right-4 z-10 w-7 h-7 flex items-center justify-center rounded-lg",
            "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200",
            "hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-150 hover:scale-110 active:scale-90"
          )}
        >
          <X size={15} />
        </button>

        {/* ── Success state ─────────────────────────────────────────────── */}
        {done && (
          <div
            className="flex flex-col items-center gap-5 px-8 py-12 text-center"
            style={{ animation: "sectionSlideUp 0.3s ease-out both" }}
          >
            <SuccessIcon />

            <div style={{ animation: "sectionSlideUp 0.38s ease-out 0.15s both" }}>
              <h3 className="text-[18px] font-bold text-gray-900 dark:text-gray-100 mb-2">
                {p.successTitle}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-65">
                {p.successMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                "mt-1 px-8 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl",
                "hover:bg-primary/90 active:scale-95 transition-all duration-150"
              )}
              style={{ animation: "sectionSlideUp 0.38s ease-out 0.25s both" }}
            >
              {p.cancel}
            </button>
          </div>
        )}

        {/* ── Form ──────────────────────────────────────────────────────── */}
        {!done && (
          <form key={formKey} onSubmit={(e) => void handleSubmit(e)} noValidate>
            {/* Header */}
            <div
              className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 feedback-section"
              style={{ animationDelay: "0ms" }}
            >
              <h3 className="text-[17px] font-bold text-gray-900 dark:text-gray-100 mb-1 pr-8">
                {p.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {p.subtitle}
              </p>
            </div>

            {/* Rating block */}
            <div
              className="px-6 pt-5 pb-1 feedback-section"
              style={{ animationDelay: "60ms" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 text-center">
                {p.ratingLabel}
              </p>
              <StarPicker value={rating} onChange={setRating} labels={p.ratingLabels} />
              <div className={cn(
                "text-center h-5 mt-1 overflow-hidden transition-all duration-200",
                errors.rating ? "opacity-100" : "opacity-0"
              )}>
                <p className="text-xs text-red-500">{errors.rating}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-gray-100 dark:border-gray-800 feedback-section" style={{ animationDelay: "90ms" }} />

            {/* Content block */}
            <div
              className="px-6 pt-4 pb-5 feedback-section"
              style={{ animationDelay: "110ms" }}
            >
              <label
                htmlFor="feedback-content"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2"
              >
                {p.contentLabel}
              </label>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  id="feedback-content"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
                  }}
                  placeholder={p.contentPlaceholder}
                  rows={4}
                  className={cn(
                    "w-full px-3.5 py-3 text-sm rounded-xl border resize-none transition-all duration-200",
                    "bg-gray-50 dark:bg-gray-800/60",
                    "text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500",
                    "focus:outline-none focus:ring-2 focus:bg-white dark:focus:bg-gray-800",
                    errors.content
                      ? "border-red-400 dark:border-red-600 focus:border-red-400 focus:ring-red-500/20"
                      : "border-gray-200 dark:border-gray-700 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-violet-500/20"
                  )}
                />
                {/* Char count pill */}
                <span
                  className={cn(
                    "absolute bottom-2.5 right-3 text-[10px] tabular-nums font-medium px-1.5 py-0.5 rounded-full transition-all duration-300",
                    content.trim().length >= 10
                      ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                  )}
                >
                  {content.trim().length}/10+
                </span>
              </div>

              {/* Error with slide-down */}
              <div className={cn(
                "overflow-hidden transition-all duration-200",
                errors.content ? "max-h-8 opacity-100 mt-1.5" : "max-h-0 opacity-0"
              )}>
                <p className="text-xs text-red-500">{errors.content}</p>
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 feedback-section"
              style={{ animationDelay: "140ms" }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-150",
                  "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100",
                  "hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {p.cancel}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl text-white",
                  "bg-primary hover:bg-primary/90 transition-all duration-150",
                  "active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
                  "overflow-hidden"
                )}
              >
                {/* shimmer sweep on hover */}
                <span
                  className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.2) 50%, transparent 65%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmerSweep 1.8s linear infinite",
                  }}
                  aria-hidden="true"
                />
                {submitting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send
                    size={13}
                    className="transition-transform duration-150 group-hover:translate-x-0.5"
                  />
                )}
                <span>{submitting ? p.submitting : p.submit}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
