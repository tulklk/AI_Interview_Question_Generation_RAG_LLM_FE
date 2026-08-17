"use client";

import { useState } from "react";
import { Sun, MessageSquare } from "lucide-react";
import { ThemePreferencePicker } from "@/shared/components/common/theme-preference-picker";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeading } from "@/shared/utils/portal-ui";
import { SubmitFeedbackDialog } from "@/features/guest/components/submit-feedback-dialog";

export function PreferencesSection() {
  const { t } = useLanguage();
  const pref = t.settingsPage.preferences;
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div>
      <h3 className={cn("text-base font-semibold mb-5", portalHeading)}>{pref.title}</h3>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sun size={14} className="text-amber-400" />
            <p className={cn("text-sm font-semibold", portalHeading)}>{pref.appearance}</p>
          </div>
          <ThemePreferencePicker
            variant="cards"
            showToggle
            labels={{
              light: pref.light,
              dark: pref.dark,
              system: pref.system,
              darkMode: pref.darkMode,
              darkModeDesc: pref.darkModeDesc,
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors",
            "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300",
            "hover:border-primary hover:text-primary dark:hover:text-primary hover:bg-primary/5",
          )}
        >
          <MessageSquare size={14} />
          {t.submitFeedbackDialog.trigger}
        </button>
      </div>

      <SubmitFeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
