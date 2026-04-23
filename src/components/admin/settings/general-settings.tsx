"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { useLanguage } from "@/context/language-context";

const inputCls =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors bg-white";

export function GeneralSettings() {
  const { t } = useLanguage();
  const g = t.adminPages.settings.general;

  const [platformName, setPlatformName] = useState("HireGen AI");
  const [defaultQuestionCount, setDefaultQuestionCount] = useState("15");
  const [maxJdsPerDay, setMaxJdsPerDay] = useState("50");
  const [sessionTimeout, setSessionTimeout] = useState("60");

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">{g.title}</h3>

      <div className="space-y-4">
        <FormField label={g.platformName} htmlFor="platform-name">
          <input
            id="platform-name"
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            className={inputCls}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={g.defaultQuestionCount} htmlFor="question-count">
            <input
              id="question-count"
              type="number"
              min={5}
              max={50}
              value={defaultQuestionCount}
              onChange={(e) => setDefaultQuestionCount(e.target.value)}
              className={inputCls}
            />
          </FormField>

          <FormField label={g.maxJDs} htmlFor="max-jds">
            <input
              id="max-jds"
              type="number"
              min={1}
              value={maxJdsPerDay}
              onChange={(e) => setMaxJdsPerDay(e.target.value)}
              className={inputCls}
            />
          </FormField>
        </div>

        <FormField label={g.sessionTimeout} htmlFor="session-timeout">
          <input
            id="session-timeout"
            type="number"
            min={15}
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(e.target.value)}
            className={inputCls}
          />
        </FormField>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{g.dangerZone}</p>
          <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">{g.resetTitle}</p>
              <p className="text-xs text-gray-500 mt-0.5">{g.resetDesc}</p>
            </div>
            <button className="text-xs font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors shrink-0">
              {g.resetBtn}
            </button>
          </div>
        </div>
      </div>

      <button className="mt-6 w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
        <Save size={14} />
        {g.saveBtn}
      </button>
    </div>
  );
}
