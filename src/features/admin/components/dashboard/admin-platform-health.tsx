"use client";

import { Activity, HelpCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";

export function AdminPlatformHealth() {
  const { t } = useLanguage();
  const h = t.adminPages.dashboard.health;

  const services = [
    { label: h.apiService },
    { label: h.database },
    { label: h.aiEngine },
    { label: h.storage },
  ];

  return (
    <div className="hr-glass-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <Activity size={14} className="text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h2 className={cn("text-sm font-bold leading-tight", portalHeadingAlt)}>{h.title}</h2>
            <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{h.subtitle}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 self-start sm:self-auto shrink-0">
          <HelpCircle size={10} />
          {h.pending}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {services.map((svc) => (
          <div
            key={svc.label}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
            <p className={cn("text-[11px] font-medium text-center", portalHeadingAlt)}>{svc.label}</p>
            <p className={cn("text-[10px]", portalSubtextAlt)}>{h.statusUnknown}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
