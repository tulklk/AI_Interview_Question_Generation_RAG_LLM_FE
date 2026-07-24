"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Toggle } from "@/shared/components/ui/toggle";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalDivider, portalHeading, portalInput, portalSubtext } from "@/shared/utils/portal-ui";
import { AdminRagStatus } from "@/features/admin/components/dashboard/admin-rag-status";

const CATEGORY_KEYS = ["Technical", "Behavioral", "Situational", "Cultural", "Leadership"] as const;
const MODELS = ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];

const inputCls = cn(
  portalInput,
  "w-full px-3.5 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors"
);

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
      <h3 className={cn("text-base font-semibold mb-5", portalHeading)}>{ai.title}</h3>

      <div className="mb-5">
        <AdminRagStatus />
      </div>

      <div className="space-y-5">
        <div>
          <p className={cn("text-sm font-medium mb-3", portalHeading)}>{ai.categories}</p>
          <div className="space-y-3">
            {CATEGORY_KEYS.map((cat, i) => (
              <div key={cat} className={cn("flex items-center justify-between py-2 border-b last:border-0", portalDivider)}>
                <div>
                  <p className={cn("text-sm font-medium", portalHeading)}>{ai.categoryLabels[i]}</p>
                  <p className={cn("text-xs", portalSubtext)}>
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

        <div className={cn("pt-4 border-t space-y-4", portalDivider)}>
          <div className="flex flex-col gap-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>{ai.languageModel}</label>
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
              <label className={cn("text-sm font-medium", portalHeading)}>
                {ai.temperature} <span className={cn("font-normal", portalSubtext)}>({temperature})</span>
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
              <p className={cn("text-xs", portalSubtext)}>{ai.tempHint}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={cn("text-sm font-medium", portalHeading)}>{ai.maxTokens}</label>
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

      <button className="mt-6 w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
        <Save size={14} />
        {ai.saveBtn}
      </button>
    </div>
  );
}
