"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeadingAlt } from "@/shared/utils/portal-ui";

interface CompanyInfoCardProps {
  name: string;
  logoUrl?: string | null;
}

/**
 * The candidate question-set API embeds only companyName/companyLogo (no companyId,
 * no description/website) — so this just renders what's given, no separate fetch.
 */
export function CompanyInfoCard({ name, logoUrl }: CompanyInfoCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerSetDetailPage.companyBlock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="hr-glass-card p-6"
    >
      <p className={cn("text-[12px] font-[700] uppercase tracking-wide mb-4", portalHeadingAlt)}>{p.title}</p>
      <div className="flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={name}
            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-700"
          />
        ) : (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0"
          >
            {name.slice(0, 2).toUpperCase()}
          </motion.div>
        )}
        <h3 className={cn("text-[15px] font-[700]", portalHeadingAlt)}>{name}</h3>
      </div>
    </motion.div>
  );
}
