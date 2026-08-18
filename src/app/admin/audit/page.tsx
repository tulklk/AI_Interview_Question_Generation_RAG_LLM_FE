"use client";

import { useMemo, useState } from "react";
import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AuditLogFilters, AUDIT_FILTER_ALL } from "@/features/admin/components/audit/audit-log-filters";
import { AuditLogTable } from "@/features/admin/components/audit/audit-log-table";
import { auditLogEntries } from "@/features/admin/data/admin";
import { ScrollText } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { AdminPageHeader } from "@/features/admin/components/layout/admin-page-header";

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
      <AdminPageHeader heading={a.heading} subtext={a.subtext} icon={ScrollText} />

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
