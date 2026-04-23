"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { useLanguage } from "@/context/language-context";

interface AdminAppShellProps {
  children: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  pageTitle: string;
}

const ADMIN_USER = {
  initials: "AD",
  name: "Administrator",
  plan: "Admin",
};

export function AdminAppShell({ children, breadcrumb, pageTitle }: AdminAppShellProps) {
  const { t } = useLanguage();
  const pathname = usePathname();

  const routes = t.appShell.routes;
  const translatedTitle =
    routes[pathname as keyof typeof routes] ?? pageTitle;

  const translatedBreadcrumb = breadcrumb?.map((crumb) => ({
    ...crumb,
    label:
      t.appShell.breadcrumb[crumb.label.toLowerCase() as keyof typeof t.appShell.breadcrumb] ??
      crumb.label,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader
          breadcrumb={translatedBreadcrumb}
          pageTitle={translatedTitle}
          user={ADMIN_USER}
        />
        <main className="flex-1 overflow-y-auto bg-[#f5f7fb]">
          <div className="max-w-[1400px] mx-auto px-8 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
