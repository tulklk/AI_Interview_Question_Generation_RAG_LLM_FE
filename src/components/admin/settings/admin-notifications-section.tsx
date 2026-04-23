"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  system: boolean;
}

const initialSettings: NotificationSetting[] = [
  { id: "new_user", label: "New User Registration", description: "When a new account is created", email: true, system: true },
  { id: "jd_generation", label: "JD Generation", description: "When questions are generated", email: false, system: true },
  { id: "export", label: "Session Export", description: "When a session is exported", email: false, system: false },
  { id: "login_alert", label: "Suspicious Login", description: "Unusual login activity detected", email: true, system: true },
  { id: "quota_warning", label: "Quota Warning", description: "User approaching daily JD limit", email: true, system: true },
  { id: "system_error", label: "System Errors", description: "Critical platform errors", email: true, system: true },
];

export function AdminNotificationsSection() {
  const [settings, setSettings] = useState(initialSettings);

  function toggle(id: string, channel: "email" | "system") {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [channel]: !s[channel] } : s))
    );
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">Notification Settings</h3>

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">In-App</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {settings.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <p className="text-sm font-medium text-gray-800">{s.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-center">
                    <Toggle checked={s.email} onChange={() => toggle(s.id, "email")} />
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-center">
                    <Toggle checked={s.system} onChange={() => toggle(s.id, "system")} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="mt-5 w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
        <Save size={14} />
        Save Notifications
      </button>
    </div>
  );
}
