"use client";

import { useState, useEffect } from "react";
import {
  User,
  SlidersHorizontal,
  Bell,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ProfileSection } from "./profile-section";
import { PreferencesSection } from "./preferences-section";
import { NotificationsSection } from "./notifications-section";
import { SecuritySection } from "./security-section";
import { BillingSection } from "./billing-section";
import type { SettingsTab } from "@/features/settings/types/settings";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeading } from "@/shared/utils/portal-ui";

function TabContent({ tab }: { tab: SettingsTab }) {
  switch (tab) {
    case "profile":       return <ProfileSection />;
    case "preferences":   return <PreferencesSection />;
    case "notifications": return <NotificationsSection />;
    case "security":      return <SecuritySection />;
    case "billing":       return <BillingSection />;
  }
}

export function SettingsLayout() {
  const { t } = useLanguage();
  const tabs = t.settingsPage.tabs;
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromHash = () => {
      if (window.location.hash === "#billing") setActiveTab("billing");
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const tabItems: { id: SettingsTab; label: string; Icon: typeof User }[] = [
    { id: "profile",       label: tabs.profile,       Icon: User },
    { id: "preferences",   label: tabs.preferences,   Icon: SlidersHorizontal },
    { id: "notifications", label: tabs.notifications, Icon: Bell },
    { id: "security",      label: tabs.security,      Icon: ShieldCheck },
    { id: "billing",       label: tabs.billing,       Icon: CreditCard },
  ];

  function handleTabClick(id: SettingsTab) {
    setActiveTab(id);
    if (typeof window === "undefined") return;
    const base = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, "", id === "billing" ? `${base}#billing` : base);
  }

  return (
    <div className="flex flex-col md:grid md:grid-cols-[220px_1fr] gap-4 md:gap-6 items-start">
      {/* Tab nav */}
      <nav className="w-full hr-glass-card p-1.5 md:p-2 md:sticky md:top-4 animate-slide-left">

        {/* Mobile: 5 equal-width icon tabs — no scroll, no layout shift */}
        <ul className="flex md:hidden">
          {tabItems.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <li key={id} className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => handleTabClick(id)}
                  title={label}
                  className={cn(
                    "w-full flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl transition-colors duration-200",
                    isActive
                      ? "hr-settings-tab-active"
                      : "hover:bg-[rgba(124,58,237,0.05)] dark:hover:bg-[rgba(124,58,237,0.08)]"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200",
                    isActive ? "hr-icon-box" : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <Icon
                      size={14}
                      className={isActive ? "text-[#7C3AED] dark:text-[#a78bff]" : "text-gray-400 dark:text-gray-500"}
                    />
                  </div>
                  <span className={cn(
                    "text-[9px] font-medium leading-tight truncate w-full text-center",
                    isActive ? "text-[#7C3AED] dark:text-[#a78bff]" : "text-gray-400 dark:text-gray-500"
                  )}>
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Desktop: full vertical nav */}
        <ul className="hidden md:flex md:flex-col gap-1">
          {tabItems.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => handleTabClick(id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left",
                    isActive
                      ? "hr-settings-tab-active text-[#7C3AED] dark:text-[#a78bff] font-semibold"
                      : cn(portalHeading, "hover:bg-[rgba(124,58,237,0.05)] dark:hover:bg-[rgba(124,58,237,0.08)] opacity-80 hover:opacity-100")
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                    isActive ? "hr-icon-box" : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    <Icon
                      size={13}
                      className={isActive ? "text-[#7C3AED] dark:text-[#a78bff]" : "text-gray-500 dark:text-gray-400"}
                    />
                  </div>
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Content panel */}
      <div key={activeTab} className="hr-glass-card p-4 md:p-6 animate-scale-in min-w-0 w-full">
        <TabContent tab={activeTab} />
      </div>
    </div>
  );
}
