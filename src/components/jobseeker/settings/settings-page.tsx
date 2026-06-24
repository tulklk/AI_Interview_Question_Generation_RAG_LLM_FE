"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Globe, Shield, Moon, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { ThemePreferencePicker } from "@/components/shared/theme-preference-picker";
import { SectionCard } from "@/components/jobseeker/ui/section-card";
import { Toggle } from "@/components/ui/toggle";
import {
  portalCard,
  portalDivider,
  portalHeadingAlt,
  portalSubtextAlt,
} from "@/lib/portal-ui";

const LANGUAGES = ["English", "Tiếng Việt"];

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
          : cn(portalCard, portalHeadingAlt, "hover:border-primary hover:text-primary")
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

  const sections = [
    {
      icon: Globe,
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      iconColor: "text-blue-500 dark:text-blue-400",
      title: p.languageTitle,
      content: (
        <div className="flex flex-col gap-3">
          <p className={cn("text-[13px]", portalSubtextAlt)}>{p.languageDescription}</p>
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
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
      iconColor: "text-violet-500 dark:text-violet-400",
      title: p.appearanceTitle,
      content: (
        <div className="flex flex-col gap-3">
          <p className={cn("text-[13px]", portalSubtextAlt)}>{p.appearanceDescription}</p>
          <ThemePreferencePicker
            variant="buttons"
            labels={{
              light: p.themeLight,
              dark: p.themeDark,
              system: p.themeSystem,
            }}
          />
        </div>
      ),
    },
    {
      icon: Bell,
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      iconColor: "text-amber-500 dark:text-amber-400",
      title: p.notificationsTitle,
      content: (
        <div className="flex flex-col gap-3">
          <p className={cn("text-[13px]", portalSubtextAlt)}>{p.notificationsDescription}</p>
          <div className={cn("rounded-lg border divide-y", portalDivider)}>
            {([
              { key: "email", label: p.notificationLabels.email },
              { key: "practice", label: p.notificationLabels.practice },
              { key: "tips", label: p.notificationLabels.tips },
            ] as const).map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 px-3 py-3"
              >
                <span className={cn("text-[13px] leading-snug", portalHeadingAlt)}>{label}</span>
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
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      iconColor: "text-emerald-500 dark:text-emerald-400",
      title: p.privacyTitle,
      content: (
        <div className="flex flex-col gap-3">
          <p className={cn("text-[13px]", portalSubtextAlt)}>{p.privacyDescription}</p>
          <div className={cn("rounded-lg border divide-y", portalDivider)}>
            {[p.privacyActions.downloadData, p.privacyActions.deleteHistory, p.privacyActions.deleteAccount].map(
              (action) => (
                <button
                  key={action}
                  type="button"
                  className={cn(
                    "hr-table-row flex items-center justify-between w-full gap-3 px-3 py-3 text-[13px] hover:text-gray-900 dark:hover:text-gray-100",
                    portalSubtextAlt
                  )}
                >
                  <span className="text-left">{action}</span>
                  <ChevronRight size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
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
        <h1 className={cn("text-[28px] font-[800]", portalHeadingAlt)}>{p.heading}</h1>
        <p className={cn("text-[14px] mt-1", portalSubtextAlt)}>{p.subtitle}</p>
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
