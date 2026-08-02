"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminRouteGuard } from "@/features/admin/components/guards/admin-route-guard";
import { AdminPlansPage } from "@/features/admin/components/plans/admin-plans-page";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

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
        <div className="mb-8 animate-fade-up">
          <h2 className={cn("text-[30px] font-bold leading-9", portalHeadingAlt)}>{page.heading}</h2>
          <p className={cn("text-base leading-6 mt-2", portalSubtextAlt)}>{page.subtext}</p>
        </div>
        <AdminPlansPage />
      </AdminRouteGuard>
    </AdminAppShell>
  );
}
