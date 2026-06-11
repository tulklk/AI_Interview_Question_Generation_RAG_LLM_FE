"use client";

import Link from "next/link";
import { ArrowLeft, Download, FileDown } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { cn } from "@/lib/utils";
import { portalCard, portalHeading, portalSubtext } from "@/lib/portal-ui";

interface ResultsHeaderProps {
  jobTitle: string;
  totalQuestions: number;
  totalCategories: number;
}

export function ResultsHeader({
  jobTitle,
  totalQuestions,
  totalCategories,
}: ResultsHeaderProps) {
  const { t } = useLanguage();
  const rp = t.resultsPage;
  const hs = t.hrSubscription;
  const { hasFeature } = useHrSubscription();
  const pdfOk = hasFeature("pdfExport");
  const docxOk = hasFeature("docxExport");

  const btnClass =
    "flex items-center gap-2 text-sm font-semibold border px-4 py-2 rounded-lg transition-colors";
  const activeClass = cn(
    portalCard,
    portalHeading,
    "hover:bg-gray-50 dark:hover:bg-gray-800"
  );
  const lockedClass = "text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 cursor-not-allowed";

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 animate-fade-up">
      <div>
        <Link
          href="/hr/history"
          className={cn("inline-flex items-center gap-1.5 text-sm transition-colors mb-3 hover:text-gray-700 dark:hover:text-gray-300", portalSubtext)}
        >
          <ArrowLeft size={14} />
          {rp.backToHistory}
        </Link>
        <h2 className={cn("text-2xl font-bold", portalHeading)}>{rp.interviewQuestions}</h2>
        <p className="text-sm mt-1">
          {rp.generatedFor}{" "}
          <span className="text-[#6c47ff] font-semibold">{jobTitle}</span>
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className={cn("text-xs", portalSubtext)}>
            {totalQuestions} {rp.totalQuestions}
          </span>
          <span className="text-gray-200 dark:text-gray-700">|</span>
          <span className={cn("text-xs", portalSubtext)}>
            {totalCategories} {rp.categories}
          </span>
          <span className="text-gray-200 dark:text-gray-700">|</span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
            {rp.readyToUse}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={!pdfOk}
          title={!pdfOk ? hs.lockedExport : undefined}
          className={cn(btnClass, pdfOk ? activeClass : lockedClass)}
        >
          <Download size={14} />
          {rp.exportToPdf}
        </button>
        <button
          type="button"
          disabled={!docxOk}
          title={!docxOk ? hs.lockedExport : undefined}
          className={cn(btnClass, docxOk ? activeClass : lockedClass)}
        >
          <FileDown size={14} />
          {rp.exportToDocx}
        </button>
      </div>
    </div>
  );
}
