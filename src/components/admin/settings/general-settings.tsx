"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { FormField } from "@/components/ui/form-field";

const inputCls =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors bg-white";

export function GeneralSettings() {
  const [platformName, setPlatformName] = useState("InterviewAI");
  const [defaultQuestionCount, setDefaultQuestionCount] = useState("15");
  const [maxJdsPerDay, setMaxJdsPerDay] = useState("50");
  const [sessionTimeout, setSessionTimeout] = useState("60");

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">General Settings</h3>

      <div className="space-y-4">
        <FormField label="Platform Name" htmlFor="platform-name">
          <input
            id="platform-name"
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            className={inputCls}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Default Question Count" htmlFor="question-count">
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

          <FormField label="Max JDs Per Day (per user)" htmlFor="max-jds">
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

        <FormField label="Session Timeout (minutes)" htmlFor="session-timeout">
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Danger Zone</p>
          <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Reset Platform Data</p>
              <p className="text-xs text-gray-500 mt-0.5">Clear all generated sessions and analytics. This cannot be undone.</p>
            </div>
            <button className="text-xs font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors shrink-0">
              Reset
            </button>
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
