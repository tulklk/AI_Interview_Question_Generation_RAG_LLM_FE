import { AppShell } from "@/features/hr/components/layout/app-shell";
import { WelcomeSection } from "@/features/dashboard/components/welcome-section";
import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { WeeklyActivityCard } from "@/features/dashboard/components/weekly-activity-card";
import { CategoryBreakdownCard } from "@/features/dashboard/components/category-breakdown-card";
import { QuickGenerateCard } from "@/features/dashboard/components/quick-generate-card";
import { RecentSessions } from "@/features/dashboard/components/recent-sessions";

export default function HrDashboardPage() {
  return (
    <AppShell
      pageTitle="Dashboard"
      breadcrumb={[{ label: "HR", href: "/hr/dashboard" }, { label: "Dashboard" }]}
    >
      <div className="animate-fade-up">
        <WelcomeSection />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <StatsGrid />
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 mt-5 animate-fade-up"
        style={{ animationDelay: "160ms" }}
      >
        <WeeklyActivityCard />
        <CategoryBreakdownCard />
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 mt-4 animate-fade-up"
        style={{ animationDelay: "240ms" }}
      >
        <QuickGenerateCard />
        <RecentSessions />
      </div>
    </AppShell>
  );
}
