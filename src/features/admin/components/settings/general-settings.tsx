"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, RefreshCw, ShieldAlert, Shield } from "lucide-react";
import { FormField } from "@/shared/components/ui/form-field";
import { Toggle } from "@/shared/components/ui/toggle";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { cn } from "@/lib/cn";
import {
  portalDivider,
  portalHeadingAlt,
  portalInput,
  portalSubtextAlt,
  portalCard,
} from "@/shared/utils/portal-ui";
import {
  getPlatformSettings,
  updatePlatformSettings,
} from "@/features/admin/services/admin-platform-settings.service";

const inputCls = cn(
  portalInput,
  "w-full min-h-[38px] rounded-lg px-3 py-2.5 text-xs transition-colors focus:border-[#6c47ff] focus:outline-none focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)]"
);

export function GeneralSettings() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const g = t.adminPages.settings.general;

  const [platformName, setPlatformName] = useState("HireGen AI");
  const [defaultQuestionCount, setDefaultQuestionCount] = useState("15");
  const [maxJdsPerDay, setMaxJdsPerDay] = useState("50");
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [minQuestionsToPublish, setMinQuestionsToPublish] = useState("10");
  const [maxPinnedSets, setMaxPinnedSets] = useState("5");
  const [minAttemptsForTrending, setMinAttemptsForTrending] = useState("10");
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(false);
  const [antiCheatMaxTabLeaves, setAntiCheatMaxTabLeaves] = useState("3");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function loadSettings() {
    setLoading(true);
    setLoadError(false);
    try {
      const s = await getPlatformSettings();
      if (s.platformName) setPlatformName(s.platformName);
      if (s.defaultQuestionCount != null) setDefaultQuestionCount(String(s.defaultQuestionCount));
      if (s.maxJdsPerDay != null) setMaxJdsPerDay(String(s.maxJdsPerDay));
      if (s.sessionTimeout != null) setSessionTimeout(String(s.sessionTimeout));
      if (s.minQuestionsToPublish != null) setMinQuestionsToPublish(String(s.minQuestionsToPublish));
      if (s.maxPinnedSets != null) setMaxPinnedSets(String(s.maxPinnedSets));
      if (s.minAttemptsForTrending != null) setMinAttemptsForTrending(String(s.minAttemptsForTrending));
      if (typeof s.antiCheatEnabled === "boolean") setAntiCheatEnabled(s.antiCheatEnabled);
      if (s.antiCheatMaxTabLeaves != null) setAntiCheatMaxTabLeaves(String(s.antiCheatMaxTabLeaves));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSettings(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true);
    try {
      const maxLeaves = Math.min(20, Math.max(1, Number(antiCheatMaxTabLeaves) || 3));
      await updatePlatformSettings({
        platformName,
        defaultQuestionCount: Number(defaultQuestionCount) || undefined,
        maxJdsPerDay: Number(maxJdsPerDay) || undefined,
        sessionTimeout: Number(sessionTimeout) || undefined,
        minQuestionsToPublish: Number(minQuestionsToPublish) || undefined,
        maxPinnedSets: Number(maxPinnedSets) || 0,
        minAttemptsForTrending: Number(minAttemptsForTrending) || undefined,
        antiCheatEnabled,
        antiCheatMaxTabLeaves: maxLeaves,
      });
      setAntiCheatMaxTabLeaves(String(maxLeaves));
      addToast("success", g.saveSuccess);
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : g.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={22} className="animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className={cn("text-sm", portalSubtextAlt)}>{g.loadFailed}</p>
        <button
          type="button"
          onClick={loadSettings}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <RefreshCw size={12} />
          {g.retry}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3 className={cn("mb-5 text-base font-bold", portalHeadingAlt)}>{g.title}</h3>

      <div className="space-y-4">
        <div className={cn("rounded-xl border p-4 space-y-4", portalCard)}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={14} className="text-primary shrink-0" />
            <p className={cn("text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
              {g.systemSection}
            </p>
          </div>

          <FormField
            label={g.minQuestionsLabel}
            htmlFor="min-questions-publish"
          >
            <input
              id="min-questions-publish"
              type="number"
              min={1}
              max={50}
              value={minQuestionsToPublish}
              onChange={(e) => setMinQuestionsToPublish(e.target.value)}
              className={inputCls}
            />
            <p className={cn("mt-1 text-[11px]", portalSubtextAlt)}>
              {g.minQuestionsHint}
            </p>
          </FormField>

          <FormField
            label={g.maxPinnedLabel}
            htmlFor="max-pinned-sets"
          >
            <input
              id="max-pinned-sets"
              type="number"
              min={0}
              max={50}
              value={maxPinnedSets}
              onChange={(e) => setMaxPinnedSets(e.target.value)}
              className={inputCls}
            />
            <p className={cn("mt-1 text-[11px]", portalSubtextAlt)}>
              {g.maxPinnedHint}
            </p>
          </FormField>

          <FormField
            label={g.trendingLabel}
            htmlFor="min-attempts-trending"
          >
            <input
              id="min-attempts-trending"
              type="number"
              min={1}
              max={10000}
              value={minAttemptsForTrending}
              onChange={(e) => setMinAttemptsForTrending(e.target.value)}
              className={inputCls}
            />
            <p className={cn("mt-1 text-[11px]", portalSubtextAlt)}>
              {g.trendingHint}
            </p>
          </FormField>
        </div>

        <div className={cn("rounded-xl border p-4 space-y-4", portalCard)}>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={14} className="text-primary shrink-0" />
            <p className={cn("text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
              {g.antiCheatSection}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className={cn("text-sm font-semibold", portalHeadingAlt)}>{g.antiCheatEnabled}</p>
              <p className={cn("mt-0.5 text-[11px]", portalSubtextAlt)}>{g.antiCheatEnabledHint}</p>
            </div>
            <Toggle checked={antiCheatEnabled} onChange={setAntiCheatEnabled} ariaLabel={g.antiCheatEnabled} />
          </div>

          <FormField label={g.antiCheatMaxTabLeaves} htmlFor="anti-cheat-max-leaves">
            <input
              id="anti-cheat-max-leaves"
              type="number"
              min={1}
              max={20}
              disabled={!antiCheatEnabled}
              value={antiCheatMaxTabLeaves}
              onChange={(e) => setAntiCheatMaxTabLeaves(e.target.value)}
              className={cn(inputCls, !antiCheatEnabled && "opacity-50 cursor-not-allowed")}
            />
            <p className={cn("mt-1 text-[11px]", portalSubtextAlt)}>{g.antiCheatMaxTabLeavesHint}</p>
          </FormField>
        </div>

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

        <div className={cn("border-t pt-2", portalDivider)}>
          <p className={cn("mb-3 text-xs font-semibold uppercase tracking-wide", portalSubtextAlt)}>
            {g.dangerZone}
          </p>
          <div className="flex flex-col gap-3 rounded-lg border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={cn("text-sm font-semibold", portalHeadingAlt)}>{g.resetTitle}</p>
              <p className={cn("mt-0.5 text-xs", portalSubtextAlt)}>{g.resetDesc}</p>
            </div>
            <button
              type="button"
              disabled
              title={t.common.comingSoon}
              className="shrink-0 rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 transition-colors opacity-50 cursor-not-allowed"
            >
              {g.resetBtn}
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="shimmer-button mt-6 flex w-full min-h-9 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white hr-cta-btn disabled:opacity-60"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? g.saving : g.saveBtn}
      </button>
    </div>
  );
}
