import { apiClient } from "@/core/api/http-client";

/** BE MySubscriptionDto / Plan limits — camelCase hoặc PascalCase. */
export interface SubscriptionLimits {
  generateCooldownHours: number;
  generateUnlimited: boolean;
  generatePerWindow: number;
  planRegeneratePerDraft: number;
  canExport: boolean;
  askAiPerMonth: number;
  canPublish: boolean;
  freeVisiblePercent: number;
  canPersistHrRecommendation: boolean;
  feedbackOnlyOnVisible: boolean;
}

export interface SubscriptionEntitlements {
  canExport: boolean;
  canAskAi: boolean;
  generateUnlimited: boolean;
  freeVisiblePercent: number;
  canPersistHrRecommendation: boolean;
}

export interface MySubscription {
  planCode: string;
  planName: string;
  audience: string;
  status: string;
  priceMonthly: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  cancelAtPeriodEnd?: boolean;
  lastSuccessfulGenerateAt?: string | null;
  limits: SubscriptionLimits;
  askAiUsed: number;
  askAiLimit: number;
  generateSetUsed: number;
  generateWindowUsed: number;
  generateWindowLimit: number;
  entitlements: SubscriptionEntitlements;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  audience: string;
  name: string;
  priceMonthly: number;
  currency: string;
  isActive: boolean;
  limits: SubscriptionLimits;
  appliesToExistingSubscribersFromNextPeriod?: boolean;
}

export interface UsageCounterRow {
  usageType: string;
  scopeKey?: string;
  usedCount: number;
  extraFromPack: number;
  periodStart: string;
}

export interface UpgradePaymentIntent {
  orderCode: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: string;
  paymentUrl?: string | null;
  qrContent?: string | null;
  qrImageUrl?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  transferContent?: string | null;
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
}

function unwrapData(raw: unknown): Record<string, unknown> {
  const root = asRecord(raw);
  if (!root) return {};
  const data = asRecord(root.data);
  return data ?? root;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
  }
  return "";
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
  }
  return 0;
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
  }
  return false;
}

function normalizeLimits(raw: unknown): SubscriptionLimits {
  const o = asRecord(raw) ?? {};
  return {
    generateCooldownHours: pickNumber(o, "generateCooldownHours", "GenerateCooldownHours"),
    generateUnlimited: pickBool(o, "generateUnlimited", "GenerateUnlimited"),
    generatePerWindow: pickNumber(o, "generatePerWindow", "GeneratePerWindow") || 4,
    planRegeneratePerDraft: pickNumber(o, "planRegeneratePerDraft", "PlanRegeneratePerDraft"),
    canExport: pickBool(o, "canExport", "CanExport"),
    askAiPerMonth: pickNumber(o, "askAiPerMonth", "AskAiPerMonth"),
    canPublish:
      "canPublish" in o || "CanPublish" in o
        ? pickBool(o, "canPublish", "CanPublish")
        : true,
    freeVisiblePercent: pickNumber(o, "freeVisiblePercent", "FreeVisiblePercent") || 20,
    canPersistHrRecommendation: pickBool(o, "canPersistHrRecommendation", "CanPersistHrRecommendation"),
    feedbackOnlyOnVisible: pickBool(o, "feedbackOnlyOnVisible", "FeedbackOnlyOnVisible"),
  };
}

function normalizeEntitlements(raw: unknown, limits: SubscriptionLimits): SubscriptionEntitlements {
  const o = asRecord(raw) ?? {};
  return {
    canExport: pickBool(o, "canExport", "CanExport") || limits.canExport,
    canAskAi: pickBool(o, "canAskAi", "CanAskAi") || limits.askAiPerMonth > 0,
    generateUnlimited: pickBool(o, "generateUnlimited", "GenerateUnlimited") || limits.generateUnlimited,
    freeVisiblePercent: pickNumber(o, "freeVisiblePercent", "FreeVisiblePercent") || limits.freeVisiblePercent,
    canPersistHrRecommendation:
      pickBool(o, "canPersistHrRecommendation", "CanPersistHrRecommendation") ||
      limits.canPersistHrRecommendation,
  };
}

export function normalizeMySubscription(raw: unknown): MySubscription {
  const src = unwrapData(raw);
  const limits = normalizeLimits(src.limits ?? src.Limits);
  return {
    planCode: pickString(src, "planCode", "PlanCode"),
    planName: pickString(src, "planName", "PlanName"),
    audience: pickString(src, "audience", "Audience"),
    status: pickString(src, "status", "Status"),
    priceMonthly: pickNumber(src, "priceMonthly", "PriceMonthly"),
    currency: pickString(src, "currency", "Currency") || "VND",
    periodStart: pickString(src, "periodStart", "PeriodStart"),
    periodEnd: pickString(src, "periodEnd", "PeriodEnd"),
    cancelAtPeriodEnd: pickBool(src, "cancelAtPeriodEnd", "CancelAtPeriodEnd"),
    lastSuccessfulGenerateAt:
      pickString(src, "lastSuccessfulGenerateAt", "LastSuccessfulGenerateAt") || null,
    limits,
    askAiUsed: pickNumber(src, "askAiUsed", "AskAiUsed"),
    askAiLimit: pickNumber(src, "askAiLimit", "AskAiLimit"),
    generateSetUsed: pickNumber(src, "generateSetUsed", "GenerateSetUsed"),
    generateWindowUsed: pickNumber(src, "generateWindowUsed", "GenerateWindowUsed"),
    generateWindowLimit:
      pickNumber(src, "generateWindowLimit", "GenerateWindowLimit") || limits.generatePerWindow,
    entitlements: normalizeEntitlements(src.entitlements ?? src.Entitlements, limits),
  };
}

function normalizePlan(raw: unknown): SubscriptionPlan | null {
  const src = asRecord(raw);
  if (!src) return null;
  const id = pickString(src, "id", "Id");
  const code = pickString(src, "code", "Code");
  if (!id && !code) return null;
  return {
    id: id || code,
    code,
    audience: pickString(src, "audience", "Audience"),
    name: pickString(src, "name", "Name"),
    priceMonthly: pickNumber(src, "priceMonthly", "PriceMonthly"),
    currency: pickString(src, "currency", "Currency") || "VND",
    isActive: pickBool(src, "isActive", "IsActive") || true,
    limits: normalizeLimits(src.limits ?? src.Limits),
    appliesToExistingSubscribersFromNextPeriod: true,
  };
}

export function isPremiumPlanCode(planCode: string): boolean {
  return planCode.toUpperCase().includes("PREMIUM");
}

function normalizeUpgradePaymentIntent(raw: unknown): UpgradePaymentIntent {
  const src = unwrapData(raw);
  return {
    orderCode: pickString(src, "orderCode", "OrderCode"),
    provider: pickString(src, "provider", "Provider") || "SePay",
    amount: pickNumber(src, "amount", "Amount"),
    currency: pickString(src, "currency", "Currency") || "VND",
    status: pickString(src, "status", "Status") || "Pending",
    expiresAt: pickString(src, "expiresAt", "ExpiresAt"),
    paymentUrl: pickString(src, "paymentUrl", "PaymentUrl") || null,
    qrContent: pickString(src, "qrContent", "QrContent") || null,
    qrImageUrl: pickString(src, "qrImageUrl", "QrImageUrl") || null,
    bankName: pickString(src, "bankName", "BankName") || null,
    bankAccountName: pickString(src, "bankAccountName", "BankAccountName") || null,
    bankAccountNumber: pickString(src, "bankAccountNumber", "BankAccountNumber") || null,
    transferContent: pickString(src, "transferContent", "TransferContent") || null,
  };
}

/** GET /api/plans?audience=HR|Candidate */
export async function listSubscriptionPlans(audience: "HR" | "Candidate"): Promise<SubscriptionPlan[]> {
  const res = await apiClient.get("/api/plans", { params: { audience } });
  const root = asRecord(res.data);
  const data = root?.data;
  const list = Array.isArray(data) ? data : Array.isArray(root) ? (res.data as unknown[]) : [];
  return list.map(normalizePlan).filter((p): p is SubscriptionPlan => p !== null);
}

/** GET /api/me/subscription */
export async function getMySubscription(): Promise<MySubscription> {
  const res = await apiClient.get("/api/me/subscription");
  return normalizeMySubscription(res.data);
}

/** GET /api/me/usage */
export async function getMyUsage(): Promise<UsageCounterRow[]> {
  const res = await apiClient.get("/api/me/usage");
  const root = asRecord(res.data);
  const data = root?.data;
  const list = Array.isArray(data) ? data : [];
  return list.map((row) => {
    const o = asRecord(row) ?? {};
    return {
      usageType: pickString(o, "usageType", "UsageType"),
      scopeKey: pickString(o, "scopeKey", "ScopeKey") || undefined,
      usedCount: pickNumber(o, "usedCount", "UsedCount"),
      extraFromPack: pickNumber(o, "extraFromPack", "ExtraFromPack"),
      periodStart: pickString(o, "periodStart", "PeriodStart"),
    };
  });
}

/** POST /api/me/subscription/upgrade */
export async function createUpgradePaymentOrder(): Promise<UpgradePaymentIntent> {
  const res = await apiClient.post("/api/me/subscription/upgrade", {});
  return normalizeUpgradePaymentIntent(res.data);
}

/** GET /api/me/subscription/upgrade/{orderCode} */
export async function getUpgradePaymentStatus(orderCode: string): Promise<UpgradePaymentIntent> {
  const res = await apiClient.get(`/api/me/subscription/upgrade/${orderCode}`);
  return normalizeUpgradePaymentIntent(res.data);
}

/** POST /api/me/subscription/cancel */
export async function cancelSubscriptionSandbox(): Promise<MySubscription> {
  const res = await apiClient.post("/api/me/subscription/cancel");
  return normalizeMySubscription(res.data);
}

/** POST /api/me/packs/ask-ai */
export async function purchaseAskAiPack(extraRequests = 200, amount = 99000): Promise<MySubscription> {
  const res = await apiClient.post("/api/me/packs/ask-ai", { extraRequests, amount });
  return normalizeMySubscription(res.data);
}

/** Admin: GET /api/admin/plans */
export async function adminListPlans(): Promise<SubscriptionPlan[]> {
  const res = await apiClient.get("/api/admin/plans");
  const root = asRecord(res.data);
  const data = root?.data;
  const list = Array.isArray(data) ? data : [];
  return list.map(normalizePlan).filter((p): p is SubscriptionPlan => p !== null);
}

/** Admin: PUT /api/admin/plans/{id} */
export async function adminUpdatePlan(
  id: string,
  payload: {
    name?: string;
    priceMonthly?: number;
    isActive?: boolean;
    limits?: SubscriptionLimits | Partial<SubscriptionLimits>;
  }
): Promise<{ plan: SubscriptionPlan; message: string }> {
  const res = await apiClient.put(`/api/admin/plans/${id}`, payload);
  const root = unwrapData(res.data);
  const planRaw = root.plan ?? root;
  const plan = normalizePlan(planRaw);
  if (!plan) throw new Error("Invalid plan response");
  return {
    plan,
    message: pickString(root, "message", "Message") || "Updated",
  };
}

/** SCRUM-385: admin subscription payment KPI */
export interface AdminSubscriptionStats {
  revenueThisMonth: number;
  currency: string;
  pendingOrders: number;
  premiumHrActive: number;
  premiumCandidateActive: number;
  estimatedMrr: number;
  paidRateLast30Days: number;
  paidLast30Days: number;
  closedLast30Days: number;
}

export interface AdminSubscriptionTransactionRow {
  id: string;
  orderCode?: string | null;
  type: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  audience?: string | null;
  planCode?: string | null;
  userEmail?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  expiresAt?: string | null;
}

export interface AdminSePayBankCard {
  available: boolean;
  bankName?: string | null;
  accountHolderName?: string | null;
  accountNumberMasked?: string | null;
  accumulated: number;
  lastTransaction?: string | null;
  active: boolean;
  message?: string | null;
}

export interface AdminSePayLiveTxRow {
  id: string;
  transactionDate?: string | null;
  amountIn: number;
  transactionContent?: string | null;
  referenceNumber?: string | null;
  bankBrandName?: string | null;
  webhookSuccess?: number | null;
  matchStatus: string;
  matchedOrderCode?: string | null;
}

export interface AdminSePayDailyIn {
  date: string;
  amountIn: number;
}

export interface AdminSePayOverview {
  available: boolean;
  message?: string | null;
  bank: AdminSePayBankCard;
  recentInflows: AdminSePayLiveTxRow[];
  dailyInLast7Days: AdminSePayDailyIn[];
  cachedAt?: string | null;
}

function normalizeAdminStats(raw: unknown): AdminSubscriptionStats {
  const o = asRecord(raw) ?? {};
  return {
    revenueThisMonth: pickNumber(o, "revenueThisMonth", "RevenueThisMonth"),
    currency: pickString(o, "currency", "Currency") || "VND",
    pendingOrders: pickNumber(o, "pendingOrders", "PendingOrders"),
    premiumHrActive: pickNumber(o, "premiumHrActive", "PremiumHrActive"),
    premiumCandidateActive: pickNumber(o, "premiumCandidateActive", "PremiumCandidateActive"),
    estimatedMrr: pickNumber(o, "estimatedMrr", "EstimatedMrr"),
    paidRateLast30Days: pickNumber(o, "paidRateLast30Days", "PaidRateLast30Days"),
    paidLast30Days: pickNumber(o, "paidLast30Days", "PaidLast30Days"),
    closedLast30Days: pickNumber(o, "closedLast30Days", "ClosedLast30Days"),
  };
}

function normalizeAdminTxRow(raw: unknown): AdminSubscriptionTransactionRow | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = pickString(o, "id", "Id");
  if (!id) return null;
  return {
    id,
    orderCode: pickString(o, "orderCode", "OrderCode") || null,
    type: pickString(o, "type", "Type"),
    status: pickString(o, "status", "Status"),
    provider: pickString(o, "provider", "Provider"),
    amount: pickNumber(o, "amount", "Amount"),
    currency: pickString(o, "currency", "Currency") || "VND",
    audience: pickString(o, "audience", "Audience") || null,
    planCode: pickString(o, "planCode", "PlanCode") || null,
    userEmail: pickString(o, "userEmail", "UserEmail") || null,
    createdAt: pickString(o, "createdAt", "CreatedAt"),
    confirmedAt: pickString(o, "confirmedAt", "ConfirmedAt") || null,
    expiresAt: pickString(o, "expiresAt", "ExpiresAt") || null,
  };
}

function normalizeSePayOverview(raw: unknown): AdminSePayOverview {
  const o = asRecord(raw) ?? {};
  const bankRaw = asRecord(o.bank ?? o.Bank) ?? {};
  const inflows = Array.isArray(o.recentInflows)
    ? o.recentInflows
    : Array.isArray(o.RecentInflows)
      ? o.RecentInflows
      : [];
  const daily = Array.isArray(o.dailyInLast7Days)
    ? o.dailyInLast7Days
    : Array.isArray(o.DailyInLast7Days)
      ? o.DailyInLast7Days
      : [];

  return {
    available: pickBool(o, "available", "Available"),
    message: pickString(o, "message", "Message") || null,
    bank: {
      available: pickBool(bankRaw, "available", "Available"),
      bankName: pickString(bankRaw, "bankName", "BankName") || null,
      accountHolderName: pickString(bankRaw, "accountHolderName", "AccountHolderName") || null,
      accountNumberMasked: pickString(bankRaw, "accountNumberMasked", "AccountNumberMasked") || null,
      accumulated: pickNumber(bankRaw, "accumulated", "Accumulated"),
      lastTransaction: pickString(bankRaw, "lastTransaction", "LastTransaction") || null,
      active: pickBool(bankRaw, "active", "Active"),
      message: pickString(bankRaw, "message", "Message") || null,
    },
    recentInflows: inflows.map((row) => {
      const r = asRecord(row) ?? {};
      return {
        id: pickString(r, "id", "Id"),
        transactionDate: pickString(r, "transactionDate", "TransactionDate") || null,
        amountIn: pickNumber(r, "amountIn", "AmountIn"),
        transactionContent: pickString(r, "transactionContent", "TransactionContent") || null,
        referenceNumber: pickString(r, "referenceNumber", "ReferenceNumber") || null,
        bankBrandName: pickString(r, "bankBrandName", "BankBrandName") || null,
        webhookSuccess: (() => {
          if (!("webhookSuccess" in r) && !("WebhookSuccess" in r)) return null;
          const v = r.webhookSuccess ?? r.WebhookSuccess;
          if (v === null || v === undefined) return null;
          return typeof v === "number" ? v : Number(v);
        })(),
        matchStatus: pickString(r, "matchStatus", "MatchStatus") || "Unknown",
        matchedOrderCode: pickString(r, "matchedOrderCode", "MatchedOrderCode") || null,
      };
    }),
    dailyInLast7Days: daily.map((row) => {
      const r = asRecord(row) ?? {};
      return {
        date: pickString(r, "date", "Date"),
        amountIn: pickNumber(r, "amountIn", "AmountIn"),
      };
    }),
    cachedAt: pickString(o, "cachedAt", "CachedAt") || null,
  };
}

/** GET /api/admin/subscription/stats */
export async function adminGetSubscriptionStats(): Promise<AdminSubscriptionStats> {
  const res = await apiClient.get("/api/admin/subscription/stats");
  return normalizeAdminStats(unwrapData(res.data));
}

/** GET /api/admin/subscription/transactions */
export async function adminListSubscriptionTransactions(take = 20): Promise<AdminSubscriptionTransactionRow[]> {
  const res = await apiClient.get("/api/admin/subscription/transactions", { params: { take } });
  const root = asRecord(res.data);
  const data = root?.data;
  const list = Array.isArray(data) ? data : [];
  return list.map(normalizeAdminTxRow).filter((r): r is AdminSubscriptionTransactionRow => r !== null);
}

/** GET /api/admin/subscription/sepay-overview */
export async function adminGetSePayOverview(refresh = false): Promise<AdminSePayOverview> {
  const res = await apiClient.get("/api/admin/subscription/sepay-overview", {
    params: refresh ? { refresh: true } : undefined,
  });
  return normalizeSePayOverview(unwrapData(res.data));
}

/** SCRUM-386: subscription + lịch sử giao dịch user (admin). */
export interface AdminUserSubscriptionHistoryItem {
  id: string;
  type: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  orderCode?: string | null;
  note?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
}

export interface AdminUserSubscriptionDetail {
  subscription: MySubscription;
  history: AdminUserSubscriptionHistoryItem[];
}

function normalizeHistoryItem(raw: unknown): AdminUserSubscriptionHistoryItem | null {
  const o = asRecord(raw);
  if (!o) return null;
  const id = pickString(o, "id", "Id");
  if (!id) return null;
  return {
    id,
    type: pickString(o, "type", "Type"),
    status: pickString(o, "status", "Status"),
    provider: pickString(o, "provider", "Provider"),
    amount: pickNumber(o, "amount", "Amount"),
    currency: pickString(o, "currency", "Currency") || "VND",
    orderCode: pickString(o, "orderCode", "OrderCode") || null,
    note: pickString(o, "note", "Note") || null,
    createdAt: pickString(o, "createdAt", "CreatedAt"),
    confirmedAt: pickString(o, "confirmedAt", "ConfirmedAt") || null,
  };
}

function normalizeAdminUserSubscriptionDetail(raw: unknown): AdminUserSubscriptionDetail {
  const root = unwrapData(raw);
  // Hỗ trợ both nested { subscription, history } và flat MySubscription (backward)
  const subSrc = asRecord(root.subscription ?? root.Subscription) ?? root;
  const histRaw = root.history ?? root.History;
  const histList = Array.isArray(histRaw) ? histRaw : [];
  return {
    subscription: normalizeMySubscription(
      asRecord(root.subscription ?? root.Subscription) ? { data: subSrc } : raw
    ),
    history: histList
      .map(normalizeHistoryItem)
      .filter((r): r is AdminUserSubscriptionHistoryItem => r !== null),
  };
}

/** SCRUM-386: GET /api/admin/users/{userId}/subscription */
export async function adminGetUserSubscription(userId: string): Promise<AdminUserSubscriptionDetail> {
  const res = await apiClient.get(`/api/admin/users/${userId}/subscription`);
  return normalizeAdminUserSubscriptionDetail(res.data);
}

/** POST /api/admin/users/{userId}/subscription/activate-premium */
export async function adminGrantUserPremium(
  userId: string,
  body: { periodMonths?: number; note?: string } = {}
): Promise<AdminUserSubscriptionDetail> {
  const res = await apiClient.post(`/api/admin/users/${userId}/subscription/activate-premium`, {
    periodMonths: body.periodMonths ?? 1,
    note: body.note ?? null,
  });
  return normalizeAdminUserSubscriptionDetail(res.data);
}

/** PUT /api/admin/users/{userId}/subscription — gia hạn khi đang Premium */
export async function adminUpdateUserSubscription(
  userId: string,
  body: { periodMonths: number; note?: string }
): Promise<AdminUserSubscriptionDetail> {
  const res = await apiClient.put(`/api/admin/users/${userId}/subscription`, {
    periodMonths: body.periodMonths,
    note: body.note ?? null,
  });
  return normalizeAdminUserSubscriptionDetail(res.data);
}

/** POST /api/admin/users/{userId}/subscription/revoke */
export async function adminRevokeUserPremium(
  userId: string,
  body: { note?: string } = {}
): Promise<AdminUserSubscriptionDetail> {
  const res = await apiClient.post(`/api/admin/users/${userId}/subscription/revoke`, {
    note: body.note ?? null,
  });
  return normalizeAdminUserSubscriptionDetail(res.data);
}

export function getSubscriptionErrorCode(err: unknown): string | null {
  const e = err as {
    response?: { data?: { errorCode?: string; extensions?: { errorCode?: string } } };
  };
  const data = e.response?.data;
  if (!data) return null;
  if (typeof data.errorCode === "string") return data.errorCode;
  if (data.extensions && typeof data.extensions.errorCode === "string") return data.extensions.errorCode;
  return null;
}
