"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { useLanguage } from "@/context/language-context";

const STORAGE_KEY = "hiregen_admin_general_settings";

const inputCls =
  "w-full min-h-[38px] rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 text-xs text-[#111827] transition-colors placeholder:text-[#9ca3af] focus:border-[#6c47ff] focus:outline-none focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)]";

type StoredGeneral = {
  platformName: string;
  defaultQuestionCount: string;
  maxJdsPerDay: string;
  sessionTimeout: string;
};

const defaults: StoredGeneral = {
  platformName: "HireGen AI",
  defaultQuestionCount: "15",
  maxJdsPerDay: "50",
  sessionTimeout: "60",
};

function loadStored(): StoredGeneral {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<StoredGeneral>;
    return {
      platformName: typeof parsed.platformName === "string" ? parsed.platformName : defaults.platformName,
      defaultQuestionCount:
        typeof parsed.defaultQuestionCount === "string"
          ? parsed.defaultQuestionCount
          : defaults.defaultQuestionCount,
      maxJdsPerDay: typeof parsed.maxJdsPerDay === "string" ? parsed.maxJdsPerDay : defaults.maxJdsPerDay,
      sessionTimeout:
        typeof parsed.sessionTimeout === "string" ? parsed.sessionTimeout : defaults.sessionTimeout,
    };
  } catch {
    return defaults;
  }
}

export function GeneralSettings() {
  const { t } = useLanguage();
  const g = t.adminPages.settings.general;

  const [platformName, setPlatformName] = useState(defaults.platformName);
  const [defaultQuestionCount, setDefaultQuestionCount] = useState(defaults.defaultQuestionCount);
  const [maxJdsPerDay, setMaxJdsPerDay] = useState(defaults.maxJdsPerDay);
  const [sessionTimeout, setSessionTimeout] = useState(defaults.sessionTimeout);
  const [saveHint, setSaveHint] = useState<string | null>(null);

  useEffect(() => {
    const s = loadStored();
    setPlatformName(s.platformName);
    setDefaultQuestionCount(s.defaultQuestionCount);
    setMaxJdsPerDay(s.maxJdsPerDay);
    setSessionTimeout(s.sessionTimeout);
  }, []);

  function handleSave() {
    const payload: StoredGeneral = {
      platformName,
      defaultQuestionCount,
      maxJdsPerDay,
      sessionTimeout,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setSaveHint(g.saveSuccess);
    } catch {
      setSaveHint(null);
    }
  }

  useEffect(() => {
    if (!saveHint) return;
    const id = window.setTimeout(() => setSaveHint(null), 2500);
    return () => window.clearTimeout(id);
  }, [saveHint]);

  return (
    <div>
      <h3 className="mb-5 text-base font-bold text-[#111827]">{g.title}</h3>

      <div className="space-y-4">
        <FormField label={g.platformName} htmlFor="platform-name">
          <input
            id="platform-name"
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            className={inputCls}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        <div className="border-t border-[#e5e7eb] pt-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{g.dangerZone}</p>
          <div className="flex flex-col gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#111827]">{g.resetTitle}</p>
              <p className="mt-0.5 text-xs text-[#6b7280]">{g.resetDesc}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              {g.resetBtn}
            </button>
          </div>
        </div>
      </div>

      {saveHint && (
        <p className="mt-3 text-sm font-medium text-[#6c47ff]" role="status">
          {saveHint}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        className="mt-6 flex w-full min-h-9 items-center justify-center gap-2 rounded-lg bg-[#6c47ff] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a3dd9] active:bg-[#4b2fbf]"
      >
        <Save size={14} />
        {g.saveBtn}
      </button>
    </div>
  );
}
