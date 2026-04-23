"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useLanguage } from "@/context/language-context";

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
      <h3 className="text-base font-semibold text-gray-900 mb-5">{n.title}</h3>

      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{n.event}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">{n.email}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">{n.inApp}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {n.events.map((evt, idx) => (
              <tr key={eventIds[idx]} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <p className="text-sm font-medium text-gray-800">{evt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{evt.desc}</p>
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
