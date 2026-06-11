"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { portalDivider, portalHeading, portalSubtext, portalTableRow } from "@/lib/portal-ui";

const eventIds = ["new_user", "jd_generation", "export", "login_alert", "quota_warning", "system_error"];

interface NotificationState {
  email: boolean;
  system: boolean;
}

const initialStates: NotificationState[] = [
  { email: true, system: true },
  { email: false, system: true },
  { email: false, system: false },
  { email: true, system: true },
  { email: true, system: true },
  { email: true, system: true },
];

export function AdminNotificationsSection() {
  const { t } = useLanguage();
  const n = t.adminPages.settings.notifications;

  const [settings, setSettings] = useState<NotificationState[]>(initialStates);

  function toggle(idx: number, channel: "email" | "system") {
    setSettings((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [channel]: !s[channel] } : s))
    );
  }

  return (
    <div>
      <h3 className={cn("text-base font-semibold mb-5", portalHeading)}>{n.title}</h3>

      <div className={cn("overflow-hidden rounded-lg border", portalDivider)}>
        <table className="w-full text-sm">
          <thead className={cn("bg-gray-50 dark:bg-gray-800/50 border-b", portalDivider)}>
            <tr>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{n.event}</th>
              <th className={cn("px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{n.email}</th>
              <th className={cn("px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide", portalSubtext)}>{n.inApp}</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y", portalDivider)}>
            {n.events.map((evt, idx) => (
              <tr key={eventIds[idx]} className={cn("transition-colors", portalTableRow)}>
                <td className="px-4 py-3.5">
                  <p className={cn("text-sm font-medium", portalHeading)}>{evt.label}</p>
                  <p className={cn("text-xs mt-0.5", portalSubtext)}>{evt.desc}</p>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-center">
                    <Toggle checked={settings[idx].email} onChange={() => toggle(idx, "email")} />
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-center">
                    <Toggle checked={settings[idx].system} onChange={() => toggle(idx, "system")} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="mt-5 w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
        <Save size={14} />
        {n.saveBtn}
      </button>
    </div>
  );
}
