import { AppShell } from "@/components/layout/app-shell";
import { WelcomeSection } from "@/components/dashboard/welcome-section";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { WeeklyActivityCard } from "@/components/dashboard/weekly-activity-card";
import { CategoryBreakdownCard } from "@/components/dashboard/category-breakdown-card";
import { QuickGenerateCard } from "@/components/dashboard/quick-generate-card";
import { RecentSessions } from "@/components/dashboard/recent-sessions";

export default function DashboardPage() {
  return (
    <AppShell
      pageTitle="Dashboard"
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Dashboard" }]}
    >
      <WelcomeSection />

      <StatsGrid />

      <div className="grid grid-cols-[1fr_420px] gap-4 mt-5">
        <WeeklyActivityCard />
        <CategoryBreakdownCard />
      </div>

      <div className="grid grid-cols-[1fr_420px] gap-4 mt-4">
        <QuickGenerateCard />
        <RecentSessions />
      </div>
    </AppShell>
  );
}
