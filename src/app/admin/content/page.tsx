"use client";

import { useState } from "react";
import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { ContentFilters } from "@/components/admin/content/content-filters";
import { ContentTable } from "@/components/admin/content/content-table";
import { contentSessions } from "@/data/admin";
import { useLanguage } from "@/context/language-context";

export default function GeneratedContentPage() {
  const { t } = useLanguage();
  const c = t.adminPages.content;
  const f = c.filters;

  const [search, setSearch] = useState("");
  const [role, setRole] = useState(f.allRoles);
  const [dateRange, setDateRange] = useState(f.allTime);

  const filtered = contentSessions.filter((s) => {
    const matchSearch =
      search === "" ||
      s.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      s.recruiter.toLowerCase().includes(search.toLowerCase());
    const matchRole = role === f.allRoles || s.role === role;
    return matchSearch && matchRole;
  });

  return (
    <AdminAppShell
      pageTitle={c.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: c.heading }]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className="text-2xl font-bold text-gray-900">{c.heading}</h2>
        <p className="text-sm text-gray-500 mt-1">{c.subtext}</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <ContentFilters
          search={search}
          role={role}
          dateRange={dateRange}
          onSearchChange={setSearch}
          onRoleChange={setRole}
          onDateRangeChange={setDateRange}
        />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <ContentTable sessions={filtered} />
      </div>
    </AdminAppShell>
  );
}
