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

const tabs: {
  id: SettingsTab;
  label: string;
  Icon: typeof User;
}[] = [
  { id: "profile", label: "Profile", Icon: User },
  { id: "preferences", label: "Preferences", Icon: SlidersHorizontal },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "security", label: "Security", Icon: ShieldCheck },
  { id: "billing", label: "Billing", Icon: CreditCard },
];

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <div className="grid grid-cols-[220px_1fr] gap-6 items-start">
      <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 sticky top-4">
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <TabContent tab={activeTab} />
      </div>
    </div>
  );
}
