"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminRouteGuard } from "@/features/admin/components/guards/admin-route-guard";
import { CompanyManagement } from "@/features/admin/components/companies/company-management";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

export default function CompanyManagementPage() {
  const { t } = useLanguage();
  const c = t.adminPages.companies;

  return (
    <AdminAppShell
      pageTitle={c.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: c.heading }]}
    >
      <AdminRouteGuard>
        <div className="mb-8 animate-fade-up">
          <h2 className={cn("text-[30px] font-bold leading-9", portalHeadingAlt)}>{c.heading}</h2>
          <p className={cn("text-base leading-6 mt-2", portalSubtextAlt)}>{c.subtext}</p>
        </div>

        <CompanyManagement />
      </AdminRouteGuard>
    </AdminAppShell>
  );
}
