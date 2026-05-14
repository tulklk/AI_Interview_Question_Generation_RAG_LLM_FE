"use client";

import { useMemo, useState } from "react";
import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { AuditLogFilters, AUDIT_FILTER_ALL } from "@/components/admin/audit/audit-log-filters";
import { AuditLogTable } from "@/components/admin/audit/audit-log-table";
import { auditLogEntries } from "@/data/admin";
import { useLanguage } from "@/context/language-context";

export default function AdminAuditPage() {
  const { t } = useLanguage();
  const a = t.adminPages.audit;

  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState(AUDIT_FILTER_ALL);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditLogEntries.filter((row) => {
      const matchType = eventType === AUDIT_FILTER_ALL || row.type === eventType;
      const matchSearch =
        q === "" ||
        row.summary.toLowerCase().includes(q) ||
        row.actor.toLowerCase().includes(q) ||
        row.ip.toLowerCase().includes(q) ||
        row.detail.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [search, eventType]);

  return (
    <AdminAppShell
      pageTitle={a.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Audit" }]}
    >
      <div className="mb-8 animate-fade-up">
        <h2 className="text-[30px] font-bold leading-9 text-[#111827]">{a.heading}</h2>
        <p className="mt-2 text-base leading-6 text-[#6b7280]">{a.subtext}</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <AuditLogFilters
          search={search}
          eventType={eventType}
          onSearchChange={setSearch}
          onTypeChange={setEventType}
        />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <AuditLogTable entries={filtered} />
      </div>
    </AdminAppShell>
  );
}
