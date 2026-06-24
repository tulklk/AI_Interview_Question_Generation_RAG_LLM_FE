"use client";

import { useState, useEffect } from "react";
import { Sun, Save, Sparkles } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { ThemePreferencePicker } from "@/components/shared/theme-preference-picker";
import { SelectField } from "@/components/ui/select-field";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { portalDivider, portalHeading, portalSubtext } from "@/lib/portal-ui";

const aiModels = [
  { value: "gpt4", label: "GPT-4 (Most Accurate)" },
  { value: "gpt35", label: "GPT-3.5 (Faster)" },
  { value: "claude3", label: "Claude 3 Sonnet" },
];

const outputLanguages = [
  { value: "en-us", label: "US English" },
  { value: "en-uk", label: "UK English" },
  { value: "vi", label: "Vietnamese" },
];

const questionCounts = [
  { value: "5", label: "5 questions" },
  { value: "10", label: "10 questions" },
  { value: "15", label: "15 questions" },
  { value: "20", label: "20 questions" },
];

const tones = [
  { value: "professional", label: "Professional" },
  { value: "conversational", label: "Conversational" },
  { value: "technical", label: "Technical" },
];

export function PreferencesSection() {
  const { t } = useLanguage();
  const pref = t.settingsPage.preferences;
  const { hasFeature } = useHrSubscription();
  const advancedOk = hasFeature("advancedModels");

  const [aiModel, setAiModel] = useState("gpt4");
  const [language, setLanguage] = useState("en-us");
  const [questionsCount, setQuestionsCount] = useState("5");
  const [tone, setTone] = useState("professional");
  const [showDifficulty, setShowDifficulty] = useState(true);
  const [includeSuggestedAnswers, setIncludeSuggestedAnswers] = useState(true);

  const modelOptions = advancedOk
    ? aiModels
    : aiModels.filter((m) => m.value === "gpt35");

  useEffect(() => {
    if (!advancedOk && (aiModel === "gpt4" || aiModel === "claude3")) {
      setAiModel("gpt35");
    }
  }, [advancedOk, aiModel]);

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

        <div className={cn("border-t pt-5", portalDivider)}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-[#6c47ff]" />
            <p className={cn("text-sm font-semibold", portalHeading)}>{pref.aiSettings}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <SelectField
                label={pref.aiModel}
                value={aiModel}
                onChange={setAiModel}
                options={modelOptions}
              />
              {!advancedOk && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1.5">{t.hrSubscription.lockedAdvancedModel}</p>
              )}
            </div>
            <SelectField
              label={pref.outputLanguage}
              value={language}
              onChange={setLanguage}
              options={outputLanguages}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label={pref.questionsPerCategory}
              value={questionsCount}
              onChange={setQuestionsCount}
              options={questionCounts}
            />
            <SelectField
              label={pref.questionTone}
              value={tone}
              onChange={setTone}
              options={tones}
            />
          </div>
        </div>

        <div className={cn("border-t pt-5 space-y-4", portalDivider)}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cn("text-sm font-medium", portalHeading)}>{pref.showDifficulty}</p>
              <p className={cn("text-xs mt-0.5", portalSubtext)}>{pref.showDifficultyDesc}</p>
            </div>
            <Toggle checked={showDifficulty} onChange={setShowDifficulty} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={cn("text-sm font-medium", portalHeading)}>{pref.includeAnswers}</p>
              <p className={cn("text-xs mt-0.5", portalSubtext)}>{pref.includeAnswersDesc}</p>
            </div>
            <Toggle
              checked={includeSuggestedAnswers}
              onChange={setIncludeSuggestedAnswers}
            />
          </div>
        </div>
      </div>

      <button className="shimmer-button mt-6 w-full flex items-center justify-center gap-2 hr-cta-btn text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
        <Save size={14} />
        {pref.save}
      </button>
    </div>
  );
}
