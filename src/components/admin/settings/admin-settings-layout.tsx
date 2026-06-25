"use client";

import { useState } from "react";
import { Settings, Bot, ShieldCheck, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { GeneralSettings } from "./general-settings";
import { AiConfigSection } from "./ai-config-section";
import { PermissionsSection } from "./permissions-section";
import { AdminNotificationsSection } from "./admin-notifications-section";
import type { AdminSettingsTab } from "@/types/admin";
import { useLanguage } from "@/context/language-context";

const tabIcons: Record<AdminSettingsTab, typeof Settings> = {
  general: Settings,
  "ai-config": Bot,
  permissions: ShieldCheck,
  notifications: Bell,
};

function TabContent({ tab }: { tab: AdminSettingsTab }) {
  switch (tab) {
    case "general": return <GeneralSettings />;
    case "ai-config": return <AiConfigSection />;
    case "permissions": return <PermissionsSection />;
    case "notifications": return <AdminNotificationsSection />;
  }
}

export function AdminSettingsLayout() {
  const { t } = useLanguage();
  const tabs = t.adminPages.settings.tabs;

  const [activeTab, setActiveTab] = useState<AdminSettingsTab>("general");

  const tabList: { id: AdminSettingsTab; label: string }[] = [
    { id: "general", label: tabs.general },
    { id: "ai-config", label: tabs.aiConfig },
    { id: "permissions", label: tabs.permissions },
    { id: "notifications", label: tabs.notifications },
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="hr-glass-card sticky top-4 animate-slide-left p-2">
        <ul className="space-y-0.5">
          {tabList.map(({ id, label }) => {
            const Icon = tabIcons[id];
            const isActive = activeTab === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left",
                    isActive
                      ? "hr-nav-active text-[#7C3AED] dark:text-[#a78bff] font-semibold"
                      : "text-gray-600 dark:text-gray-400 hover:bg-[rgba(124,58,237,0.06)] dark:hover:bg-[rgba(124,58,237,0.08)] hover:text-charcoal dark:hover:text-gray-100"
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                      isActive
                        ? "hr-icon-box"
                        : "bg-gray-100 dark:bg-gray-800 group-hover:bg-[rgba(124,58,237,0.08)]"
                    )}
                  >
                    <Icon
                      size={15}
                      className={cn(
                        isActive ? "text-[#7C3AED] dark:text-[#a78bff]" : "text-gray-400 dark:text-gray-500"
                      )}
                    />
                  </div>
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div key={activeTab} className="hr-glass-card animate-scale-in p-6">
        <TabContent tab={activeTab} />
      </div>
    </div>
  );
}
