"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Landmark,
  Loader2,
  Percent,
  RefreshCw,
  Users,
  UserCheck,
  Wallet,
} from "lucide-react";

const PAGE_SIZE = 10;
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
  adminGetSePayOverview,
  adminGetSubscriptionStats,
  adminListSubscriptionTransactions,
  type AdminSePayOverview,
  type AdminSubscriptionStats,
  type AdminSubscriptionTransactionRow,
} from "@/features/subscription/services/subscription.service";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("vi-VN")} ${currency}`;
  }
}

function formatPct(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

function useCountUp(target: number, duration = 900): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    startRef.current = null;
    cancelAnimationFrame(rafRef.current);

    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * eased;
      setCurrent(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}

function AnimatedValue({ raw, format }: { raw: number; format: (n: number) => string }) {
  const animated = useCountUp(raw);
  return (
    <p className={cn("text-xl font-extrabold tabular-nums leading-none", portalHeading)}>
      {format(animated)}
    </p>
  );
}

function matchBadgeClass(status: string) {
  switch (status) {
    case "Matched":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
    case "PendingLocal":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
    case "Unmatched":
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  }
}

interface AdminPlansStatsProps {
  refreshToken?: number;
}

export function AdminPlansStats({ refreshToken = 0 }: AdminPlansStatsProps) {
  const { t, lang } = useLanguage();
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  // Fallback khi HMR/cache i18n (đặc biệt bản vi) chưa có plansPage.stats
  const s = t.adminPages?.plansPage?.stats ?? {
    title: "Subscription & SePay stats",
    subtitle: "Business KPIs from IQGS DB + live bank overview from SePay User API.",
    refresh: "Refresh stats",
    loadError: "Could not load subscription stats.",
    revenueThisMonth: "Revenue this month",
    revenueThisMonthDesc: "Paid SePay upgrades confirmed this month",
    pendingOrders: "Pending orders",
    pendingOrdersDesc: "SePay upgrade orders still awaiting payment",
    premiumHr: "Premium HR",
    premiumHrDesc: "Active HR Premium subscriptions",
    premiumCandidate: "Premium Candidate",
    premiumCandidateDesc: "Active Candidate Premium subscriptions",
    estimatedMrr: "Estimated MRR",
    estimatedMrrDesc: "Active Premium count × plan monthly price",
    paidRate: "Paid rate (30d)",
    paidRateDesc: "Paid / (Paid + Expired + Failed) SePay upgrades",
    bankTitle: "SePay receiving account",
    bankOnline: "Online",
    bankOffline: "Offline / unavailable",
    balance: "Current balance",
    lastTx: "Last transaction",
    sepayUnavailable: "Could not load SePay bank data.",
    dailyChartTitle: "Inflows last 7 days (SePay)",
    noDailyData: "No daily inflow data.",
    sepayFeedTitle: "SePay bank inflows",
    sepayFeedDesc: "Matched against local Upgrade order codes (UPG*).",
    localTxTitle: "Local subscription transactions",
    localTxDesc: "Orders stored in IQGS (Pending / Paid / Expired).",
    colTime: "Time",
    colAmount: "Amount",
    colContent: "Transfer content",
    colRef: "Bank ref",
    colWebhook: "Webhook",
    colMatch: "Match",
    colOrder: "Order",
    colUser: "User",
    colAudience: "Audience",
    colStatus: "Status",
    colProvider: "Provider",
    webhookOk: "OK",
    webhookFail: "Failed",
    noSepayRows: "No SePay inflows in the selected window.",
    noLocalRows: "No local subscription transactions yet.",
  };
  const { addToast } = useToast();
  const loadErrorMsg = s.loadError;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminSubscriptionStats | null>(null);
  const [txs, setTxs] = useState<AdminSubscriptionTransactionRow[]>([]);
  const [sepay, setSepay] = useState<AdminSePayOverview | null>(null);
  const [txPage, setTxPage] = useState(1);
  const [txFading, setTxFading] = useState(false);

  function goToPage(next: number) {
    if (next === txPage) return;
    setTxFading(true);
    setTimeout(() => {
      setTxPage(next);
      setTxFading(false);
    }, 140);
  }

  const load = useCallback(
    async (forceSepayRefresh = false) => {
      setLoading(true);
      // Load độc lập — 1 API lỗi không làm mất toàn bộ panel / spam toast
      const [stRes, txRes, seRes] = await Promise.allSettled([
        adminGetSubscriptionStats(),
        adminListSubscriptionTransactions(200),
        adminGetSePayOverview(forceSepayRefresh),
      ]);

      if (stRes.status === "fulfilled") setStats(stRes.value);
      if (txRes.status === "fulfilled") { setTxs(txRes.value); setTxPage(1); }
      if (seRes.status === "fulfilled") setSepay(seRes.value);

      const failed =
        (stRes.status === "rejected" ? 1 : 0) +
        (txRes.status === "rejected" ? 1 : 0) +
        (seRes.status === "rejected" ? 1 : 0);

      if (failed === 3) {
        addToast("error", loadErrorMsg);
      } else if (stRes.status === "rejected") {
        // KPI là phần quan trọng nhất — báo khi stats fail dù SePay vẫn có data
        addToast("error", loadErrorMsg);
      }

      setLoading(false);
    },
    [addToast, loadErrorMsg]
  );

  useEffect(() => {
    void load(refreshToken > 0);
  }, [load, refreshToken]);

  const currency = stats?.currency || "VND";

  const totalTxPages = Math.max(1, Math.ceil(txs.length / PAGE_SIZE));
  const pagedTxs = txs.slice((txPage - 1) * PAGE_SIZE, txPage * PAGE_SIZE);
  const maxDaily = Math.max(1, ...(sepay?.dailyInLast7Days.map((d) => d.amountIn) ?? [1]));

  const kpis = [
    {
      icon: Wallet,
      label: s.revenueThisMonth,
      desc: s.revenueThisMonthDesc,
      raw: stats?.revenueThisMonth ?? null,
      format: (n: number) => formatMoney(Math.round(n), currency),
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: Clock3,
      label: s.pendingOrders,
      desc: s.pendingOrdersDesc,
      raw: stats?.pendingOrders ?? null,
      format: (n: number) => String(Math.round(n)),
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      icon: UserCheck,
      label: s.premiumHr,
      desc: s.premiumHrDesc,
      raw: stats?.premiumHrActive ?? null,
      format: (n: number) => String(Math.round(n)),
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      icon: Users,
      label: s.premiumCandidate,
      desc: s.premiumCandidateDesc,
      raw: stats?.premiumCandidateActive ?? null,
      format: (n: number) => String(Math.round(n)),
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      icon: Banknote,
      label: s.estimatedMrr,
      desc: s.estimatedMrrDesc,
      raw: stats?.estimatedMrr ?? null,
      format: (n: number) => formatMoney(Math.round(n), currency),
      iconBg: "bg-cyan-50 dark:bg-cyan-950/40",
      iconColor: "text-cyan-600 dark:text-cyan-400",
    },
    {
      icon: Percent,
      label: s.paidRate,
      desc: s.paidRateDesc,
      raw: stats?.paidRateLast30Days ?? null,
      format: (n: number) => formatPct(n),
      iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className={cn("text-base font-semibold", portalHeading)}>{s.title}</h3>
          <p className={cn("text-xs mt-0.5", portalSubtext)}>{s.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {s.refresh}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="hr-stat-card rounded-xl p-4 flex flex-col gap-2">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", k.iconBg)}>
              <k.icon size={16} className={k.iconColor} />
            </div>
            {loading || k.raw === null ? (
              <div className="h-7 w-24 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ) : (
              <AnimatedValue raw={k.raw} format={k.format} />
            )}
            <p className={cn("text-[11px] font-semibold uppercase tracking-wider", portalSubtext)}>{k.label}</p>
            <p className={cn("text-[10px] leading-snug", portalSubtext)}>{k.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <div className={cn(portalCard, "p-4 space-y-3")}>
          <div className="flex items-center gap-2">
            <Landmark size={16} className="text-[#6c47ff]" />
            <p className={cn("text-sm font-semibold", portalHeading)}>{s.bankTitle}</p>
          </div>
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
              <div className="h-8 w-1/2 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
            </div>
          ) : sepay?.bank ? (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                    sepay.bank.available && sepay.bank.active
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  )}
                >
                  {sepay.bank.available && sepay.bank.active ? s.bankOnline : s.bankOffline}
                </span>
              </div>
              <p className={cn("text-xs", portalSubtext)}>{sepay.bank.bankName || "—"}</p>
              <p className={cn("text-sm font-semibold", portalHeading)}>
                {sepay.bank.accountHolderName || "—"}
              </p>
              <p className={cn("text-xs font-mono", portalSubtext)}>
                {sepay.bank.accountNumberMasked || "—"}
              </p>
              <div className={cn("pt-2 border-t", portalDivider)}>
                <p className={cn("text-[10px] uppercase tracking-wide", portalSubtext)}>{s.balance}</p>
                <p className={cn("text-lg font-bold tabular-nums", portalHeading)}>
                  {formatMoney(sepay.bank.accumulated || 0, currency)}
                </p>
                <p className={cn("text-[11px] mt-1", portalSubtext)}>
                  {s.lastTx}: {sepay.bank.lastTransaction || "—"}
                </p>
              </div>
              {sepay.bank.message ? (
                <p className={cn("text-[11px]", portalSubtext)}>{sepay.bank.message}</p>
              ) : null}
            </>
          ) : (
            <p className={cn("text-xs", portalSubtext)}>{s.sepayUnavailable}</p>
          )}
        </div>

        <div className={cn(portalCard, "p-4 space-y-3")}>
          <p className={cn("text-sm font-semibold", portalHeading)}>{s.dailyChartTitle}</p>
          <div className="flex items-end gap-2 h-28">
            {(sepay?.dailyInLast7Days ?? []).map((d) => {
              const h = Math.max(4, Math.round((d.amountIn / maxDaily) * 100));
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className={cn("text-[9px] tabular-nums", portalSubtext)}>
                    {d.amountIn > 0 ? formatMoney(d.amountIn, currency).replace(/\s/g, "") : ""}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-[#6c47ff]/80 dark:bg-[#a78bff]/70"
                    style={{ height: `${h}%` }}
                    title={`${d.date}: ${formatMoney(d.amountIn, currency)}`}
                  />
                  <span className={cn("text-[9px]", portalSubtext)}>{d.date.slice(5)}</span>
                </div>
              );
            })}
            {!loading && (!sepay?.dailyInLast7Days || sepay.dailyInLast7Days.length === 0) && (
              <p className={cn("text-xs", portalSubtext)}>{s.noDailyData}</p>
            )}
          </div>
          {sepay?.message && !sepay.available ? (
            <p className={cn("text-[11px]", portalSubtext)}>{sepay.message}</p>
          ) : null}
        </div>
      </div>

      <div className={cn(portalCard, "overflow-hidden")}>
        <div className={cn("px-4 py-3 border-b", portalDivider)}>
          <p className={cn("text-sm font-semibold", portalHeading)}>{s.localTxTitle}</p>
          <p className={cn("text-[11px]", portalSubtext)}>{s.localTxDesc}</p>
        </div>
        <div className={cn("overflow-x-auto transition-opacity duration-[140ms]", txFading && "opacity-0")}>
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className={cn("border-b text-left", portalDivider)}>
                <th className={cn("px-3 py-2 font-semibold", portalSubtext)}>{s.colOrder}</th>
                <th className={cn("px-3 py-2 font-semibold", portalSubtext)}>{s.colUser}</th>
                <th className={cn("px-3 py-2 font-semibold", portalSubtext)}>{s.colAudience}</th>
                <th className={cn("px-3 py-2 font-semibold", portalSubtext)}>{s.colAmount}</th>
                <th className={cn("px-3 py-2 font-semibold", portalSubtext)}>{s.colStatus}</th>
                <th className={cn("px-3 py-2 font-semibold", portalSubtext)}>{s.colProvider}</th>
                <th className={cn("px-3 py-2 font-semibold", portalSubtext)}>{s.colTime}</th>
              </tr>
            </thead>
            <tbody>
              {pagedTxs.map((row) => (
                <tr key={row.id} className={cn("border-b last:border-0", portalDivider)}>
                  <td className={cn("px-3 py-2 font-mono", portalHeading)}>{row.orderCode || "—"}</td>
                  <td className={cn("px-3 py-2", portalSubtext)}>{row.userEmail || "—"}</td>
                  <td className={cn("px-3 py-2", portalHeading)}>
                    {row.audience || "—"}
                    {row.planCode ? ` · ${row.planCode}` : ""}
                  </td>
                  <td className={cn("px-3 py-2 font-semibold tabular-nums", portalHeading)}>
                    {formatMoney(row.amount, row.currency || currency)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", matchBadgeClass(row.status === "Paid" ? "Matched" : row.status === "Pending" ? "PendingLocal" : "Unmatched"))}>
                      {row.status}
                    </span>
                  </td>
                  <td className={cn("px-3 py-2", portalSubtext)}>{row.provider}</td>
                  <td className={cn("px-3 py-2 whitespace-nowrap", portalSubtext)}>
                    {row.confirmedAt || row.createdAt
                      ? new Date(row.confirmedAt || row.createdAt).toLocaleString(locale)
                      : "—"}
                  </td>
                </tr>
              ))}
              {!loading && txs.length === 0 && (
                <tr>
                  <td colSpan={7} className={cn("px-3 py-6 text-center", portalSubtext)}>
                    {s.noLocalRows}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {txs.length > PAGE_SIZE && (
          <div className={cn("flex items-center justify-between gap-3 px-4 py-3 border-t text-xs", portalDivider)}>
            <span className={portalSubtext}>
              {(txPage - 1) * PAGE_SIZE + 1}–{Math.min(txPage * PAGE_SIZE, txs.length)} / {txs.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={txPage === 1 || txFading}
                onClick={() => goToPage(txPage - 1)}
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
              >
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: totalTxPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalTxPages || Math.abs(p - txPage) <= 1)
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "…" ? (
                    <span key={`ellipsis-${i}`} className={cn("w-7 text-center select-none", portalSubtext)}>…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      disabled={txFading}
                      onClick={() => goToPage(item as number)}
                      className={cn(
                        "w-7 h-7 rounded-lg text-xs font-semibold border transition-all duration-200",
                        txPage === item
                          ? "bg-primary text-white border-primary scale-105 shadow-sm"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
                        txPage !== item && portalSubtext
                      )}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                type="button"
                disabled={txPage === totalTxPages || txFading}
                onClick={() => goToPage(txPage + 1)}
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
