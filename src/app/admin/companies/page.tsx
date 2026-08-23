"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminRouteGuard } from "@/features/admin/components/guards/admin-route-guard";
import { CompanyManagement } from "@/features/admin/components/companies/company-management";
import { Building2 } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { AdminPageHeader } from "@/features/admin/components/layout/admin-page-header";

export default function CompanyManagementPage() {
  const { t } = useLanguage();
  const c = t.adminPages.companies;

  return (
    <AdminAppShell
      pageTitle={c.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: c.heading }]}
    >
      <AdminRouteGuard>
        <AdminPageHeader
          heading={c.heading}
          subtext={c.subtext}
          icon={Building2}
          iconGradient="bg-linear-to-br from-amber-500 to-orange-500"
          accentGradient="bg-linear-to-r from-amber-400 via-orange-400 to-primary"
          cardGradient="bg-linear-to-r from-amber-50 via-white to-violet-50 dark:from-amber-950/10 dark:via-gray-900 dark:to-violet-950/10"
          cardBorder="border-amber-100 dark:border-amber-900/30"
          iconShadow="shadow-amber-200 dark:shadow-amber-900/30"
        />

        <CompanyManagement />
      </AdminRouteGuard>
    </AdminAppShell>
  );
}
