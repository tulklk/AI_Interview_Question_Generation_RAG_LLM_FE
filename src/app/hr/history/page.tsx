"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { QuestionSetHistoryTable } from "@/features/hr/components/history/question-set-history-table";
import type { QuestionSetsFilterKey } from "@/features/hr/types/history-question-set";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

function parseFilter(raw: string | null): QuestionSetsFilterKey {
  if (raw === "DRAFT" || raw === "PUBLISHED" || raw === "bookmarked") return raw;
  return "all";
}

function HistoryPageBody() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const filter = useMemo(() => parseFilter(searchParams.get("filter")), [searchParams]);

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className={cn("text-xl font-bold", portalHeading)}>{t.historyPage.heading}</h2>
          <p className={cn("mt-0.5 text-[13px]", portalSubtext)}>{t.historyPage.subtext}</p>
        </div>
        <Link
          href="/hr/generate-v2"
          className="hr-cta-btn inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          {t.historyPage.openStudio}
        </Link>
      </div>

      <QuestionSetHistoryTable filter={filter} />
    </div>
  );
}

/** SCRUM: Bộ câu hỏi — lọc qua submenu sidebar HR (?filter=). */
export default function HrHistoryPage() {
  const { t } = useLanguage();

  return (
    <AppShell
      pageTitle={t.historyPage.heading}
      breadcrumb={[{ label: "HR", href: "/hr/dashboard" }, { label: t.historyPage.heading }]}
      fullWidth
    >
      <Suspense fallback={null}>
        <HistoryPageBody />
      </Suspense>
    </AppShell>
  );
}
