"use client";

import { useState } from "react";
import {
  User,
  SlidersHorizontal,
  Bell,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileSection } from "./profile-section";
import { PreferencesSection } from "./preferences-section";
import { NotificationsSection } from "./notifications-section";
import { SecuritySection } from "./security-section";
import { BillingSection } from "./billing-section";
import type { SettingsTab } from "@/types/settings";
import { useLanguage } from "@/context/language-context";

function TabContent({ tab }: { tab: SettingsTab }) {
  switch (tab) {
    case "profile":
      return <ProfileSection />;
    case "preferences":
      return <PreferencesSection />;
    case "notifications":
      return <NotificationsSection />;
    case "security":
      return <SecuritySection />;
    case "billing":
      return <BillingSection />;
  }
}

export function SettingsLayout() {
  const { t } = useLanguage();
  const tabs = t.settingsPage.tabs;
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const tabItems: { id: SettingsTab; label: string; Icon: typeof User }[] = [
    { id: "profile", label: tabs.profile, Icon: User },
    { id: "preferences", label: tabs.preferences, Icon: SlidersHorizontal },
    { id: "notifications", label: tabs.notifications, Icon: Bell },
    { id: "security", label: tabs.security, Icon: ShieldCheck },
    { id: "billing", label: tabs.billing, Icon: CreditCard },
  ];

  return (
    <div className="grid grid-cols-[220px_1fr] gap-6 items-start">
      <nav className="bg-white rounded-xl border border-gray-100 shadow-sm p-2 sticky top-4 animate-slide-left">
        <ul className="space-y-0.5">
          {tabItems.map(({ id, label, Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
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

      <div key={activeTab} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-scale-in">
        <TabContent tab={activeTab} />
      </div>
    </div>
  );
}
