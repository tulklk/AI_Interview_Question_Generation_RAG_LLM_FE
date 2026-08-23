"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminRouteGuard } from "@/features/admin/components/guards/admin-route-guard";
import { AdminFeedbacksPage } from "@/features/admin/components/feedbacks/admin-feedbacks-page";
import { MessageSquare } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { AdminPageHeader } from "@/features/admin/components/layout/admin-page-header";

export default function FeedbacksPage() {
  const { t } = useLanguage();
  const p = t.adminPages.feedbacks;

  return (
    <AdminAppShell
      pageTitle={p.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: p.heading }]}
    >
      <AdminRouteGuard>
        <AdminPageHeader
          heading={p.heading}
          subtext={p.subtext}
          icon={MessageSquare}
          iconGradient="bg-linear-to-br from-emerald-500 to-teal-500"
          accentGradient="bg-linear-to-r from-emerald-400 via-teal-400 to-cyan-400"
          cardGradient="bg-linear-to-r from-emerald-50 via-white to-teal-50 dark:from-emerald-950/10 dark:via-gray-900 dark:to-teal-950/10"
          cardBorder="border-emerald-100 dark:border-emerald-900/30"
          iconShadow="shadow-emerald-200 dark:shadow-emerald-900/30"
        />

        <AdminFeedbacksPage />
      </AdminRouteGuard>
    </AdminAppShell>
  );
}
