"use client";

import Link from "next/link";
import { Building2, ExternalLink, Globe } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type { Company } from "@/features/admin/services/admin-company.service";

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-3 w-40 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-2.5 w-28 rounded bg-gray-50 dark:bg-gray-800/70 animate-pulse" />
          </div>
          <div className="h-3 w-14 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AdminCompanyTableProps {
  companies: Company[];
  totalCompanies: number;
  loading: boolean;
}

export function AdminCompanyTable({
  companies,
  totalCompanies,
  loading,
}: AdminCompanyTableProps) {
  const { t } = useLanguage();
  const d = t.adminPages.dashboard.companyOverview;

  return (
    <div className="hr-glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
            <Building2 size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className={cn("text-sm font-bold leading-tight", portalHeadingAlt)}>
              {d.title}
              {!loading && totalCompanies > 0 && (
                <span className={cn("ml-1.5 text-[11px] font-normal", portalSubtextAlt)}>
                  ({totalCompanies})
                </span>
              )}
            </h2>
            <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{d.subtitle}</p>
          </div>
        </div>
        <Link
          href="/admin/companies"
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-hover transition-colors"
        >
          {d.viewAll}
          <ExternalLink size={10} />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonRows count={5} />
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Building2 size={28} className="text-gray-300 dark:text-gray-700" />
          <p className={cn("text-xs", portalSubtextAlt)}>{d.empty}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {companies.map((company) => {
            const createdDate = company.createdAt
              ? new Date(company.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "2-digit",
                })
              : null;
            return (
              <div key={company.id} className="flex items-center gap-3 px-4 py-3 hr-table-row">
                {/* Logo */}
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Building2 size={13} className="text-gray-400" />
                  )}
                </div>

                {/* Name + website */}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[12px] font-semibold truncate", portalHeadingAlt)}>
                    {company.name}
                  </p>
                  {company.websiteUrl && (
                    <a
                      href={company.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "text-[10px] flex items-center gap-0.5 hover:text-primary transition-colors truncate max-w-44",
                        portalSubtextAlt
                      )}
                    >
                      <Globe size={9} />
                      {company.websiteUrl.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>

                {/* Created date */}
                {createdDate && (
                  <span className={cn("text-[10px] tabular-nums shrink-0", portalSubtextAlt)}>
                    {createdDate}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
