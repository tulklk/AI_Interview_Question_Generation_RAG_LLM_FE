"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Save, GraduationCap } from "lucide-react";
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
  getCompetencyScoringPolicy,
  updateCompetencyScoringPolicy,
  type CompetencyScoringPolicy,
} from "@/features/admin/services/admin-competency-policy.service";

const inputCls = cn(
  portalInput,
  "w-full min-h-[38px] rounded-lg px-3 py-2.5 text-xs transition-colors focus:border-[#6c47ff] focus:outline-none focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)]"
);

const DEFAULTS: CompetencyScoringPolicy = {
  correctnessWeight: 0.5,
  relevanceWeight: 0.3,
  clarityWeight: 0.2,
  easyDifficultyWeight: 1,
  mediumDifficultyWeight: 1.5,
  hardDifficultyWeight: 2,
  developingMaxExclusive: 50,
  nearTargetMaxExclusive: 70,
  readyMaxExclusive: 85,
  juniorReadyCoreSkillRatio: 0.7,
  overallReadyThreshold: 70,
  targetScoreByLevelJson: null,
  drillPassScoreExclusiveMin: 70,
  drillQuestionCountWeak: 20,
  drillQuestionCountMid: 15,
  drillQuestionCountStrong: 10,
  drillWeakBandRatio: 0.6,
  drillRemixEnabled: true,
  drillRemixRatio: 0.35,
  drillWeakAnswerScoreMaxExclusive: 50,
};

/** SCRUM-488: Admin cấu hình drill AI Coach (số câu / remix / pass). */
export function CoachDrillSettings() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const c = t.adminPages.settings.coach;

  const [policy, setPolicy] = useState<CompetencyScoringPolicy>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const next = await getCompetencyScoringPolicy();
      setPolicy({ ...DEFAULTS, ...next });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function setNum<K extends keyof CompetencyScoringPolicy>(key: K, raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setPolicy((p) => ({ ...p, [key]: n }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await updateCompetencyScoringPolicy(policy);
      setPolicy({ ...DEFAULTS, ...saved });
      addToast("success", c.saveSuccess);
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : c.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={cn(portalCard, "flex items-center justify-center gap-2 p-10 text-sm", portalSubtextAlt)}>
        <Loader2 size={16} className="animate-spin" />
        {c.loading}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={cn(portalCard, "space-y-3 p-6")}>
        <p className="text-sm text-red-600">{c.loadFailed}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold"
        >
          <RefreshCw size={12} />
          {c.retry}
        </button>
      </div>
    );
  }

  return (
    <div className={cn(portalCard, "space-y-6 p-5 sm:p-6")}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50">
          <GraduationCap size={16} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className={cn("text-[14px] font-semibold", portalHeadingAlt)}>{c.title}</p>
          <p className={cn("mt-0.5 text-[12px]", portalSubtextAlt)}>{c.subtitle}</p>
        </div>
      </div>

      <div className={cn("h-px", portalDivider)} />

      <section className="space-y-3">
        <p className={cn("text-[12px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
          {c.sectionPass}
        </p>
        <FormField label={c.passMin} htmlFor="drill-pass-min">
          <input
            id="drill-pass-min"
            type="number"
            min={1}
            max={99}
            step={1}
            value={policy.drillPassScoreExclusiveMin}
            onChange={(e) => setNum("drillPassScoreExclusiveMin", e.target.value)}
            className={inputCls}
          />
          <p className={cn("mt-1 text-[11px]", portalSubtextAlt)}>{c.passMinHint}</p>
        </FormField>
      </section>

      <div className={cn("h-px", portalDivider)} />

      <section className="space-y-3">
        <p className={cn("text-[12px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
          {c.sectionCounts}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label={c.countWeak} htmlFor="drill-count-weak">
            <input
              id="drill-count-weak"
              type="number"
              min={5}
              max={40}
              value={policy.drillQuestionCountWeak}
              onChange={(e) => setNum("drillQuestionCountWeak", e.target.value)}
              className={inputCls}
            />
          </FormField>
          <FormField label={c.countMid} htmlFor="drill-count-mid">
            <input
              id="drill-count-mid"
              type="number"
              min={5}
              max={40}
              value={policy.drillQuestionCountMid}
              onChange={(e) => setNum("drillQuestionCountMid", e.target.value)}
              className={inputCls}
            />
          </FormField>
          <FormField label={c.countStrong} htmlFor="drill-count-strong">
            <input
              id="drill-count-strong"
              type="number"
              min={5}
              max={40}
              value={policy.drillQuestionCountStrong}
              onChange={(e) => setNum("drillQuestionCountStrong", e.target.value)}
              className={inputCls}
            />
          </FormField>
        </div>
        <FormField label={c.weakBandRatio} htmlFor="drill-weak-ratio">
          <input
            id="drill-weak-ratio"
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={policy.drillWeakBandRatio}
            onChange={(e) => setNum("drillWeakBandRatio", e.target.value)}
            className={inputCls}
          />
          <p className={cn("mt-1 text-[11px]", portalSubtextAlt)}>{c.weakBandRatioHint}</p>
        </FormField>
      </section>

      <div className={cn("h-px", portalDivider)} />

      <section className="space-y-3">
        <p className={cn("text-[12px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
          {c.sectionRemix}
        </p>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
          <div>
            <p className={cn("text-[13px] font-medium", portalHeadingAlt)}>{c.remixEnabled}</p>
            <p className={cn("text-[11px]", portalSubtextAlt)}>{c.remixEnabledHint}</p>
          </div>
          <Toggle
            checked={policy.drillRemixEnabled}
            onChange={(v) => setPolicy((p) => ({ ...p, drillRemixEnabled: v }))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={c.remixRatio} htmlFor="drill-remix-ratio">
            <input
              id="drill-remix-ratio"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={policy.drillRemixRatio}
              onChange={(e) => setNum("drillRemixRatio", e.target.value)}
              className={inputCls}
              disabled={!policy.drillRemixEnabled}
            />
          </FormField>
          <FormField label={c.weakAnswerMax} htmlFor="drill-weak-answer">
            <input
              id="drill-weak-answer"
              type="number"
              min={1}
              max={99}
              value={policy.drillWeakAnswerScoreMaxExclusive}
              onChange={(e) => setNum("drillWeakAnswerScoreMaxExclusive", e.target.value)}
              className={inputCls}
              disabled={!policy.drillRemixEnabled}
            />
            <p className={cn("mt-1 text-[11px]", portalSubtextAlt)}>{c.weakAnswerMaxHint}</p>
          </FormField>
        </div>
      </section>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="shimmer-button hr-cta-btn inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? c.saving : c.saveBtn}
        </button>
      </div>
    </div>
  );
}
