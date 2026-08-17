"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import {
  portalCard,
  portalDivider,
  portalHeading,
  portalSubtext,
} from "@/shared/utils/portal-ui";
import {
  adminListPlans,
  adminUpdatePlan,
  type SubscriptionLimits,
  type SubscriptionPlan,
} from "@/features/subscription/services/subscription.service";
import { AdminPlansStats } from "@/features/admin/components/plans/admin-plans-stats";

const FALLBACK_EDITOR = {
  loading: "Loading subscription plans…",
  loadError: "Could not load the plan list.",
  subtitle:
    "Edit price / limits. Existing subscribers get new limits from their next billing period; new subscribers get them immediately.",
  refresh: "Refresh",
  active: "Active",
  currentPrice: "Currently:",
  priceLabel: "Price / month (VND)",
  askAiLabel: "Ask-AI / period",
  cooldownLabel: "Generate cooldown (hours)",
  regenerateLabel: "Regenerate / draft",
  freeVisibleLabel: "Free visible %",
  canExportLabel: "Can export",
  generateUnlimitedLabel: "Generate unlimited",
  saveBtn: "Save plan",
  saveSuccess: "Saved. New limits apply from the next billing period for existing subscribers.",
  saveError: "Failed to save the plan.",
};

function formatMoney(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currency || "VND" }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

type Editable = {
  name: string;
  priceMonthly: number;
  isActive: boolean;
  askAiPerMonth: number;
  generateCooldownHours: number;
  planRegeneratePerDraft: number;
  freeVisiblePercent: number;
  canExport: boolean;
  generateUnlimited: boolean;
};

function toEditable(p: SubscriptionPlan): Editable {
  return {
    name: p.name,
    priceMonthly: p.priceMonthly,
    isActive: p.isActive,
    askAiPerMonth: p.limits.askAiPerMonth,
    generateCooldownHours: p.limits.generateCooldownHours,
    planRegeneratePerDraft: p.limits.planRegeneratePerDraft,
    freeVisiblePercent: p.limits.freeVisiblePercent,
    canExport: p.limits.canExport,
    generateUnlimited: p.limits.generateUnlimited,
  };
}

type NumField = "priceMonthly" | "askAiPerMonth" | "generateCooldownHours" | "planRegeneratePerDraft" | "freeVisiblePercent";

export function AdminPlansPage() {
  const { t, lang } = useLanguage();
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const ed = t.adminPages?.plansPage?.editor ?? FALLBACK_EDITOR;
  const { addToast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Editable>>({});
  const [rawValues, setRawValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statsRefreshToken, setStatsRefreshToken] = useState(0);

  function numKey(planId: string, field: NumField) {
    return `${planId}_${field}`;
  }

  function getRaw(planId: string, field: NumField, fallback: number): string {
    return rawValues[numKey(planId, field)] ?? String(fallback);
  }

  function handleNumChange(planId: string, field: NumField, raw: string, max?: number) {
    const cleaned = raw.replace(/[^0-9]/g, "");
    setRawValues((prev) => ({ ...prev, [numKey(planId, field)]: cleaned }));
    const n = parseInt(cleaned, 10);
    if (!isNaN(n)) {
      const clamped = max !== undefined ? Math.min(max, n) : n;
      patchDraft(planId, { [field]: clamped } as Partial<Editable>);
    }
  }

  function handleNumBlur(planId: string, field: NumField, max?: number) {
    const raw = rawValues[numKey(planId, field)] ?? "0";
    let n = Math.max(0, parseInt(raw, 10) || 0);
    if (field === "priceMonthly") {
      const plan = plans.find((p) => p.id === planId);
      const code = (plan?.code ?? "").toUpperCase();
      if (code.includes("FREE")) n = 0;
      else if (code.includes("PREMIUM") && n > 0 && n < 10000) n = 10000;
    }
    const clamped = max !== undefined ? Math.min(max, n) : n;
    patchDraft(planId, { [field]: clamped } as Partial<Editable>);
    setRawValues((prev) => ({ ...prev, [numKey(planId, field)]: String(clamped) }));
  }

  const load = useCallback(async (opts?: { refreshStats?: boolean }) => {
    setLoading(true);
    try {
      const list = await adminListPlans();
      setPlans(list);
      const next: Record<string, Editable> = {};
      const nextRaw: Record<string, string> = {};
      for (const p of list) {
        const e = toEditable(p);
        next[p.id] = e;
        nextRaw[`${p.id}_priceMonthly`] = String(e.priceMonthly);
        nextRaw[`${p.id}_askAiPerMonth`] = String(e.askAiPerMonth);
        nextRaw[`${p.id}_generateCooldownHours`] = String(e.generateCooldownHours);
        nextRaw[`${p.id}_planRegeneratePerDraft`] = String(e.planRegeneratePerDraft);
        nextRaw[`${p.id}_freeVisiblePercent`] = String(e.freeVisiblePercent);
      }
      setDrafts(next);
      setRawValues(nextRaw);
      // Chỉ refresh stats khi user bấm Refresh — tránh double-fetch lúc mount
      if (opts?.refreshStats) setStatsRefreshToken((n) => n + 1);
    } catch {
      addToast("error", ed.loadError);
    } finally {
      setLoading(false);
    }
  }, [addToast, ed.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchDraft(id: string, patch: Partial<Editable>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleSave(plan: SubscriptionPlan) {
    const d = drafts[plan.id];
    if (!d) return;
    const code = (plan.code ?? "").toUpperCase();
    if (code.includes("FREE") && d.priceMonthly !== 0) {
      addToast("error", "Gói Free phải có giá 0 VNĐ.");
      return;
    }
    if (code.includes("PREMIUM") && d.priceMonthly < 10000) {
      addToast("error", "Gói Premium phải có giá tối thiểu 10.000 VNĐ.");
      return;
    }
    setSavingId(plan.id);
    try {
      // Gửi full Limits — BE serialize nguyên object (partial sẽ mất field về default)
      const limits: SubscriptionLimits = {
        ...plan.limits,
        askAiPerMonth: d.askAiPerMonth,
        generateCooldownHours: d.generateCooldownHours,
        planRegeneratePerDraft: d.planRegeneratePerDraft,
        freeVisiblePercent: d.freeVisiblePercent,
        canExport: d.canExport,
        generateUnlimited: d.generateUnlimited,
      };
      await adminUpdatePlan(plan.id, {
        name: d.name,
        priceMonthly: d.priceMonthly,
        isActive: d.isActive,
        limits,
      });
      addToast("success", ed.saveSuccess);
      await load();
    } catch {
      addToast("error", ed.saveError);
    } finally {
      setSavingId(null);
    }
  }

  if (loading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-sm text-gray-500">
        <Loader2 className="animate-spin" size={16} />
        {ed.loading}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPlansStats refreshToken={statsRefreshToken} />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className={cn("text-sm", portalSubtext)}>{ed.subtitle}</p>
          <button
            type="button"
            onClick={() => void load({ refreshStats: true })}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw size={14} />
            {ed.refresh}
          </button>
        </div>

        <div className="grid gap-4">
          {plans.map((plan) => {
            const d = drafts[plan.id] ?? toEditable(plan);
            const saving = savingId === plan.id;
            return (
              <div key={plan.id} className={cn(portalCard, "p-5 space-y-4")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={cn("text-xs font-semibold uppercase tracking-wide", portalSubtext)}>
                      {plan.code} · {plan.audience}
                    </p>
                    <input
                      className={cn(
                        "mt-1 text-lg font-bold bg-transparent border-b border-transparent focus:border-[#6c47ff] outline-none w-full max-w-md",
                        portalHeading
                      )}
                      value={d.name}
                      onChange={(e) => patchDraft(plan.id, { name: e.target.value })}
                    />
                    <p className={cn("text-xs mt-1", portalSubtext)}>
                      {ed.currentPrice} {formatMoney(plan.priceMonthly, plan.currency, locale)}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={d.isActive}
                      onChange={(e) => patchDraft(plan.id, { isActive: e.target.checked })}
                    />
                    {ed.active}
                  </label>
                </div>

                <div className={cn("grid sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t", portalDivider)}>
                  <label className="text-xs space-y-1">
                    <span className={portalSubtext}>{ed.priceLabel}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                      value={getRaw(plan.id, "priceMonthly", d.priceMonthly)}
                      onChange={(e) => handleNumChange(plan.id, "priceMonthly", e.target.value)}
                      onBlur={() => handleNumBlur(plan.id, "priceMonthly")}
                    />
                  </label>
                  <label className="text-xs space-y-1">
                    <span className={portalSubtext}>{ed.askAiLabel}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                      value={getRaw(plan.id, "askAiPerMonth", d.askAiPerMonth)}
                      onChange={(e) => handleNumChange(plan.id, "askAiPerMonth", e.target.value)}
                      onBlur={() => handleNumBlur(plan.id, "askAiPerMonth")}
                    />
                  </label>
                  <label className="text-xs space-y-1">
                    <span className={portalSubtext}>{ed.cooldownLabel}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                      value={getRaw(plan.id, "generateCooldownHours", d.generateCooldownHours)}
                      onChange={(e) => handleNumChange(plan.id, "generateCooldownHours", e.target.value)}
                      onBlur={() => handleNumBlur(plan.id, "generateCooldownHours")}
                    />
                  </label>
                  <label className="text-xs space-y-1">
                    <span className={portalSubtext}>{ed.regenerateLabel}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                      value={getRaw(plan.id, "planRegeneratePerDraft", d.planRegeneratePerDraft)}
                      onChange={(e) => handleNumChange(plan.id, "planRegeneratePerDraft", e.target.value)}
                      onBlur={() => handleNumBlur(plan.id, "planRegeneratePerDraft")}
                    />
                  </label>
                  <label className="text-xs space-y-1">
                    <span className={portalSubtext}>{ed.freeVisibleLabel}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
                      value={getRaw(plan.id, "freeVisiblePercent", d.freeVisiblePercent)}
                      onChange={(e) => handleNumChange(plan.id, "freeVisiblePercent", e.target.value, 100)}
                      onBlur={() => handleNumBlur(plan.id, "freeVisiblePercent", 100)}
                    />
                  </label>
                  <div className="flex flex-col gap-2 justify-end text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={d.canExport}
                        onChange={(e) => patchDraft(plan.id, { canExport: e.target.checked })}
                      />
                      {ed.canExportLabel}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={d.generateUnlimited}
                        onChange={(e) => patchDraft(plan.id, { generateUnlimited: e.target.checked })}
                      />
                      {ed.generateUnlimitedLabel}
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave(plan)}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-[#6c47ff] hover:bg-[#5535dd] disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {ed.saveBtn}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
