import { AppShell } from "@/components/layout/app-shell";
import { HistoryStats } from "@/components/history/history-stats";
import { HistoryFilters } from "@/components/history/history-filters";
import { HistoryTable } from "@/components/history/history-table";

export default function HistoryPage() {
  return (
    <AppShell
      pageTitle="History"
      breadcrumb={[{ label: "Home", href: "/" }, { label: "History" }]}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">History</h2>
        <p className="text-sm text-gray-500 mt-1">
          Browse and manage your past question generation sessions.
        </p>
      </div>

      <HistoryStats />
      <HistoryFilters />
      <HistoryTable />
    </AppShell>
  );
}
