"use client";

import { useState } from "react";
import { User, Settings, ShieldCheck, Shield, Check, ChevronRight, Zap, CreditCard } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { ThemePreferencePicker } from "@/shared/components/common/theme-preference-picker";
import { Toggle } from "@/shared/components/ui/toggle";
import { SecuritySection } from "@/features/settings/components/security-section";
import { CandidateProfile } from "@/features/candidate/components/profile/candidate-profile";
import { CandidateBillingPage } from "@/features/candidate/components/billing/candidate-billing-page";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

type Tab = "profile" | "general" | "security" | "privacy" | "billing";

const LANGUAGES = [
  { label: "English", value: "en" as const },
  { label: "Tiếng Việt", value: "vi" as const },
];

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-lg border transition-all",
        active
          ? "bg-primary text-white border-primary"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary"
      )}
    >
      {active && <Check size={13} />}
      {children}
    </button>
  );
}

export function SettingsPage() {
  const { t, lang, setLang } = useLanguage();
  const p = t.jobseekerSettingsPage;
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [notifications, setNotifications] = useState({ email: true, practice: true, tips: false });

  const iconBg = "bg-gray-100 dark:bg-gray-800 shadow-sm ring-1 ring-black/5 dark:ring-white/10";
  const iconColor = "text-gray-900 dark:text-gray-100";

  const tabs: { id: Tab; Icon: typeof User; iconBg: string; iconColor: string; label: string }[] = [
    { id: "profile",  Icon: User,       iconBg, iconColor, label: "Profile" },
    { id: "general",  Icon: Settings,   iconBg, iconColor, label: p.generalTitle },
    { id: "security", Icon: ShieldCheck, iconBg, iconColor, label: "Security" },
    { id: "privacy",  Icon: Shield,     iconBg, iconColor, label: p.privacyTitle },
    { id: "billing",  Icon: CreditCard, iconBg, iconColor, label: p.billing.title },
  ];

  const active = tabs.find((t) => t.id === activeTab)!;

  const sectionSubtitle: Record<Tab, string> = {
    profile:  "Manage your personal information and career details",
    general:  p.generalDescription,
    security: "Change your password and manage account security",
    privacy:  p.privacyDescription,
    billing:  p.billing.subtitle,
  };

  const isFullWidth = activeTab === "profile" || activeTab === "billing";

  return (
    <div className="flex flex-col md:grid md:grid-cols-[220px_1fr] gap-4 md:gap-6 items-start">

      {/* ── Sidebar nav ───────────────────────────────────────────────────────── */}
      <nav className="w-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-1.5 md:p-2 md:sticky md:top-4">

        {/* Mobile: icon tabs */}
        <ul className="flex md:hidden overflow-x-auto">
          {tabs.map(({ id, Icon, iconBg, iconColor, label }) => {
            const isActive = activeTab === id;
            return (
              <li key={id} className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveTab(id)}
                  title={label}
                  className={cn(
                    "w-full flex flex-col items-center justify-center gap-1 py-2 px-0.5 rounded-xl transition-colors",
                    isActive ? "bg-violet-50 dark:bg-violet-950/40" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center transition-colors", isActive ? iconBg : "bg-gray-100 dark:bg-gray-800")}>
                    <Icon size={12} className={isActive ? iconColor : "text-gray-400 dark:text-gray-500"} />
                  </div>
                  <span className={cn("text-[9px] font-medium leading-tight truncate w-full text-center", isActive ? "text-[#7C3AED] dark:text-[#a78bff]" : "text-gray-400 dark:text-gray-500")}>
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Desktop: vertical nav */}
        <ul className="hidden md:flex md:flex-col gap-0.5">
          {tabs.map(({ id, Icon, iconBg, iconColor, label }) => {
            const isActive = activeTab === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                    isActive
                      ? "bg-violet-50 dark:bg-violet-950/40 text-[#7C3AED] dark:text-[#a78bff] font-semibold"
                      : cn(portalHeading, "hover:bg-gray-50 dark:hover:bg-gray-800 opacity-80 hover:opacity-100")
                  )}
                >
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors", isActive ? iconBg : "bg-gray-100 dark:bg-gray-800")}>
                    <Icon size={13} className={isActive ? iconColor : "text-gray-500 dark:text-gray-400"} />
                  </div>
                  {label}
                </button>
              </li>
            );
          })}

          {/* Plan badge in sidebar */}
          <li className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setActiveTab("billing")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", iconBg)}>
                <CreditCard size={12} className={iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-semibold", portalHeading)}>{p.billing.freeBadge}</p>
                <p className="text-[10px] font-semibold text-[#7C3AED] dark:text-[#a78bff]">
                  {p.billing.upgradeBtn} →
                </p>
              </div>
            </button>
          </li>
        </ul>
      </nav>

      {/* ── Content panel ─────────────────────────────────────────────────────── */}
      {isFullWidth ? (
        <div key={activeTab} className="animate-scale-in min-w-0 w-full">
          {activeTab === "profile" ? <CandidateProfile /> : <CandidateBillingPage />}
        </div>
      ) : (
        <div
          key={activeTab}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 md:p-6 animate-scale-in min-w-0 w-full"
        >
          {/* Section header */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-200 dark:border-gray-800">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", active.iconBg)}>
              <active.Icon size={16} className={active.iconColor} />
            </div>
            <div>
              <h3 className={cn("text-base font-semibold", portalHeading)}>{active.label}</h3>
              <p className={cn("text-xs mt-0.5", portalSubtext)}>{sectionSubtitle[activeTab]}</p>
            </div>
          </div>

          {/* General — Language + Appearance + Notifications */}
          {activeTab === "general" && (
            <div className="space-y-6">
              {/* Language */}
              <div>
                <p className={cn("text-xs font-semibold uppercase tracking-wide mb-3", portalSubtext)}>
                  {p.languageTitle}
                </p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(({ label, value }) => (
                    <ChoiceButton key={value} active={lang === value} onClick={() => setLang(value)}>
                      {label}
                    </ChoiceButton>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800" />

              {/* Appearance */}
              <div>
                <p className={cn("text-xs font-semibold uppercase tracking-wide mb-3", portalSubtext)}>
                  {p.appearanceTitle}
                </p>
                <ThemePreferencePicker
                  variant="buttons"
                  labels={{ light: p.themeLight, dark: p.themeDark, system: p.themeSystem }}
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800" />

              {/* Notifications */}
              <div>
                <p className={cn("text-xs font-semibold uppercase tracking-wide mb-3", portalSubtext)}>
                  {p.notificationsTitle}
                </p>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 overflow-hidden">
                  {([
                    { key: "email",    label: p.notificationLabels.email },
                    { key: "practice", label: p.notificationLabels.practice },
                    { key: "tips",     label: p.notificationLabels.tips },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <span className={cn("text-sm", portalHeading)}>{label}</span>
                      <Toggle
                        checked={notifications[key]}
                        onChange={(checked) => setNotifications((prev) => ({ ...prev, [key]: checked }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === "security" && <SecuritySection />}

          {/* Privacy */}
          {activeTab === "privacy" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 overflow-hidden">
                {[p.privacyActions.downloadData, p.privacyActions.deleteHistory].map((action) => (
                  <button
                    key={action}
                    type="button"
                    className={cn("flex items-center justify-between w-full gap-3 px-4 py-4 text-sm text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50", portalHeading)}
                  >
                    <span>{action}</span>
                    <ChevronRight size={15} className="text-gray-400 dark:text-gray-500 shrink-0" />
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-red-200 dark:border-red-900/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900/50">
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <Zap size={12} />
                    Danger Zone
                  </p>
                </div>
                <button
                  type="button"
                  className="flex items-center justify-between w-full gap-3 px-4 py-4 text-sm text-left transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <span>{p.privacyActions.deleteAccount}</span>
                  <ChevronRight size={15} className="shrink-0" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
