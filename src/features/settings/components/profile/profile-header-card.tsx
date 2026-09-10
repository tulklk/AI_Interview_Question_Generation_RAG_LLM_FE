"use client";

import type { ReactNode } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

interface ProfileHeaderCardProps {
  /** AvatarUpload wired by the parent so upload logic stays in one place. */
  avatarSlot: ReactNode;
  fullName: string;
  email: string;
  jobTitle: string;
  companyName: string;
  googleLinked: boolean;
  isPremium: boolean;
  /** 0-100, computed from the fields the HR can actually fill in. */
  completeness: number;
  /** Edit trigger, or the cancel/save pair while editing. */
  action: ReactNode;
}

export function ProfileHeaderCard({
  avatarSlot,
  fullName,
  email,
  jobTitle,
  companyName,
  googleLinked,
  isPremium,
  completeness,
  action,
}: ProfileHeaderCardProps) {
  const { t } = useLanguage();
  const sp = t.settingsPage.profile;

  const meta = [jobTitle.trim() || sp.defaultRole, companyName.trim()].filter(Boolean);

  return (
    <section className={cn(portalCard, "p-5 sm:p-6")}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="shrink-0">{avatarSlot}</div>

        <div className="min-w-0 flex-1">
          <h3 className={cn("text-xl font-semibold leading-tight break-words", portalHeading)}>
            {fullName || sp.defaultRole}
          </h3>
          <p className={cn("mt-0.5 text-sm truncate", portalSubtext)} title={email}>
            {email}
          </p>
          {meta.length > 0 && (
            <p className={cn("mt-1 text-sm", portalSubtext)}>{meta.join(" • ")}</p>
          )}

          {(googleLinked || isPremium) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {googleLinked && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Check size={13} strokeWidth={2.5} aria-hidden />
                  {`Google · ${sp.googleLinkedBadge}`}
                </span>
              )}
              {isPremium && (
                <span className="hr-plan-badge inline-flex items-center gap-1.5 rounded-full border border-[#7C3AED]/25 bg-[#7C3AED]/8 px-2.5 py-1 text-xs font-semibold text-[#7C3AED] dark:border-[#7C3AED]/40 dark:bg-[#7C3AED]/15 dark:text-[#a78bff]">
                  <Sparkles size={13} aria-hidden />
                  {sp.premiumBadge}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="w-full sm:w-auto sm:shrink-0 sm:pt-0.5">{action}</div>
      </div>

      {completeness < 100 && (
        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <p className={cn("text-xs font-medium", portalHeading)}>
              {sp.completeness.replace("{{percent}}", String(completeness))}
            </p>
            <p className={cn("hidden text-xs sm:block", portalSubtext)}>{sp.completenessHint}</p>
          </div>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={sp.completeness.replace("{{percent}}", String(completeness))}
          >
            <div
              className="h-full rounded-full bg-[#6c47ff] transition-[width] duration-500"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
