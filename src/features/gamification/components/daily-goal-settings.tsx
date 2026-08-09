"use client";

import { useState } from "react";
import { Zap, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { updateDailyGoal } from "@/features/gamification/api/gamification-api";
import { useUserProgress } from "@/features/gamification/hooks/use-user-progress";
import { DAILY_GOAL_PRESETS } from "@/features/gamification/utils/gamification-formatters";
import type { DailyGoalPreset } from "@/features/gamification/types/gamification.types";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface DailyGoalSettingsProps {
  /** Optional class for the outer wrapper */
  className?: string;
}

export function DailyGoalSettings({ className }: DailyGoalSettingsProps) {
  const { t, lang } = useLanguage();
  const g = t.gamification;
  const { addToast } = useToast();

  const { progress, loading, refresh } = useUserProgress();
  const isVi = lang === "vi";

  const [selected, setSelected] = useState<DailyGoalPreset | null>(null);
  const [saving, setSaving] = useState(false);

  // Derive current value from progress (or selected if user changed)
  const currentGoal = (selected ?? progress?.dailyGoalXp ?? 50) as DailyGoalPreset;

  async function handleSave() {
    if (selected === null) return;
    setSaving(true);
    try {
      await updateDailyGoal(selected);
      addToast("success", g.goalSaved);
      setSelected(null);
      refresh();
    } catch {
      addToast("error", isVi ? "Không thể cập nhật mục tiêu" : "Could not update goal");
    } finally {
      setSaving(false);
    }
  }

  const isDirty = selected !== null && selected !== progress?.dailyGoalXp;

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {g.dailyGoalTitle}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {DAILY_GOAL_PRESETS.map((preset) => {
            const isActive = currentGoal === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => setSelected(preset.value)}
                className={cn(
                  "relative flex flex-col items-start gap-0.5 px-3 py-3 rounded-xl border text-left transition-all",
                  isActive
                    ? "bg-violet-50 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700 ring-1 ring-violet-400/30"
                    : "bg-white dark:bg-gray-900/60 border-gray-200 dark:border-gray-700 hover:border-violet-200 dark:hover:border-violet-800"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Zap
                    size={12}
                    className={cn(
                      "shrink-0",
                      isActive ? "text-violet-600 dark:text-violet-400" : "text-gray-400"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[13px] font-[700] tabular-nums",
                      isActive ? "text-violet-700 dark:text-violet-300" : "text-gray-700 dark:text-gray-200"
                    )}
                  >
                    {preset.value} XP
                  </span>
                  {isActive && (
                    <span className="ml-auto">
                      <Check size={11} className="text-violet-600 dark:text-violet-400" />
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] leading-tight",
                    isActive ? "text-violet-600/80 dark:text-violet-400/80" : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {isVi ? preset.labelVi.replace(/ \(.*\)/, "") : preset.labelEn.replace(/ \(.*\)/, "")}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Save button — only shown when selection differs from current */}
      {isDirty && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 h-9 px-4 text-[13px] font-semibold rounded-lg transition-all",
            "bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60"
          )}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {g.saveGoal}
        </button>
      )}
    </div>
  );
}
