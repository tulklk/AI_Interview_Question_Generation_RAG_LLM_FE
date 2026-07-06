"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme, type ThemePreference, type ThemeMode } from "@/shared/providers/theme-context";
import { useThemeTransition } from "@/shared/providers/theme-transition-context";
import { Toggle } from "@/shared/components/ui/toggle";
import { portalCard, portalHeading, portalHeadingAlt, portalInput, portalSubtext, portalSubtextAlt } from "@/shared/utils/portal-ui";

export interface ThemePreferenceLabels {
  light: string;
  dark: string;
  system: string;
  darkMode?: string;
  darkModeDesc?: string;
}

interface ThemePreferencePickerProps {
  variant?: "buttons" | "cards";
  labels: ThemePreferenceLabels;
  showToggle?: boolean;
}

export function ThemePreferencePicker({
  variant = "buttons",
  labels,
  showToggle = false,
}: ThemePreferencePickerProps) {
  const { preference, theme, setPreference } = useTheme();
  const { triggerTransition, isTransitioning } = useThemeTransition();

  function resolveNextTheme(pref: ThemePreference): ThemeMode {
    if (pref === "dark") return "dark";
    if (pref === "light") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function handleSetPreference(id: ThemePreference) {
    const next = resolveNextTheme(id);
    if (next === theme) {
      setPreference(id);
      return;
    }
    triggerTransition(() => setPreference(id), next);
  }

  const options: { id: ThemePreference; label: string; Icon: typeof Sun }[] = [
    { id: "light", label: labels.light, Icon: Sun },
    { id: "dark", label: labels.dark, Icon: Moon },
    { id: "system", label: labels.system, Icon: Monitor },
  ];

  if (variant === "cards") {
    return (
      <div>
        {showToggle && labels.darkMode && (
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={cn("text-sm font-medium", portalHeading)}>{labels.darkMode}</p>
              {labels.darkModeDesc && (
                <p className={cn("text-xs mt-0.5", portalSubtext)}>{labels.darkModeDesc}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
              <Sun size={13} />
              <Toggle
                checked={theme === "dark"}
                onChange={(v) => handleSetPreference(v ? "dark" : "light")}
              />
              <Moon size={13} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {options.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleSetPreference(id)}
              disabled={isTransitioning}
              className={cn(
                "flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-medium transition-colors relative disabled:cursor-not-allowed",
                preference === id
                  ? "border-[#7C3AED] text-[#7C3AED] dark:text-[#a78bff] bg-violet-50 dark:bg-violet-950/40"
                  : cn(portalInput, "hover:border-[#7C3AED]/40 dark:hover:border-[#7C3AED]/40", portalSubtext)
              )}
            >
              <Icon size={14} />
              {label}
              {preference === id && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#7C3AED] dark:bg-[#a78bff]" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleSetPreference(id)}
          disabled={isTransitioning}
          className={cn(
            "flex items-center gap-1.5 h-[34px] px-3.5 text-[12px] font-semibold rounded-lg border transition-all disabled:cursor-not-allowed",
            preference === id
              ? "bg-primary text-white border-primary"
              : cn(portalCard, portalHeadingAlt, "hover:border-primary hover:text-primary")
          )}
        >
          {preference === id && <Check size={12} />}
          {label}
        </button>
      ))}
    </div>
  );
}
