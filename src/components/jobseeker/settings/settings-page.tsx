"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Globe, Shield, Moon, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { SectionCard } from "@/components/jobseeker/ui/section-card";
import { Toggle } from "@/components/ui/toggle";

const LANGUAGES = ["English", "Tiếng Việt"];
const THEMES = ["Light", "Dark", "System"];

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 h-[34px] px-3.5 text-[12px] font-[600] rounded-lg border transition-all",
        active
          ? "bg-primary text-white border-primary"
          : "bg-white text-[#111827] border-[#E5E7EB] hover:border-primary hover:text-primary"
      )}
    >
      {active && <Check size={12} />}
      {children}
    </button>
  );
}

export function SettingsPage() {
  const { t, lang, setLang } = useLanguage();
  const p = t.jobseekerSettingsPage;
  const [notifications, setNotifications] = useState({ email: true, practice: true, tips: false });
  const [theme, setTheme] = useState("Light");

  const sections = [
    {
      icon: Globe,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      title: p.languageTitle,
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[#6B7280]">{p.languageDescription}</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((label) => {
              const val = label === "English" ? "en" : "vi";
              return (
                <ChoiceButton key={label} active={lang === val} onClick={() => setLang(val as "en" | "vi")}>
                  {label}
                </ChoiceButton>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      icon: Moon,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
      title: p.appearanceTitle,
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[#6B7280]">{p.appearanceDescription}</p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((th) => (
              <ChoiceButton key={th} active={theme === th} onClick={() => setTheme(th)}>
                {th}
              </ChoiceButton>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: Bell,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      title: p.notificationsTitle,
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[#6B7280]">{p.notificationsDescription}</p>
          <div className="rounded-lg border border-gray-100 divide-y divide-gray-100">
            {([
              { key: "email", label: p.notificationLabels.email },
              { key: "practice", label: p.notificationLabels.practice },
              { key: "tips", label: p.notificationLabels.tips },
            ] as const).map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 px-3 py-3"
              >
                <span className="text-[13px] text-[#111827] leading-snug">{label}</span>
                <Toggle
                  checked={notifications[key]}
                  onChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: Shield,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      title: p.privacyTitle,
      content: (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-[#6B7280]">{p.privacyDescription}</p>
          <div className="rounded-lg border border-gray-100 divide-y divide-gray-100">
            {[p.privacyActions.downloadData, p.privacyActions.deleteHistory, p.privacyActions.deleteAccount].map(
              (action) => (
                <button
                  key={action}
                  type="button"
                  className="flex items-center justify-between w-full gap-3 px-3 py-3 text-[13px] text-[#6B7280] hover:text-[#111827] hover:bg-gray-50/80 transition-colors"
                >
                  <span className="text-left">{action}</span>
                  <ChevronRight size={14} className="text-gray-400 shrink-0" />
                </button>
              )
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-[28px] font-[800] text-[#111827]">{p.heading}</h1>
        <p className="text-[14px] text-[#6B7280] mt-1">{p.subtitle}</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="min-w-0"
          >
            <SectionCard
              title={section.title}
              icon={section.icon}
              iconBg={section.iconBg}
              iconColor={section.iconColor}
            >
              {section.content}
            </SectionCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
