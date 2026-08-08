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
    <div>
      <div
        className="mb-4 flex items-start justify-between gap-3"
        style={{ animation: "slideUpFade 0.38s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
      >
        <div>
          <h2
            className={cn("text-xl font-bold", portalHeading)}
            style={{ animation: "slideUpFade 0.38s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
          >
            {t.historyPage.heading}
          </h2>
          <p
            className={cn("mt-0.5 text-[13px]", portalSubtext)}
            style={{ animation: "slideUpFade 0.38s cubic-bezier(0.25,0.46,0.45,0.94) both 0.06s" }}
          >
            {t.historyPage.subtext}
          </p>
        </div>
        <Link
          href="/hr/generate-question"
          className="hr-cta-btn inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white"
          style={{ animation: "scaleInFade 0.4s cubic-bezier(0.34,1.56,0.64,1) both 0.1s" }}
        >
          <Plus className="h-3.5 w-3.5" />
          {t.historyPage.openStudio}
        </Link>
      </div>

      <div style={{ animation: "fadeIn 0.42s ease-out both 0.12s" }}>
        <QuestionSetHistoryTable filter={filter} />
      </div>
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
