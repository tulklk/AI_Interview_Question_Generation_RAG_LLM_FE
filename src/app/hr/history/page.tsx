"use client";

import { useState } from "react";
import { Bookmark, List } from "lucide-react";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { HistoryStats } from "@/features/interview/components/history/history-stats";
import { HistoryFilters } from "@/features/interview/components/history/history-filters";
import { HistoryTable } from "@/features/interview/components/history/history-table";
import { SavedQuestionSetsList } from "@/features/interview/components/history/saved-question-sets-list";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

type Tab = "all" | "saved";

export default function HrHistoryPage() {
  const { t } = useLanguage();
  const hp = t.historyPage;

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("");
  const [experience, setExperience] = useState("");
  const [status, setStatus] = useState("");
  const [publishStatus, setPublishStatus] = useState("");

  return (
    <AppShell
      pageTitle={hp.heading}
      breadcrumb={[{ label: "HR", href: "/hr/dashboard" }, { label: hp.heading }]}
    >
      <div className="mb-6 animate-fade-up flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className={cn("text-2xl font-bold", portalHeading)}>{hp.heading}</h2>
          <p className={cn("text-sm mt-1", portalSubtext)}>{hp.subtext}</p>
        </div>
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              tab === "all"
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <List size={13} /> {hp.tabs.all}
          </button>
          <button
            type="button"
            onClick={() => setTab("saved")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              tab === "saved"
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <Bookmark size={13} /> {hp.tabs.saved}
          </button>
        </div>
      </div>

      {tab === "all" ? (
        <>
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
            publishStatus={publishStatus}
            onPublishStatusChange={setPublishStatus}
          />
          <HistoryTable search={search} role={role} level={level} experience={experience} status={status} publishStatus={publishStatus} />
        </>
      ) : (
        <SavedQuestionSetsList />
      )}
    </AppShell>
  );
}
