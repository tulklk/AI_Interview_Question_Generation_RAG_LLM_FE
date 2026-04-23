"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useLanguage } from "@/context/language-context";

const CATEGORY_KEYS = ["Technical", "Behavioral", "Situational", "Cultural", "Leadership"] as const;
const MODELS = ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];

const inputCls =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors bg-white";

export function AiConfigSection() {
  const { t } = useLanguage();
  const ai = t.adminPages.settings.aiConfig;

  const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORY_KEYS.map((c) => [c, c !== "Leadership"]))
  );
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("2048");

  function toggleCategory(cat: string) {
    setEnabledCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">{ai.title}</h3>

      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">{ai.categories}</p>
          <div className="space-y-3">
            {CATEGORY_KEYS.map((cat, i) => (
              <div key={cat} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{ai.categoryLabels[i]}</p>
                  <p className="text-xs text-gray-400">
                    {ai.includePrefix} {ai.categoryLabels[i].toLowerCase()} {ai.includeSuffix}
                  </p>
                </div>
                <Toggle
                  checked={enabledCategories[cat]}
                  onChange={() => toggleCategory(cat)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{ai.languageModel}</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={inputCls}
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                {ai.temperature} <span className="text-gray-400 font-normal">({temperature})</span>
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className={inputCls}
              />
              <p className="text-xs text-gray-400">{ai.tempHint}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{ai.maxTokens}</label>
              <input
                type="number"
                min={512}
                max={8192}
                step={512}
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      <button className="mt-6 w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
        <Save size={14} />
        {ai.saveBtn}
      </button>
    </div>
  );
}
