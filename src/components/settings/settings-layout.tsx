"use client";

import { useState, useEffect } from "react";
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
import { portalHeading } from "@/lib/portal-ui";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromHash = () => {
      if (window.location.hash === "#billing") {
        setActiveTab("billing");
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const tabItems: { id: SettingsTab; label: string; Icon: typeof User }[] = [
    { id: "profile", label: tabs.profile, Icon: User },
    { id: "preferences", label: tabs.preferences, Icon: SlidersHorizontal },
    { id: "notifications", label: tabs.notifications, Icon: Bell },
    { id: "security", label: tabs.security, Icon: ShieldCheck },
    { id: "billing", label: tabs.billing, Icon: CreditCard },
  ];

  return (
    <div className="grid grid-cols-[220px_1fr] gap-6 items-start">
      <nav className="hr-glass-card p-2 sticky top-4 animate-slide-left">
        <ul className="space-y-0.5">
          {tabItems.map(({ id, label, Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  if (typeof window === "undefined") return;
                  const base = `${window.location.pathname}${window.location.search}`;
                  if (id === "billing") {
                    window.history.replaceState(null, "", `${base}#billing`);
                  } else {
                    window.history.replaceState(null, "", base);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left",
                  activeTab === id
                    ? "hr-settings-tab-active text-[#7C3AED] dark:text-[#a78bff] font-semibold"
                    : cn(portalHeading, "hover:bg-[rgba(124,58,237,0.05)] dark:hover:bg-[rgba(124,58,237,0.08)] opacity-80 hover:opacity-100")
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                  activeTab === id ? "hr-icon-box" : "bg-gray-100 dark:bg-gray-800"
                )}>
                  <Icon size={13} className={activeTab === id ? "text-[#7C3AED] dark:text-[#a78bff]" : "text-gray-500 dark:text-gray-400"} />
                </div>
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div key={activeTab} className="hr-glass-card p-6 animate-scale-in">
        <TabContent tab={activeTab} />
      </div>
    </div>
  );
}
