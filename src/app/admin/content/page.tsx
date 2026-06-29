"use client";

import { useMemo, useState, useCallback } from "react";
import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { ContentFilters } from "@/features/admin/components/content/content-filters";
import { ContentTable } from "@/features/admin/components/content/content-table";
import { contentSessions } from "@/features/admin/data/admin";
import type { ContentSession } from "@/features/admin/types/admin";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

function matchesDateRange(
  daysAgo: number,
  dateRange: string,
  labels: {
    allTime: string;
    today: string;
    thisWeek: string;
    thisMonth: string;
    last3Months: string;
  }
): boolean {
  if (dateRange === labels.allTime) return true;
  if (dateRange === labels.today) return daysAgo === 0;
  if (dateRange === labels.thisWeek) return daysAgo <= 7;
  if (dateRange === labels.thisMonth) return daysAgo <= 30;
  if (dateRange === labels.last3Months) return daysAgo <= 90;
  return true;
}

function escapeCsv(cell: string | number | boolean): string {
  const s = String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function sessionsToCsv(rows: ContentSession[], headers: string[]): string {
  const lines = [headers.join(",")];
  for (const s of rows) {
    lines.push(
      [
        escapeCsv(s.id),
        escapeCsv(s.jobTitle),
        escapeCsv(s.recruiter),
        escapeCsv(s.recruiterEmail),
        escapeCsv(s.role),
        escapeCsv(s.date),
        escapeCsv(s.daysAgo),
        escapeCsv(s.questionsCount),
        escapeCsv(s.exported),
      ].join(",")
    );
  }
  return lines.join("\r\n");
}

function downloadTextFile(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GeneratedContentPage() {
  const { t } = useLanguage();
  const c = t.adminPages.content;
  const f = c.filters;

  const [search, setSearch] = useState("");
  const [role, setRole] = useState(f.allRoles);
  const [dateRange, setDateRange] = useState(f.allTime);

  const filtered = useMemo(
    () =>
      contentSessions.filter((s) => {
        const matchSearch =
          search === "" ||
          s.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
          s.recruiter.toLowerCase().includes(search.toLowerCase());
        const matchRole = role === f.allRoles || s.role === role;
        const matchDate = matchesDateRange(s.daysAgo, dateRange, {
          allTime: f.allTime,
          today: f.today,
          thisWeek: f.thisWeek,
          thisMonth: f.thisMonth,
          last3Months: f.last3Months,
        });
        return matchSearch && matchRole && matchDate;
      }),
    [search, role, dateRange, f]
  );

  const handleExportAll = useCallback(() => {
    const headers = [
      "id",
      "jobTitle",
      "recruiter",
      "recruiterEmail",
      "role",
      "date",
      "daysAgo",
      "questionsCount",
      "exported",
    ];
    const csv = sessionsToCsv(filtered, headers);
    downloadTextFile(`hiregen-sessions-${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
  }, [filtered]);

  return (
    <AdminAppShell
      pageTitle={c.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: c.heading }]}
    >
      <div className="mb-8 animate-fade-up">
        <h2 className={cn("text-[30px] font-bold leading-9", portalHeadingAlt)}>{c.heading}</h2>
        <p className={cn("mt-2 text-base leading-6", portalSubtextAlt)}>{c.subtext}</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <ContentFilters
          search={search}
          role={role}
          dateRange={dateRange}
          onSearchChange={setSearch}
          onRoleChange={setRole}
          onDateRangeChange={setDateRange}
          onExportAll={handleExportAll}
        />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <ContentTable sessions={filtered} />
      </div>
    </AdminAppShell>
  );
}
