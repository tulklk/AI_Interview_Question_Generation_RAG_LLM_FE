"use client";

import { useState } from "react";
import { Sun, Moon, Monitor, Save, Sparkles } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { SelectField } from "@/components/ui/select-field";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

const themeOptions: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Monitor },
];

const aiModels = [
  { value: "gpt4", label: "GPT-4 (Most Accurate)" },
  { value: "gpt35", label: "GPT-3.5 (Faster)" },
  { value: "claude3", label: "Claude 3 Sonnet" },
];

const outputLanguages = [
  { value: "en-us", label: "us English" },
  { value: "en-uk", label: "uk English" },
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
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [aiModel, setAiModel] = useState("gpt4");
  const [language, setLanguage] = useState("en-us");
  const [questionsCount, setQuestionsCount] = useState("5");
  const [tone, setTone] = useState("professional");
  const [showDifficulty, setShowDifficulty] = useState(true);
  const [includeSuggestedAnswers, setIncludeSuggestedAnswers] = useState(true);

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">Preferences</h3>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sun size={14} className="text-amber-400" />
            <p className="text-sm font-semibold text-gray-700">Appearance</p>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Dark Mode</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Switch between light and dark interface
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Sun size={13} />
              <Toggle
                checked={theme === "dark"}
                onChange={(v) => setTheme(v ? "dark" : "light")}
              />
              <Moon size={13} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-colors relative",
                  theme === id
                    ? "border-[#6c47ff] text-[#6c47ff] bg-indigo-50"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                )}
              >
                <Icon size={14} />
                {label}
                {theme === id && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6c47ff]" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-[#6c47ff]" />
            <p className="text-sm font-semibold text-gray-700">AI Settings</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <SelectField
              label="AI Model"
              value={aiModel}
              onChange={setAiModel}
              options={aiModels}
            />
            <SelectField
              label="Output Language"
              value={language}
              onChange={setLanguage}
              options={outputLanguages}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Questions per Category"
              value={questionsCount}
              onChange={setQuestionsCount}
              options={questionCounts}
            />
            <SelectField
              label="Question Tone"
              value={tone}
              onChange={setTone}
              options={tones}
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Show difficulty badges</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Label each question as Easy, Medium, or Hard
              </p>
            </div>
            <Toggle checked={showDifficulty} onChange={setShowDifficulty} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Include suggested answers</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Generate AI-suggested answers for each question
              </p>
            </div>
            <Toggle
              checked={includeSuggestedAnswers}
              onChange={setIncludeSuggestedAnswers}
            />
          </div>
        </div>
      </div>

      <button className="mt-6 w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
        <Save size={14} />
        Save Changes
      </button>
    </div>
  );
}
