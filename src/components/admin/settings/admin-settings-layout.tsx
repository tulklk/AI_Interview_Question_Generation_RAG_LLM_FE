"use client";

import { useState } from "react";
import { Settings, Bot, ShieldCheck, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { GeneralSettings } from "./general-settings";
import { AiConfigSection } from "./ai-config-section";
import { PermissionsSection } from "./permissions-section";
import { AdminNotificationsSection } from "./admin-notifications-section";
import type { AdminSettingsTab } from "@/types/admin";

const tabs: { id: AdminSettingsTab; label: string; Icon: typeof Settings }[] = [
  { id: "general", label: "General", Icon: Settings },
  { id: "ai-config", label: "AI Configuration", Icon: Bot },
  { id: "permissions", label: "Permissions", Icon: ShieldCheck },
  { id: "notifications", label: "Notifications", Icon: Bell },
];

function TabContent({ tab }: { tab: AdminSettingsTab }) {
  switch (tab) {
    case "general": return <GeneralSettings />;
    case "ai-config": return <AiConfigSection />;
    case "permissions": return <PermissionsSection />;
    case "notifications": return <AdminNotificationsSection />;
  }
}

export function AdminSettingsLayout() {
  const [activeTab, setActiveTab] = useState<AdminSettingsTab>("general");

  return (
    <div className="grid grid-cols-[220px_1fr] gap-6 items-start">
      <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 sticky top-4 animate-slide-left">
        <ul className="space-y-0.5">
          {tabs.map(({ id, label, Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left",
                  activeTab === id
                    ? "bg-[#6c47ff] text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                )}
              >
                <Icon size={16} className="shrink-0" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div key={activeTab} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-scale-in">
        <TabContent tab={activeTab} />
      </div>
    </div>
  );
}
