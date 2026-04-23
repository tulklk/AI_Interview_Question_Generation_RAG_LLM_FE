"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { defaultNotificationPrefs } from "@/data/settings";
import type { NotificationPref } from "@/types/settings";
import { useLanguage } from "@/context/language-context";

export function NotificationsSection() {
  const { t } = useLanguage();
  const notif = t.settingsPage.notifications;
  const [prefs, setPrefs] = useState<NotificationPref[]>(defaultNotificationPrefs);

  function toggle(id: string) {
    setPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">{notif.title}</h3>

      <div className="space-y-4">
        {prefs.map((pref) => (
          <div key={pref.id} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-800">{pref.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{pref.description}</p>
            </div>
            <Toggle
              checked={pref.enabled}
              onChange={() => toggle(pref.id)}
            />
          </div>
        ))}
      </div>

      <button className="mt-6 w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
        <Save size={14} />
        {notif.save}
      </button>
    </div>
  );
}
