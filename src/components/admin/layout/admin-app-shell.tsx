import type { ReactNode } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { TopHeader } from "@/components/layout/top-header";

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
  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader breadcrumb={breadcrumb} pageTitle={pageTitle} user={ADMIN_USER} />
        <main className="flex-1 overflow-y-auto bg-[#f5f7fb]">
          <div className="max-w-[1400px] mx-auto px-8 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
