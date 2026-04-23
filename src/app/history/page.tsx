"use client";

import { AppShell } from "@/components/layout/app-shell";
import { HistoryStats } from "@/components/history/history-stats";
import { HistoryFilters } from "@/components/history/history-filters";
import { HistoryTable } from "@/components/history/history-table";
import { useLanguage } from "@/context/language-context";

export default function HistoryPage() {
  const { t } = useLanguage();
  const hp = t.historyPage;

  return (
    <AppShell
      pageTitle={hp.heading}
      breadcrumb={[{ label: "Home", href: "/" }, { label: hp.heading }]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className="text-2xl font-bold text-gray-900">{hp.heading}</h2>
        <p className="text-sm text-gray-500 mt-1">{hp.subtext}</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <HistoryStats />
      </div>
      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <HistoryFilters />
      </div>
      <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <HistoryTable />
      </div>
    </AppShell>
  );
}
