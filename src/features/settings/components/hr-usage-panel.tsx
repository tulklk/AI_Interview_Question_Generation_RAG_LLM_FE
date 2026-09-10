"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  Infinity as InfinityIcon,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { getMyUsage, type UsageCounterRow } from "@/features/subscription/services/subscription.service";
import { portalCard, portalDivider, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

const FALLBACK = {
  title: "Usage this period",
  subtitle: "AI runs you have already consumed in the current period.",
  period: "Period",
  refresh: "Refresh",
  loadError: "Could not load your usage.",
  unlimited: "Unlimited",
  remaining: "{{n}} left",
  exhausted: "All used",
  generateTitle: "Question sets & JD review",
  generateScope: "Within a {{h}}h window",
  generateResetAt: "Unlocks at {{time}}",
  generateReady: "Ready to use",
  askAiTitle: "Ask-AI",
  askAiScope: "Within the current period",
  regenTitle: "Question regeneration",
  regenScope: "Max per question set",
  regenDetail: "{{sets}} set(s) regenerated · {{total}} run(s) total",
  refineTitle: "Plan regeneration",
  refineScope: "Max per Studio session",
  refineDetail: "{{drafts}} session(s) · {{total}} run(s) total",
  totalGenerate: "Question sets created this period",
  premiumHint: "Premium: generate and regeneration are unlimited.",
  noneYet: "You have not used any AI run in this period yet.",
};

type UsageText = typeof FALLBACK;

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

/** Xanh khi còn nhiều, vàng khi gần hết, đỏ khi hết — nhìn màu biết ngay còn lượt hay không. */
function barTone(pct: number) {
  if (pct >= 100) return { bar: "bg-red-500", chip: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300" };
  if (pct >= 75)
    return { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" };
  return {
    bar: "bg-[#6c47ff]",
    chip: "bg-[#6c47ff]/10 text-[#6c47ff] dark:bg-[#6c47ff]/20 dark:text-[#b9a5ff]",
  };
}

function MetricCard({
  title,
  scope,
  used,
  limit,
  unlimited,
  caption,
  text,
}: {
  title: string;
  scope: string;
  used: number;
  limit: number;
  unlimited: boolean;
  caption?: string | null;
  text: UsageText;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const tone = barTone(pct);
  const left = Math.max(0, limit - used);

  return (
    <div className={cn(portalCard, "flex flex-col gap-3 p-4")}>
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold leading-snug", portalHeading)}>{title}</p>
        <p className={cn("mt-0.5 text-[11px] leading-snug", portalSubtext)}>{scope}</p>
      </div>

      {unlimited ? (
        <div className="flex items-center gap-2">
          <span className={cn("text-3xl font-extrabold leading-none", portalHeading)}>∞</span>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {text.unlimited}
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-2">
            <p className={cn("text-2xl font-extrabold leading-none tabular-nums", portalHeading)}>
              {used}
              <span className={cn("text-base font-semibold", portalSubtext)}>/{limit}</span>
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                tone.chip
              )}
            >
              {left > 0 ? fill(text.remaining, { n: left }) : text.exhausted}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className={cn("h-full rounded-full transition-all duration-500", tone.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}

      {caption && <p className={cn("text-[11px] leading-snug", portalSubtext)}>{caption}</p>}
    </div>
  );
}

/** SCRUM-445: HR tự xem lượt AI đã dùng trong kỳ (read-only, lấy từ /api/me/usage). */
export function HrUsagePanel() {
  const { t, lang } = useLanguage();
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const subT = t.settingsPage?.subscription as unknown as { usage?: Partial<UsageText> } | undefined;
  const text = { ...FALLBACK, ...(subT?.usage ?? {}) } as UsageText;

  const {
    subscription,
    limits,
    isPremium,
    canGenerateNow,
    cooldownEndsAt,
    generateWindowUsed,
    generateWindowLimit,
    refresh: refreshSubscription,
  } = useHrSubscription();

  const [rows, setRows] = useState<UsageCounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await getMyUsage());
    } catch {
      setRows([]);
      setError(text.loadError);
    } finally {
      setLoading(false);
    }
  }, [text.loadError]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  async function handleRefresh() {
    await Promise.all([loadUsage(), refreshSubscription()]);
  }

  // Regen câu / refine plan lưu theo scope (mỗi bộ / mỗi phiên) nên gộp lại:
  // lấy mức cao nhất để so với hạn mức, kèm tổng lượt cho HR nắm bức tranh chung.
  function summarize(usageType: string) {
    const scoped = rows.filter((r) => r.usageType === usageType);
    return {
      scopes: scoped.length,
      total: scoped.reduce((sum, r) => sum + r.usedCount, 0),
      max: scoped.reduce((m, r) => Math.max(m, r.usedCount), 0),
    };
  }

  const regen = summarize("HrQuestionRegen");
  const refine = summarize("HrPlanRegenerate");

  const cooldownHours = limits?.generateCooldownHours ?? 24;
  const generateUnlimited = limits?.generateUnlimited ?? false;
  const regenLimit = limits?.questionRegenPerPlan ?? 0;
  const refineLimit = limits?.planRegeneratePerDraft ?? 0;
  const askAiLimit = subscription?.askAiLimit ?? 0;
  const askAiUsed = subscription?.askAiUsed ?? 0;

  const periodLabel = subscription
    ? `${new Date(subscription.periodStart).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
      })} → ${new Date(subscription.periodEnd).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`
    : "—";

  const generateCaption = generateUnlimited
    ? null
    : !canGenerateNow && cooldownEndsAt
      ? fill(text.generateResetAt, {
          time: cooldownEndsAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
        })
      : text.generateReady;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn("text-base font-semibold", portalHeading)}>{text.title}</h3>
          <p className={cn("mt-0.5 text-xs", portalSubtext)}>{text.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-[11px] tabular-nums", portalSubtext)}>
            {text.period}: {periodLabel}
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleRefresh()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {text.refresh}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title={text.generateTitle}
              scope={fill(text.generateScope, { h: cooldownHours })}
              used={generateWindowUsed}
              limit={generateWindowLimit}
              unlimited={generateUnlimited}
              caption={generateCaption}
              text={text}
            />
            <MetricCard
              title={text.regenTitle}
              scope={text.regenScope}
              used={regen.max}
              limit={regenLimit}
              unlimited={generateUnlimited || regenLimit <= 0}
              caption={
                regen.scopes > 0
                  ? fill(text.regenDetail, { sets: regen.scopes, total: regen.total })
                  : null
              }
              text={text}
            />
            <MetricCard
              title={text.askAiTitle}
              scope={text.askAiScope}
              used={askAiUsed}
              limit={askAiLimit}
              unlimited={false}
              text={text}
            />
            <MetricCard
              title={text.refineTitle}
              scope={text.refineScope}
              used={refine.max}
              limit={refineLimit}
              unlimited={refineLimit <= 0}
              caption={
                refine.scopes > 0
                  ? fill(text.refineDetail, { drafts: refine.scopes, total: refine.total })
                  : null
              }
              text={text}
            />
          </div>

          <div
            className={cn(
              "flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-4 py-3",
              portalCard,
              portalDivider
            )}
          >
            <p className={cn("text-xs", portalSubtext)}>
              {text.totalGenerate}:{" "}
              <span className={cn("text-sm font-bold tabular-nums", portalHeading)}>
                {subscription?.generateSetUsed ?? 0}
              </span>
            </p>
            {isPremium ? (
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6c47ff]">
                <InfinityIcon size={13} />
                {text.premiumHint}
              </p>
            ) : (
              !canGenerateNow &&
              cooldownEndsAt && (
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <Clock size={13} />
                  {fill(text.generateResetAt, { time: cooldownEndsAt.toLocaleString(locale) })}
                </p>
              )
            )}
            {!loading && rows.length === 0 && (
              <p className={cn("text-xs", portalSubtext)}>{text.noneYet}</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
