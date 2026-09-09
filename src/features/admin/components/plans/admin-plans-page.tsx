"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock3,
  Crown,
  Download,
  Eye,
  Infinity as InfinityIcon,
  Loader2,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Undo2,
  Wand2,
  Zap,
} from "lucide-react";
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
  inactive: "Inactive",
  currentPrice: "Currently:",
  priceLabel: "Price / month (VND)",
  askAiLabel: "Ask-AI / period",
  cooldownLabel: "Generate cooldown (hours)",
  generatePerWindowLabel: "Generate set / JD-fit / window",
  questionRegenPerPlanLabel: "Question regen / plan (0 = unlimited)",
  regenerateLabel: "Regenerate / draft",
  freeVisibleLabel: "Free visible %",
  canExportLabel: "Can export",
  generateUnlimitedLabel: "Generate unlimited",
  saveBtn: "Save plan",
  saveSuccess: "Saved. New limits apply from the next billing period for existing subscribers.",
  saveError: "Failed to save the plan.",
  groupQuota: "AI quotas",
  groupAccess: "Visibility & permissions",
  unlimitedBadge: "Unlimited",
  unsaved: "Unsaved changes",
  resetBtn: "Revert",
  freeTier: "Free tier",
  premiumTier: "Premium tier",
  hintPrice: "Free must stay at 0. Premium requires at least 10,000.",
  hintAskAi: "Ask-AI requests allowed per billing period.",
  hintCooldown: "Length of one generate window.",
  hintGeneratePerWindow: "Successful question-set / JD-fit runs per window.",
  hintQuestionRegen: "Per-question regenerations per plan. 0 = unlimited.",
  hintRegenerate: "Plan refine runs allowed per draft.",
  hintFreeVisible: "Share of questions publicly visible to Free candidates.",
  hintCanExport: "Allow exporting question sets to a file.",
  hintGenerateUnlimited: "Bypass every generate quota on this plan.",
  unitTimes: "times",
  unitHours: "hours",
};

type EditorText = typeof FALLBACK_EDITOR;

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
  generatePerWindow: number;
  questionRegenPerPlan: number;
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
    generatePerWindow: p.limits.generatePerWindow,
    questionRegenPerPlan: p.limits.questionRegenPerPlan,
    planRegeneratePerDraft: p.limits.planRegeneratePerDraft,
    freeVisiblePercent: p.limits.freeVisiblePercent,
    canExport: p.limits.canExport,
    generateUnlimited: p.limits.generateUnlimited,
  };
}

type NumField =
  | "priceMonthly"
  | "askAiPerMonth"
  | "generateCooldownHours"
  | "generatePerWindow"
  | "questionRegenPerPlan"
  | "planRegeneratePerDraft"
  | "freeVisiblePercent";

const NUM_FIELDS: NumField[] = [
  "priceMonthly",
  "askAiPerMonth",
  "generateCooldownHours",
  "generatePerWindow",
  "questionRegenPerPlan",
  "planRegeneratePerDraft",
  "freeVisiblePercent",
];

/** Premium dùng tím theme (#6c47ff), Free dải xám — nhìn phát biết ngay gói nào. */
function planTier(code: string) {
  const upper = (code ?? "").toUpperCase();
  if (upper.includes("PREMIUM")) {
    return {
      premium: true,
      gradient: "from-[#6c47ff] via-[#5b3ae8] to-[#4c2fd4]",
      ring: "ring-[#6c47ff]/25 dark:ring-[#6c47ff]/35",
      icon: Crown,
    };
  }
  return {
    premium: false,
    gradient: "from-slate-500 via-slate-600 to-slate-700",
    ring: "ring-slate-200/70 dark:ring-slate-600/30",
    icon: Sparkles,
  };
}

function Switch({
  checked,
  onChange,
  onDark = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  onDark?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked
          ? onDark
            ? "bg-white"
            : "bg-[#6c47ff]"
          : onDark
            ? "bg-white/30"
            : "bg-gray-300 dark:bg-gray-700"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full shadow transition-transform",
          checked ? "translate-x-[1.15rem]" : "translate-x-[0.15rem]",
          checked && onDark ? "bg-[#6c47ff]" : "bg-white"
        )}
      />
    </button>
  );
}

function GroupTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      <Icon size={13} />
      {children}
    </p>
  );
}

function NumberField({
  icon: Icon,
  label,
  hint,
  unit,
  value,
  badge,
  onChange,
  onBlur,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  hint: string;
  unit?: string;
  value: string;
  badge?: string;
  onChange: (raw: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 transition-colors focus-within:border-[#6c47ff]/50 focus-within:bg-white dark:border-gray-800 dark:bg-gray-800/40 dark:focus-within:bg-gray-900">
      <div className="mb-1.5 flex items-start gap-2">
        <Icon size={14} className="mt-0.5 shrink-0 text-[#6c47ff]" />
        <span className={cn("text-xs font-semibold leading-snug", portalHeading)}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={cn(
            "w-20 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-center text-base font-bold tabular-nums outline-none focus:border-[#6c47ff] dark:border-gray-700 dark:bg-gray-900",
            portalHeading
          )}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        {unit && <span className={cn("text-xs", portalSubtext)}>{unit}</span>}
        {badge && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <InfinityIcon size={10} />
            {badge}
          </span>
        )}
      </div>
      <p className={cn("mt-1.5 text-[11px] leading-snug", portalSubtext)}>{hint}</p>
    </div>
  );
}

function ToggleField({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-colors",
        checked
          ? "border-[#6c47ff]/40 bg-[#6c47ff]/5 dark:border-[#6c47ff]/40 dark:bg-[#6c47ff]/10"
          : "border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-800/40"
      )}
    >
      <Icon
        size={14}
        className={cn("mt-0.5 shrink-0", checked ? "text-[#6c47ff]" : "text-gray-400")}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-semibold leading-snug", portalHeading)}>{label}</p>
        <p className={cn("mt-1 text-[11px] leading-snug", portalSubtext)}>{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

export function AdminPlansPage() {
  const { t, lang } = useLanguage();
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const ed = { ...FALLBACK_EDITOR, ...(t.adminPages?.plansPage?.editor ?? {}) } as EditorText;
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
    if (field === "generatePerWindow" && n === 0) {
      // 0 without "Generate unlimited" enabled would silently block every user on
      // this plan while the FE's own `|| 1` fallback still shows the button as
      // enabled — force at least 1 unless the admin has explicitly gone unlimited.
      const plan = plans.find((p) => p.id === planId);
      const d = plan ? (drafts[planId] ?? toEditable(plan)) : undefined;
      if (!d?.generateUnlimited) n = 1;
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
        for (const field of NUM_FIELDS) nextRaw[`${p.id}_${field}`] = String(e[field]);
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

  /** Trả draft về đúng giá trị đang lưu trên server. */
  function handleReset(plan: SubscriptionPlan) {
    const e = toEditable(plan);
    setDrafts((prev) => ({ ...prev, [plan.id]: e }));
    setRawValues((prev) => {
      const next = { ...prev };
      for (const field of NUM_FIELDS) next[`${plan.id}_${field}`] = String(e[field]);
      return next;
    });
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
        generatePerWindow: d.generatePerWindow,
        questionRegenPerPlan: d.questionRegenPerPlan,
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={cn("max-w-2xl text-sm", portalSubtext)}>{ed.subtitle}</p>
          <button
            type="button"
            onClick={() => void load({ refreshStats: true })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <RefreshCw size={14} />
            {ed.refresh}
          </button>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {plans.map((plan) => {
            const d = drafts[plan.id] ?? toEditable(plan);
            const saving = savingId === plan.id;
            const tier = planTier(plan.code);
            const TierIcon = tier.icon;
            const dirty = JSON.stringify(d) !== JSON.stringify(toEditable(plan));

            return (
              <div
                key={plan.id}
                className={cn(portalCard, "overflow-hidden ring-1 ring-inset", tier.ring)}
              >
                {/* Header màu theo tier: code / audience / tên gói / bật-tắt */}
                <div className={cn("bg-gradient-to-r px-5 py-4", tier.gradient)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/25 text-white">
                          <TierIcon size={15} />
                        </span>
                        <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          {plan.code}
                        </span>
                        <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          {plan.audience}
                        </span>
                      </div>
                      <input
                        className="mt-2.5 w-full max-w-sm border-b border-white/30 bg-transparent pb-0.5 text-lg font-bold text-white outline-none placeholder:text-white/60 focus:border-white"
                        value={d.name}
                        onChange={(e) => patchDraft(plan.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Switch
                        checked={d.isActive}
                        onChange={(next) => patchDraft(plan.id, { isActive: next })}
                        onDark
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/85">
                        {d.isActive ? ed.active : ed.inactive}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Giá — tách riêng cho nổi bật */}
                <div className={cn("flex flex-wrap items-end gap-x-4 gap-y-2 border-b px-5 py-4", portalDivider)}>
                  <div>
                    <p className={cn("mb-1.5 text-[11px] font-bold uppercase tracking-wider", portalSubtext)}>
                      {ed.priceLabel}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={cn(
                          "w-32 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xl font-extrabold tabular-nums outline-none focus:border-[#6c47ff] dark:border-gray-700 dark:bg-gray-900",
                          portalHeading
                        )}
                        value={getRaw(plan.id, "priceMonthly", d.priceMonthly)}
                        onChange={(e) => handleNumChange(plan.id, "priceMonthly", e.target.value)}
                        onBlur={() => handleNumBlur(plan.id, "priceMonthly")}
                      />
                      <span className={cn("text-sm font-semibold", portalSubtext)}>
                        {plan.currency || "VND"}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className={cn("text-xs", portalSubtext)}>
                      {ed.currentPrice}{" "}
                      <span className={cn("font-semibold", portalHeading)}>
                        {formatMoney(plan.priceMonthly, plan.currency, locale)}
                      </span>
                    </p>
                    <p className={cn("mt-0.5 text-[11px]", portalSubtext)}>{ed.hintPrice}</p>
                  </div>
                </div>

                {/* Hạn mức AI */}
                <div className="px-5 py-4">
                  <GroupTitle icon={Zap}>{ed.groupQuota}</GroupTitle>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField
                      icon={Wand2}
                      label={ed.generatePerWindowLabel}
                      hint={ed.hintGeneratePerWindow}
                      unit={ed.unitTimes}
                      value={getRaw(plan.id, "generatePerWindow", d.generatePerWindow)}
                      badge={d.generateUnlimited ? ed.unlimitedBadge : undefined}
                      onChange={(raw) => handleNumChange(plan.id, "generatePerWindow", raw)}
                      onBlur={() => handleNumBlur(plan.id, "generatePerWindow")}
                    />
                    <NumberField
                      icon={RotateCcw}
                      label={ed.questionRegenPerPlanLabel}
                      hint={ed.hintQuestionRegen}
                      unit={ed.unitTimes}
                      value={getRaw(plan.id, "questionRegenPerPlan", d.questionRegenPerPlan)}
                      badge={d.questionRegenPerPlan === 0 ? ed.unlimitedBadge : undefined}
                      onChange={(raw) => handleNumChange(plan.id, "questionRegenPerPlan", raw)}
                      onBlur={() => handleNumBlur(plan.id, "questionRegenPerPlan")}
                    />
                    <NumberField
                      icon={Clock3}
                      label={ed.cooldownLabel}
                      hint={ed.hintCooldown}
                      unit={ed.unitHours}
                      value={getRaw(plan.id, "generateCooldownHours", d.generateCooldownHours)}
                      onChange={(raw) => handleNumChange(plan.id, "generateCooldownHours", raw)}
                      onBlur={() => handleNumBlur(plan.id, "generateCooldownHours")}
                    />
                    <NumberField
                      icon={MessageCircle}
                      label={ed.askAiLabel}
                      hint={ed.hintAskAi}
                      unit={ed.unitTimes}
                      value={getRaw(plan.id, "askAiPerMonth", d.askAiPerMonth)}
                      onChange={(raw) => handleNumChange(plan.id, "askAiPerMonth", raw)}
                      onBlur={() => handleNumBlur(plan.id, "askAiPerMonth")}
                    />
                    <NumberField
                      icon={Undo2}
                      label={ed.regenerateLabel}
                      hint={ed.hintRegenerate}
                      unit={ed.unitTimes}
                      value={getRaw(plan.id, "planRegeneratePerDraft", d.planRegeneratePerDraft)}
                      onChange={(raw) => handleNumChange(plan.id, "planRegeneratePerDraft", raw)}
                      onBlur={() => handleNumBlur(plan.id, "planRegeneratePerDraft")}
                    />
                    <NumberField
                      icon={Eye}
                      label={ed.freeVisibleLabel}
                      hint={ed.hintFreeVisible}
                      unit="%"
                      value={getRaw(plan.id, "freeVisiblePercent", d.freeVisiblePercent)}
                      onChange={(raw) => handleNumChange(plan.id, "freeVisiblePercent", raw, 100)}
                      onBlur={() => handleNumBlur(plan.id, "freeVisiblePercent", 100)}
                    />
                  </div>
                </div>

                {/* Quyền */}
                <div className={cn("border-t px-5 py-4", portalDivider)}>
                  <GroupTitle icon={Eye}>{ed.groupAccess}</GroupTitle>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ToggleField
                      icon={Download}
                      label={ed.canExportLabel}
                      hint={ed.hintCanExport}
                      checked={d.canExport}
                      onChange={(next) => patchDraft(plan.id, { canExport: next })}
                    />
                    <ToggleField
                      icon={InfinityIcon}
                      label={ed.generateUnlimitedLabel}
                      hint={ed.hintGenerateUnlimited}
                      checked={d.generateUnlimited}
                      onChange={(next) => patchDraft(plan.id, { generateUnlimited: next })}
                    />
                  </div>
                </div>

                {/* Footer: cảnh báo chưa lưu + hoàn tác + lưu */}
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3",
                    portalDivider,
                    dirty ? "bg-amber-50/70 dark:bg-amber-950/20" : "bg-gray-50/60 dark:bg-gray-800/30"
                  )}
                >
                  {dirty && (
                    <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {ed.unsaved}
                    </span>
                  )}
                  {dirty && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleReset(plan)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium hover:bg-white disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-900"
                    >
                      <Undo2 size={14} />
                      {ed.resetBtn}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave(plan)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6c47ff] px-4 text-sm font-semibold text-white hover:bg-[#5535dd] disabled:opacity-50"
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
