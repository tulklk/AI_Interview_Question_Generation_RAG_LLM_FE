"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { getCompanyColor, getCompanyInitials } from "@/features/candidate/utils/company-visual";
import { fillTemplate, type RoleReadiness } from "@/features/candidate/utils/dashboard-analytics";
import { cleanTitle } from "@/features/candidate/utils/clean-title";

function barColor(score: number | null): string {
  if (score === null) return "bg-gray-300 dark:bg-gray-700";
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-violet-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

/** Company avatar: logo image if available, else colored initials fallback */
function CompanyAvatar({ company, logoUrl }: { company: string; logoUrl: string | null }) {
  const [error, setError] = useState(false);

  if (logoUrl && !error) {
    return (
      <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200/70 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-sm shrink-0 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={company}
          loading="lazy"
          decoding="async"
          onError={() => setError(true)}
          className="w-full h-full object-contain p-0.5"
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "w-8 h-8 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0",
      getCompanyColor(company),
    )}>
      {getCompanyInitials(company)}
    </div>
  );
}

interface RoleReadinessListProps {
  roles: RoleReadiness[];
}

export function RoleReadinessList({ roles }: RoleReadinessListProps) {
  const { t } = useLanguage();
  const p = t.jobseekerDashboardPage.roles;

  return (
    <div className="flex flex-col gap-3">
      {roles.map((role, i) => (
        <motion.div
          key={role.role}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3"
        >
          <CompanyAvatar company={role.company} logoUrl={role.companyLogoUrl} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className={cn("text-[13px] font-semibold truncate", portalHeadingAlt)}>
                {cleanTitle(role.role)}
              </p>
              <span className={cn("text-[12px] font-bold tabular-nums shrink-0", portalHeadingAlt)}>
                {role.avgScore !== null ? `${role.avgScore}%` : "—"}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-1">
              <motion.div
                className={cn("h-full rounded-full", barColor(role.avgScore))}
                initial={{ width: 0 }}
                animate={{ width: `${role.avgScore ?? 0}%` }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: "easeOut" }}
              />
            </div>
            <p className={cn("text-[11px]", portalSubtextAlt)}>
              {fillTemplate(p.sessionsLabel, { count: String(role.sessionCount) })}
            </p>
          </div>

          {role.questionSetId && (
            <Link
              href={`/candidate/practice/${role.questionSetId}`}
              className="shrink-0 flex items-center gap-1 h-8 px-3 rounded-lg text-[11px] font-semibold text-primary hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
            >
              <RefreshCw size={11} />
              {p.practiceAgain}
            </Link>
          )}
        </motion.div>
      ))}
    </div>
  );
}
