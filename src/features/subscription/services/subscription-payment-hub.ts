import * as signalR from "@microsoft/signalr";
import { getApiBaseUrl } from "@/core/config/env";
import { getAccessToken } from "@/core/auth/token.service";

/** Path hub BE (Program.cs MapHub). */
export const SUBSCRIPTION_PAYMENT_HUB_PATH = "/hubs/subscription-payments";

/** Event name match SubscriptionPaymentHub.PaymentPaidEvent */
export const PAYMENT_PAID_EVENT = "PaymentPaid";

export interface PaymentPaidEvent {
  orderCode: string;
  status: string;
  amount: number;
  currency: string;
  confirmedAt?: string;
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
}

/** Normalize PascalCase / camelCase payload từ BE. */
export function normalizePaymentPaidEvent(raw: unknown): PaymentPaidEvent | null {
  const o = asRecord(raw);
  if (!o) return null;
  const orderCode =
    (typeof o.orderCode === "string" && o.orderCode) ||
    (typeof o.OrderCode === "string" && o.OrderCode) ||
    "";
  if (!orderCode) return null;
  const amount =
    typeof o.amount === "number"
      ? o.amount
      : typeof o.Amount === "number"
        ? o.Amount
        : 0;
  const currency =
    (typeof o.currency === "string" && o.currency) ||
    (typeof o.Currency === "string" && o.Currency) ||
    "VND";
  const status =
    (typeof o.status === "string" && o.status) ||
    (typeof o.Status === "string" && o.Status) ||
    "Paid";
  const confirmedAt =
    (typeof o.confirmedAt === "string" && o.confirmedAt) ||
    (typeof o.ConfirmedAt === "string" && o.ConfirmedAt) ||
    undefined;
  return { orderCode, status, amount, currency, confirmedAt };
}

/**
 * Tạo connection SignalR tới hub thanh toán subscription.
 * JWT qua accessTokenFactory → BE OnMessageReceived map query access_token.
 */
export function createSubscriptionPaymentHubConnection(): signalR.HubConnection {
  const base = getApiBaseUrl();
  return new signalR.HubConnectionBuilder()
    .withUrl(`${base}${SUBSCRIPTION_PAYMENT_HUB_PATH}`, {
      accessTokenFactory: () => getAccessToken() ?? "",
      // Long polling fallback nếu WebSocket bị proxy chặn
      transport:
        signalR.HttpTransportType.WebSockets |
        signalR.HttpTransportType.ServerSentEvents |
        signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.None)
    .build();
}
