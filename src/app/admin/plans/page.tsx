"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminRouteGuard } from "@/features/admin/components/guards/admin-route-guard";
import { AdminPlansPage } from "@/features/admin/components/plans/admin-plans-page";
import { CreditCard } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { AdminPageHeader } from "@/features/admin/components/layout/admin-page-header";

const FALLBACK = {
  heading: "Subscription Plans",
  subtext: "Quản lý giá và limit gói Free / Premium (HR & Candidate).",
};

export default function AdminPlansRoutePage() {
  const { t } = useLanguage();
  const page = t.adminPages.plansPage ?? FALLBACK;

  return (
    <AdminAppShell
      pageTitle={page.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: page.heading }]}
    >
      <AdminRouteGuard>
        <AdminPageHeader
          heading={page.heading}
          subtext={page.subtext}
          icon={CreditCard}
          iconGradient="bg-linear-to-br from-cyan-500 to-blue-500"
          accentGradient="bg-linear-to-r from-cyan-400 via-blue-500 to-primary"
          cardGradient="bg-linear-to-r from-cyan-50 via-white to-blue-50 dark:from-cyan-950/10 dark:via-gray-900 dark:to-blue-950/10"
          cardBorder="border-cyan-100 dark:border-cyan-900/30"
          iconShadow="shadow-cyan-200 dark:shadow-cyan-900/30"
        />
        <AdminPlansPage />
      </AdminRouteGuard>
    </AdminAppShell>
  );
}
