"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { HistoryStats } from "@/components/history/history-stats";
import { HistoryFilters } from "@/components/history/history-filters";
import { HistoryTable } from "@/components/history/history-table";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";

export default function HrHistoryPage() {
  const { t } = useLanguage();
  const hp = t.historyPage;

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("");
  const [experience, setExperience] = useState("");
  const [status, setStatus] = useState("");

  return (
    <AppShell
      pageTitle={hp.heading}
      breadcrumb={[{ label: "HR", href: "/hr/dashboard" }, { label: hp.heading }]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className={cn("text-2xl font-bold", portalHeading)}>{hp.heading}</h2>
        <p className={cn("text-sm mt-1", portalSubtext)}>{hp.subtext}</p>
      </div>

      <HistoryStats />
      <HistoryFilters
        search={search}
        onSearchChange={setSearch}
        role={role}
        onRoleChange={setRole}
        level={level}
        onLevelChange={setLevel}
        experience={experience}
        onExperienceChange={setExperience}
        status={status}
        onStatusChange={setStatus}
      />
      <HistoryTable search={search} role={role} level={level} experience={experience} status={status} />
    </AppShell>
  );
}
