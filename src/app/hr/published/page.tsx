"use client";

import { AppShell } from "@/features/hr/components/layout/app-shell";
import { PublishedInsightsTable } from "@/features/hr/components/published/published-insights-table";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

/** SCRUM-438: trang tổng hợp set đã publish. */
export default function HrPublishedInsightsPage() {
  const { t } = useLanguage();
  const p = t.publishedInsightsPage;

  return (
    <AppShell
      pageTitle={p.heading}
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: t.historyPage.heading, href: "/hr/history" },
        { label: p.heading },
      ]}
      fullWidth
    >
      <div>
        <div
          className="mb-4"
          style={{ animation: "slideUpFade 0.38s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
        >
          <h2 className={cn("text-xl font-bold", portalHeading)}>{p.heading}</h2>
          <p className={cn("mt-0.5 text-[13px]", portalSubtext)}>{p.subtext}</p>
        </div>
        <div style={{ animation: "fadeIn 0.42s ease-out both 0.12s" }}>
          <PublishedInsightsTable />
        </div>
      </div>
    </AppShell>
  );
}
