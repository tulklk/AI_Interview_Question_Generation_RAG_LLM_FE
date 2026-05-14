"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Globe, Shield, Moon, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";

const LANGUAGES = ["English", "Tiếng Việt"];
const THEMES = ["Light", "Dark", "System"];

export function SettingsPage() {
  const { lang, setLang } = useLanguage();
  const [notifications, setNotifications] = useState({ email: true, practice: true, tips: false });
  const [theme, setTheme] = useState("Light");

  const sections = [
    {
      icon: Globe,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      title: "Language",
      description: "Choose your preferred display language",
      content: (
        <div className="flex gap-2">
          {LANGUAGES.map((label) => {
            const val = label === "English" ? "en" : "vi";
            const active = lang === val;
            return (
              <button
                key={label}
                onClick={() => setLang(val as "en" | "vi")}
                className={cn(
                  "flex items-center gap-2 h-[36px] px-4 text-[13px] font-[600] rounded-lg border transition-all",
                  active
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-[#111827] border-[#E5E7EB] hover:border-primary hover:text-primary"
                )}
              >
                {active && <Check size={13} />}
                {label}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      icon: Moon,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
      title: "Appearance",
      description: "Customize the look of the interface",
      content: (
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "flex items-center gap-2 h-[36px] px-4 text-[13px] font-[600] rounded-lg border transition-all",
                theme === t
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-[#111827] border-[#E5E7EB] hover:border-primary hover:text-primary"
              )}
            >
              {theme === t && <Check size={13} />}
              {t}
            </button>
          ))}
        </div>
      ),
    },
    {
      icon: Bell,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      title: "Notifications",
      description: "Manage how you receive updates",
      content: (
        <div className="flex flex-col gap-3">
          {([
            { key: "email", label: "Email reminders for practice streaks" },
            { key: "practice", label: "Weekly progress summaries" },
            { key: "tips", label: "AI interview tips and insights" },
          ] as const).map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-[13px] text-[#111827]">{label}</span>
              <button
                onClick={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={cn(
                  "w-10 h-6 rounded-full transition-colors relative",
                  notifications[key] ? "bg-primary" : "bg-gray-200"
                )}
              >
                <span className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  notifications[key] ? "translate-x-5" : "translate-x-1"
                )} />
              </button>
            </label>
          ))}
        </div>
      ),
    },
    {
      icon: Shield,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      title: "Privacy & Data",
      description: "Control how your data is used",
      content: (
        <div className="flex flex-col gap-2">
          {["Download my data", "Delete practice history", "Delete account"].map((action) => (
            <button
              key={action}
              className="flex items-center justify-between w-full text-[13px] text-[#6B7280] hover:text-[#111827] py-2 transition-colors"
            >
              {action}
              <ChevronRight size={14} className="text-gray-400" />
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-[680px]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-[28px] font-[800] text-[#111827]">Settings</h1>
        <p className="text-[14px] text-[#6B7280] mt-1">Manage your account preferences and privacy</p>
      </motion.div>

      <div className="flex flex-col gap-4">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white rounded-xl p-6"
            style={{ boxShadow: "rgba(0,0,0,0.08) 0px 4px 6px -1px, rgba(0,0,0,0.06) 0px 2px 4px -2px" }}
          >
            <div className="flex items-start gap-4">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", section.iconBg)}>
                <section.icon size={16} className={section.iconColor} />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-[700] text-[#111827] mb-0.5">{section.title}</h3>
                <p className="text-[13px] text-[#6B7280] mb-4">{section.description}</p>
                {section.content}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
