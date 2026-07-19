"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { listCompanies, type Company } from "@/features/admin/services/admin-company.service";

interface CompanyInfoCardProps {
  name: string;
  logoUrl?: string | null;
}

/**
 * The candidate question-set API only embeds companyName/companyLogo (no
 * companyId), so the fuller profile (description, website) is looked up by
 * exact-name match against the public GET /api/companies list instead of
 * GET /api/companies/{id}. Falls back to just name+logo if no match is found
 * or the lookup fails — never blocks or crashes the set-detail page.
 */
export function CompanyInfoCard({ name, logoUrl }: CompanyInfoCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerSetDetailPage.companyBlock;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCompanies({ keyword: name, pageSize: 5 })
      .then((res) => {
        if (cancelled) return;
        const match = res.items.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
        setCompany(match ?? null);
      })
      .catch(() => {
        // Non-critical — card still renders with name + logo from the set itself.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  const resolvedLogo = logoUrl ?? company?.logoUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="hr-glass-card p-6"
    >
      <p className={cn("text-[12px] font-[700] uppercase tracking-wide mb-4", portalHeadingAlt)}>{p.title}</p>
      <div className="flex items-center gap-3">
        {resolvedLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedLogo}
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
        <div className="min-w-0 flex-1">
          <h3 className={cn("text-[15px] font-[700] truncate", portalHeadingAlt)}>{name}</h3>
          {company?.websiteUrl && (
            <a
              href={company.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline mt-0.5"
            >
              <Globe size={11} />
              {p.visitWebsite}
            </a>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2 animate-pulse">
          <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ) : company?.description ? (
        <p className={cn("mt-4 text-[13px] leading-[20px]", portalSubtextAlt)}>{company.description}</p>
      ) : (
        <p className={cn("mt-4 text-[12px] italic", portalSubtextAlt)}>{p.notAvailable}</p>
      )}
    </motion.div>
  );
}
