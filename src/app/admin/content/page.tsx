"use client";

import { useState } from "react";
import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { ContentFilters } from "@/components/admin/content/content-filters";
import { ContentTable } from "@/components/admin/content/content-table";
import { contentSessions } from "@/data/admin";

export default function GeneratedContentPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All Roles");
  const [dateRange, setDateRange] = useState("All Time");

  const filtered = contentSessions.filter((s) => {
    const matchSearch =
      search === "" ||
      s.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      s.recruiter.toLowerCase().includes(search.toLowerCase());
    const matchRole = role === "All Roles" || s.role === role;
    return matchSearch && matchRole;
  });

  return (
    <AdminAppShell
      pageTitle="Generated Content"
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Content" }]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className="text-2xl font-bold text-gray-900">Generated Content</h2>
        <p className="text-sm text-gray-500 mt-1">
          Browse all interview question sessions generated across the platform.
        </p>
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
