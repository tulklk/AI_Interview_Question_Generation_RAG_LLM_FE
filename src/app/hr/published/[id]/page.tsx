"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { PublishedSetHub } from "@/features/hr/components/published/published-set-hub";
import { PublishedSetHubSkeleton } from "@/features/hr/components/published/published-skeletons";
import { useLanguage } from "@/shared/providers/language-context";

/** SCRUM-440: trang hub chi tiết bộ đã publish. */
export default function HrPublishedSetDetailPage() {
  const { t } = useLanguage();
  const h = t.publishedHubPage;
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  return (
    <AppShell
      pageTitle={h.heading}
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: t.publishedInsightsPage.heading, href: "/hr/published" },
        { label: h.heading },
      ]}
      fullWidth
    >
      <Suspense fallback={<PublishedSetHubSkeleton />}>
        {id ? <PublishedSetHub questionSetId={id} /> : null}
      </Suspense>
    </AppShell>
  );
}
