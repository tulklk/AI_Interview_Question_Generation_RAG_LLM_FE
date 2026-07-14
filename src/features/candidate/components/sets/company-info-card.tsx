"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Building2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { getCompanyById, type Company } from "@/features/admin/services/admin-company.service";
import { portalDivider, portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

interface CompanyInfoCardProps {
  companyId: string;
}

export function CompanyInfoCard({ companyId }: CompanyInfoCardProps) {
  const { t } = useLanguage();
  const p = t.jobseekerSetDetailPage.companyBlock;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    getCompanyById(companyId)
      .then((res) => {
        if (!cancelled) setCompany(res);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (loading) {
    return (
      <div className="hr-glass-card p-6 animate-pulse flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-3.5 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (failed || !company) {
    return (
      <div className="hr-glass-card p-6 flex items-center gap-3">
        <Building2 size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
        <p className={cn("text-[13px]", portalSubtextAlt)}>{p.notAvailable}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="hr-glass-card p-6"
    >
      <p className={cn("text-[12px] font-[700] uppercase tracking-wide mb-4", portalHeadingAlt)}>{p.title}</p>
      <div className="flex items-start gap-3">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt={company.name}
            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-700"
          />
        ) : (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0"
          >
            {company.name.slice(0, 2).toUpperCase()}
          </motion.div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className={cn("text-[15px] font-[700]", portalHeadingAlt)}>{company.name}</h3>
          {company.description && (
            <p className={cn("text-[13px] leading-[20px] mt-1 line-clamp-3", portalSubtextAlt)}>
              {company.description}
            </p>
          )}
          {company.websiteUrl && (
            <a
              href={company.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 text-[12px] font-[600] text-primary hover:underline mt-2 pt-2 border-t",
                portalDivider
              )}
            >
              <Globe size={12} />
              {p.visitWebsite}
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
