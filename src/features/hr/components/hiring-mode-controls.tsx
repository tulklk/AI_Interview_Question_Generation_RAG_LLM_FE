"use client";

import { useEffect, useState } from "react";
import { Briefcase, Dumbbell, Loader2, Lock, Shield, ShieldOff } from "lucide-react";
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
    setSaving(true);
    try {
      await onChange(next);
    } catch (err) {
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

  const segmentBtn = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
      active
        ? "bg-primary text-white shadow-sm"
        : "bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
    );

  const modeSegment = (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-900/80",
        busy && "opacity-70"
      )}
      role="group"
      aria-label={h.sectionLabel}
    >
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          void apply({ isHiringAssessment: false, hrAntiCheatEnabled: false })
        }
        className={cn(segmentBtn(!value.isHiringAssessment), "rounded-md")}
        title={h.practiceHint}
      >
        <Dumbbell size={12} strokeWidth={2.2} />
        {h.practice}
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
        className={cn(segmentBtn(value.isHiringAssessment), "rounded-md")}
        title={h.hiringHint}
      >
        <Briefcase size={12} strokeWidth={2.2} />
        {h.hiring}
      </button>
    </div>
  );

  /** Chip AC gọn trên toolbar — click bật/tắt; admin off → khóa + tooltip */
  const compactAcChip =
    value.isHiringAssessment && (
      <button
        type="button"
        disabled={acDisabled && !adminOff}
        onClick={() => {
          if (adminOff || busy) return;
          void apply({
            isHiringAssessment: true,
            hrAntiCheatEnabled: !value.hrAntiCheatEnabled,
          });
        }}
        title={
          adminOff
            ? h.adminOffHint
            : acOn
              ? h.antiCheatOnHint
              : h.antiCheatOffHint
        }
        className={cn(
          "inline-flex h-[26px] items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors",
          adminOff
            ? "cursor-not-allowed border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            : acOn
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
          busy && "opacity-60"
        )}
      >
        {adminOff ? (
          <Lock size={11} className="shrink-0" />
        ) : acOn ? (
          <Shield size={11} className="shrink-0" />
        ) : (
          <ShieldOff size={11} className="shrink-0" />
        )}
        <span className="whitespace-nowrap">
          {adminOff ? h.antiCheatLocked : acOn ? h.antiCheatOn : h.antiCheatOff}
        </span>
      </button>
    );

  if (variant === "compact") {
    return (
      <div className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
        {modeSegment}
        {compactAcChip}
        {saving && <Loader2 size={12} className="animate-spin text-gray-400" />}
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
        {value.isHiringAssessment ? h.hiringHint : h.practiceHint}
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
