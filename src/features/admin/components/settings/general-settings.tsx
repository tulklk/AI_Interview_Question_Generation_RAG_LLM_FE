"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, RefreshCw, ShieldAlert, Shield } from "lucide-react";
import { FormField } from "@/shared/components/ui/form-field";
import { Toggle } from "@/shared/components/ui/toggle";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { cn } from "@/lib/cn";
import {
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

  const [minQuestionsToPublish, setMinQuestionsToPublish] = useState("10");
  const [maxPinnedSets, setMaxPinnedSets] = useState("5");
  const [minAttemptsForTrending, setMinAttemptsForTrending] = useState("10");
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(false);
  const [antiCheatMaxTabLeaves, setAntiCheatMaxTabLeaves] = useState("3");
  const [maxIntegrityStrikes, setMaxIntegrityStrikes] = useState("3");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function loadSettings() {
    setLoading(true);
    setLoadError(false);
    try {
      const s = await getPlatformSettings();
      if (s.minQuestionsToPublish != null) setMinQuestionsToPublish(String(s.minQuestionsToPublish));
      if (s.maxPinnedSets != null) setMaxPinnedSets(String(s.maxPinnedSets));
      if (s.minAttemptsForTrending != null) setMinAttemptsForTrending(String(s.minAttemptsForTrending));
      if (typeof s.antiCheatEnabled === "boolean") setAntiCheatEnabled(s.antiCheatEnabled);
      if (s.antiCheatMaxTabLeaves != null) setAntiCheatMaxTabLeaves(String(s.antiCheatMaxTabLeaves));
      if (s.maxIntegrityStrikes != null) setMaxIntegrityStrikes(String(s.maxIntegrityStrikes));
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
      const maxStrikes = Math.min(10, Math.max(1, Number(maxIntegrityStrikes) || 3));
      await updatePlatformSettings({
        minQuestionsToPublish: Number(minQuestionsToPublish) || undefined,
        maxPinnedSets: Number(maxPinnedSets) || 0,
        minAttemptsForTrending: Number(minAttemptsForTrending) || undefined,
        antiCheatEnabled,
        antiCheatMaxTabLeaves: maxLeaves,
        maxIntegrityStrikes: maxStrikes,
      });
      setAntiCheatMaxTabLeaves(String(maxLeaves));
      setMaxIntegrityStrikes(String(maxStrikes));
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

          {/* antiCheatMaxTabLeaves không còn ô chỉnh sửa riêng — gộp chung vào
              "Số lỗi vi phạm chống gian lận tối đa" bên dưới cho admin đỡ rối với
              2 thông số chồng chéo. Vẫn giữ state/gửi lại y nguyên giá trị đã lưu
              khi Save để không phá cơ chế rời-tab phía BE đang chạy đúng. */}

          <FormField label={g.maxIntegrityStrikes} htmlFor="max-integrity-strikes">
            <input
              id="max-integrity-strikes"
              type="number"
              min={1}
              max={10}
              disabled={!antiCheatEnabled}
              value={maxIntegrityStrikes}
              onChange={(e) => setMaxIntegrityStrikes(e.target.value)}
              className={cn(inputCls, !antiCheatEnabled && "opacity-50 cursor-not-allowed")}
            />
            <p className={cn("mt-1 text-[11px]", portalSubtextAlt)}>{g.maxIntegrityStrikesHint}</p>
          </FormField>
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
