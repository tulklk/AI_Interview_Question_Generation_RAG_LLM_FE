"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useTheme } from "@/shared/providers/theme-context";
import { useThemeTransition } from "@/shared/providers/theme-transition-context";

interface ThemeToggleProps {
  variant?: "ghost" | "light";
  className?: string;
}

export function ThemeToggle({ variant = "ghost", className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { triggerTransition, isTransitioning } = useThemeTransition();
  const { t } = useLanguage();
  const isDark = theme === "dark";
  const label = isDark ? t.common.switchToLight : t.common.switchToDark;

  function handleClick() {
    triggerTransition(toggleTheme, isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isTransitioning}
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
        variant === "ghost"
          ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
          : "text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:border-gray-300 shadow-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white dark:hover:border-gray-600",
        className
      )}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
