"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";
import { useLanguage } from "@/context/language-context";

interface AppShellProps {
  children: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  pageTitle: string;
}

export function AppShell({ children, breadcrumb, pageTitle }: AppShellProps) {
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
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader
          breadcrumb={translatedBreadcrumb}
          pageTitle={translatedTitle}
        />
        <main className="flex-1 overflow-y-auto bg-[#f5f7fb]">
          <div className="max-w-[1400px] mx-auto px-8 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
