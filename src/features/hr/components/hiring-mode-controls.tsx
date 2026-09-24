"use client";

import { useEffect, useState } from "react";
import { Briefcase, Dumbbell, Loader2, Lock, Shield } from "lucide-react";
import { cn } from "@/lib/cn";
import { Toggle } from "@/shared/components/ui/toggle";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { getHrPlatformFlags } from "@/features/hr/services/hr-platform-flags.service";
import { useToast } from "@/shared/providers/toast-context";

export type HiringModeValue = {
  isHiringAssessment: boolean;
  hrAntiCheatEnabled: boolean;
};

type Props = {
  value: HiringModeValue;
  onChange: (next: HiringModeValue) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  /** compact = toolbar một hàng; full = publish dialog */
  variant?: "compact" | "full";
};

/**
 * SCRUM-464: chọn Practice vs Tuyển + anti-cheat HR (sau khi gen xong / lúc publish).
 * Compact: segmented control + chip AC (hint admin qua tooltip — không phá toolbar).
 * Pill slide: CSS transform giống landing pricing tabs (không dùng Framer layoutId).
 */
export function HiringModeControls({
  value,
  onChange,
  disabled = false,
  className,
  variant = "compact",
}: Props) {
  const { t } = useLanguage();
  const h = t.hiringMode;
  const { addToast } = useToast();
  const [adminAntiCheat, setAdminAntiCheat] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  /** Optimistic highlight — slide ngay khi click, không chờ API. */
  const [visualHiring, setVisualHiring] = useState(value.isHiringAssessment);

  useEffect(() => {
    setVisualHiring(value.isHiringAssessment);
  }, [value.isHiringAssessment]);

  useEffect(() => {
    let cancelled = false;
    getHrPlatformFlags()
      .then((f) => {
        if (!cancelled) setAdminAntiCheat(f.antiCheatEnabled);
      })
      .catch(() => {
        if (!cancelled) setAdminAntiCheat(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function apply(next: HiringModeValue) {
    if (disabled || saving) return;
    const prev = visualHiring;
    setVisualHiring(next.isHiringAssessment);
    setSaving(true);
    try {
      await onChange(next);
    } catch (err) {
      setVisualHiring(prev);
      // Backend gate (thiếu PublicJobDescription / JD gốc) — toast, không để Next.js overlay.
      addToast(
        "error",
        err instanceof Error && err.message ? err.message : h.publicJdRequired
      );
    } finally {
      setSaving(false);
    }
  }

  const busy = disabled || saving;
  const adminOff = adminAntiCheat === false;
  const acOn = value.isHiringAssessment && value.hrAntiCheatEnabled && adminAntiCheat === true;
  const acDisabled = busy || !value.isHiringAssessment || adminOff;

  const modeSegment = (
    <div
      className="relative grid w-54 grid-cols-2 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-900/80"
      role="group"
      aria-label={h.sectionLabel}
    >
      {/* Pill trượt riêng — không overshoot (bezier y≤1) để tránh giật khi về Luyện tập */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 z-0 w-[calc(50%-2px)] rounded-md bg-primary shadow-sm will-change-transform"
        style={{
          transform: visualHiring
            ? "translate3d(100%, 0, 0)"
            : "translate3d(0, 0, 0)",
          transition: "transform 280ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          void apply({ isHiringAssessment: false, hrAntiCheatEnabled: false })
        }
        className={cn(
          "relative z-10 flex min-w-0 items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors duration-200 disabled:opacity-50",
          !visualHiring
            ? "text-white"
            : "text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
        )}
        title={h.practiceHint}
      >
        <Dumbbell size={12} strokeWidth={2.2} className="shrink-0" aria-hidden />
        <span>{h.practice}</span>
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          void apply({
            isHiringAssessment: true,
            hrAntiCheatEnabled: adminAntiCheat === true ? value.hrAntiCheatEnabled : false,
          })
        }
        className={cn(
          "relative z-10 flex min-w-0 items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors duration-200 disabled:opacity-50",
          visualHiring
            ? "text-white"
            : "text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
        )}
        title={h.hiringHint}
      >
        <Briefcase size={12} strokeWidth={2.2} className="shrink-0" aria-hidden />
        <span>{h.hiring}</span>
      </button>
    </div>
  );

  if (variant === "compact") {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        {modeSegment}
        {/* Ô cố định: spinner không được làm co/giãn hàng toolbar → segment đứng im */}
        <span className="inline-flex w-3 shrink-0 items-center justify-center" aria-hidden>
          {saving && <Loader2 size={12} className="animate-spin text-gray-400" />}
        </span>
      </div>
    );
  }

  // ── full (publish dialog) ──────────────────────────────────────────────
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 dark:border-gray-800 dark:bg-gray-900/50",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn("text-[11px] font-semibold uppercase tracking-wide", portalSubtext)}>
          {h.sectionLabel}
        </span>
        {saving && <Loader2 size={12} className="animate-spin text-gray-400" />}
      </div>

      <div className="mt-2">{modeSegment}</div>

      <p className={cn("mt-2 text-[11px] leading-snug", portalSubtext)}>
        {visualHiring ? h.hiringHint : h.practiceHint}
      </p>

      {value.isHiringAssessment && (
        <div
          className={cn(
            "mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
            adminOff
              ? "border-amber-200/70 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30"
              : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950/60"
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {adminOff ? (
              <Lock size={14} className="shrink-0 text-amber-700 dark:text-amber-300" />
            ) : (
              <Shield size={14} className="shrink-0 text-primary" />
            )}
            <div className="min-w-0">
              <p className={cn("text-[12px] font-semibold", portalHeading)}>{h.antiCheat}</p>
              {adminOff && (
                <p className={cn("mt-0.5 text-[10px] leading-snug", portalSubtext)}>
                  {h.adminOffHint}
                </p>
              )}
            </div>
          </div>
          <Toggle
            checked={acOn}
            onChange={(checked) =>
              void apply({
                isHiringAssessment: true,
                hrAntiCheatEnabled: checked && adminAntiCheat === true,
              })
            }
            disabled={acDisabled}
            ariaLabel={h.antiCheat}
          />
        </div>
      )}
    </div>
  );
}
