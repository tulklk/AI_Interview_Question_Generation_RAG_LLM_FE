"use client";

import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminRouteGuard } from "@/features/admin/components/guards/admin-route-guard";
import { AdminFeedbacksPage } from "@/features/admin/components/feedbacks/admin-feedbacks-page";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

export default function FeedbacksPage() {
  const { t } = useLanguage();
  const p = t.adminPages.feedbacks;

  return (
    <AdminAppShell
      pageTitle={p.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: p.heading }]}
    >
      <AdminRouteGuard>
        <div className="mb-8 animate-fade-up">
          <h2 className={cn("text-[30px] font-bold leading-9", portalHeadingAlt)}>{p.heading}</h2>
          <p className={cn("text-base leading-6 mt-2", portalSubtextAlt)}>{p.subtext}</p>
        </div>

        <AdminFeedbacksPage />
      </AdminRouteGuard>
    </AdminAppShell>
  );
}
