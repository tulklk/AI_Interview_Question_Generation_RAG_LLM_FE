"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { defaultNotificationPrefs } from "@/data/settings";
import type { NotificationPref } from "@/types/settings";
import { useLanguage } from "@/context/language-context";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";

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
      <h3 className={cn("text-base font-semibold mb-5", portalHeading)}>{notif.title}</h3>

      <div className="space-y-4">
        {prefs.map((pref) => (
          <div key={pref.id} className="flex items-start justify-between gap-4">
            <div>
              <p className={cn("text-sm font-medium", portalHeading)}>{pref.label}</p>
              <p className={cn("text-xs mt-0.5", portalSubtext)}>{pref.description}</p>
            </div>
            <Toggle
              checked={pref.enabled}
              onChange={() => toggle(pref.id)}
            />
          </div>
        ))}
      </div>

      <button className="shimmer-button mt-6 w-full flex items-center justify-center gap-2 hr-cta-btn text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
        <Save size={14} />
        {notif.save}
      </button>
    </div>
  );
}
