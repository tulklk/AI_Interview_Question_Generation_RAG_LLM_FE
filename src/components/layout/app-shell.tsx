import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";

interface AppShellProps {
  children: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  pageTitle: string;
}

export function AppShell({ children, breadcrumb, pageTitle }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader breadcrumb={breadcrumb} pageTitle={pageTitle} />
        <main className="flex-1 overflow-y-auto bg-[#f5f7fb]">
          <div className="max-w-[1400px] mx-auto px-8 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
