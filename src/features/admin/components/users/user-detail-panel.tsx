"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Loader2,
  Ban,
  UserCheck,
  Crown,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  Link2,
  Code2,
  Sparkles,
  History,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { getAdminUserStatus } from "@/features/admin/utils/admin-user-display";
import { AvatarCircle } from "@/shared/components/common/avatar-circle";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import type { AdminUserDetail, AdminUserRoleKey, AdminUserStatusKey } from "@/features/admin/types/admin-user";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import {
  adminGetUserSubscription,
  adminGrantUserPremium,
  adminRevokeUserPremium,
  adminUpdateUserSubscription,
  isPremiumPlanCode,
  type AdminUserSubscriptionDetail,
  type AdminUserSubscriptionHistoryItem,
} from "@/features/subscription/services/subscription.service";

interface UserDetailPanelProps {
  open: boolean;
  user: AdminUserDetail | null;
  loading?: boolean;
  error?: string | null;
  statusUpdating?: boolean;
  onClose: () => void;
  onToggleStatus: (user: AdminUserDetail, nextActive: boolean) => void;
  onRetry?: () => void;
  /**
   * Called after a subscription grant/extend/revoke.
   * Passes the new planCode so the parent list can optimistically patch the row.
   */
  onSubscriptionChange?: (userId: string, newPlanCode: string | null) => void;
}

type PendingStatusAction = { user: AdminUserDetail; nextActive: boolean } | null;
type PeriodMonths = 1 | 3 | 6 | 12;

const PERIOD_OPTIONS: PeriodMonths[] = [1, 3, 6, 12];

const roleBadge: Record<AdminUserRoleKey, string> = {
  ADMIN: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  HR_MANAGER: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  JOB_SEEKER: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  UNKNOWN: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const statusBadge: Record<AdminUserStatusKey, string> = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Suspended: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function formatDate(value: string | undefined | null, locale: string, withTime = true): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function formatDateCompact(value: string | undefined | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${m}/${y}`;
}

function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function extractErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string; Message?: string } }; message?: string };
  const msg = e.response?.data?.message || e.response?.data?.Message || e.message;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

function historyTypeLabel(
  type: string,
  labels: { upgrade: string; cancel: string; pack: string; other: string }
): string {
  const t = type.toLowerCase();
  if (t.includes("upgrade")) return labels.upgrade;
  if (t.includes("cancel")) return labels.cancel;
  if (t.includes("askai") || t.includes("pack")) return labels.pack;
  return type || labels.other;
}

function MetaItem({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value?: string | null;
  href?: string | null;
}) {
  const display = value?.trim();
  if (!display) return null;

  return (
    <div className="flex gap-3 rounded-xl bg-slate-50/80 px-3.5 py-3 dark:bg-slate-800/40">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block truncate text-sm font-medium text-primary hover:underline dark:text-[#a78bff]"
          >
            {display}
          </a>
        ) : (
          <p title={display} className={cn("mt-0.5 text-sm font-medium truncate", portalHeadingAlt)}>{display}</p>
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  item,
  locale,
  labels,
}: {
  item: AdminUserSubscriptionHistoryItem;
  locale: string;
  labels: { upgrade: string; cancel: string; pack: string; other: string };
}) {
  const typeLower = item.type.toLowerCase();
  const isUpgrade = typeLower.includes("upgrade");
  const isCancel = typeLower.includes("cancel");

  return (
    <li className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800">
      <div className="min-w-0">
        <p className={cn("text-sm font-medium", portalHeadingAlt)}>
          {historyTypeLabel(item.type, labels)}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {formatDate(item.confirmedAt || item.createdAt, locale)}
          {item.provider ? ` · ${item.provider}` : ""}
        </p>
        {item.note && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.note}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-semibold tabular-nums", item.amount > 0 ? portalHeadingAlt : "text-slate-400")}>
          {item.amount > 0 ? formatMoney(item.amount, item.currency, locale) : "—"}
        </p>
        <span
          className={cn(
            "mt-0.5 inline-block text-[10px] font-semibold uppercase",
            isUpgrade && "text-amber-600 dark:text-amber-400",
            isCancel && "text-red-500",
            !isUpgrade && !isCancel && "text-slate-400"
          )}
        >
          {item.status}
        </span>
      </div>
    </li>
  );
}

export function UserDetailPanel({
  open,
  user,
  loading = false,
  error = null,
  statusUpdating = false,
  onClose,
  onToggleStatus,
  onRetry,
  onSubscriptionChange,
}: UserDetailPanelProps) {
  const { t, lang } = useLanguage();
  const { addToast } = useToast();
  const d = t.adminPages.users.detail;
  const u = t.adminPages.users;
  const subT = u.subscription;
  const roleLabels = u.roles;
  const statusLabels = u.statusLabels;
  const locale = lang === "vi" ? "vi-VN" : "en-US";

  const [pendingAction, setPendingAction] = useState<PendingStatusAction>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const [detail, setDetail] = useState<AdminUserSubscriptionDetail | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [subMutating, setSubMutating] = useState(false);
  const [periodMonths, setPeriodMonths] = useState<PeriodMonths>(1);
  const [note, setNote] = useState("");
  const [grantFormOpen, setGrantFormOpen] = useState(false);

  const canManageSub = !!user && user.roleKey !== "ADMIN";
  const sub = detail?.subscription ?? null;
  const history = detail?.history ?? [];
  const isPremium = sub ? isPremiumPlanCode(sub.planCode) : false;

  const loadSubscription = useCallback(
    async (userId: string) => {
      setSubLoading(true);
      setSubError(null);
      try {
        const data = await adminGetUserSubscription(userId);
        setDetail(data);
      } catch (err) {
        setDetail(null);
        setSubError(extractErrorMessage(err, subT.loadError));
      } finally {
        setSubLoading(false);
      }
    },
    [subT.loadError]
  );

  useEffect(() => {
    if (!open) {
      setPendingAction(null);
      setRevokeOpen(false);
      setDetail(null);
      setSubError(null);
      setNote("");
      setPeriodMonths(1);
      setGrantFormOpen(false);
      return;
    }
    if (user && canManageSub) {
      void loadSubscription(user.id);
    } else {
      setDetail(null);
      setSubError(null);
    }
  }, [open, user?.id, canManageSub, loadSubscription, user]);

  const statusKey = user ? getAdminUserStatus(user) : null;
  const confirmOpen = pendingAction !== null;
  const isDeactivate = pendingAction?.nextActive === false;

  function handleConfirmStatusChange() {
    if (!pendingAction) return;
    onToggleStatus(pendingAction.user, pendingAction.nextActive);
    setPendingAction(null);
  }

  function handleClose() {
    if (pendingAction || subMutating) return;
    onClose();
  }

  async function handleGrantSubmit() {
    if (!user) return;
    setSubMutating(true);
    try {
      const result = isPremium
        ? await adminUpdateUserSubscription(user.id, {
            periodMonths,
            note: note.trim() || undefined,
          })
        : await adminGrantUserPremium(user.id, {
            periodMonths,
            note: note.trim() || undefined,
          });
      setDetail(result);
      setGrantFormOpen(false);
      setNote("");
      addToast("success", isPremium ? subT.extendSuccess : subT.grantSuccess);
      onSubscriptionChange?.(user.id, result.subscription.planCode);
    } catch (err) {
      addToast("error", extractErrorMessage(err, isPremium ? subT.extendError : subT.grantError));
    } finally {
      setSubMutating(false);
    }
  }

  async function handleRevokeConfirm() {
    if (!user) return;
    setSubMutating(true);
    try {
      const result = await adminRevokeUserPremium(user.id, { note: note.trim() || undefined });
      setDetail(result);
      setRevokeOpen(false);
      addToast("success", subT.revokeSuccess);
      onSubscriptionChange?.(user.id, result.subscription.planCode);
    } catch (err) {
      addToast("error", extractErrorMessage(err, subT.revokeError));
    } finally {
      setSubMutating(false);
    }
  }

  const profileItems: Array<{
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value?: string | null;
    href?: string | null;
  }> = [];

  if (user) {
    profileItems.push(
      { icon: Mail, label: d.email, value: user.email },
      { icon: Phone, label: d.phoneNumber, value: user.phoneNumber },
      { icon: Calendar, label: d.createdAt, value: formatDate(user.createdAt, locale) }
    );

    if (user.candidateProfile) {
      profileItems.push(
        { icon: Briefcase, label: d.targetRole, value: user.candidateProfile.targetRole },
        { icon: Sparkles, label: d.seniorityLevel, value: user.candidateProfile.seniorityLevel },
        {
          icon: Link2,
          label: d.linkedInUrl,
          value: user.candidateProfile.linkedInUrl,
          href: user.candidateProfile.linkedInUrl,
        },
        {
          icon: Code2,
          label: d.githubUrl,
          value: user.candidateProfile.githubUrl,
          href: user.candidateProfile.githubUrl,
        }
      );
    }

    if (user.hrProfile) {
      profileItems.push(
        { icon: Building2, label: d.companyName, value: user.hrProfile.companyName },
        { icon: Briefcase, label: d.jobTitle, value: user.hrProfile.jobTitle },
        {
          icon: Link2,
          label: d.linkedInUrl,
          value: user.hrProfile.linkedInUrl,
          href: user.hrProfile.linkedInUrl,
        }
      );
    }
  }

  const bio = user?.candidateProfile?.bio?.trim() || user?.hrProfile?.bio?.trim() || "";
  const techStack = user?.candidateProfile?.techStack ?? [];

  const histLabels = {
    upgrade: subT.historyTypeUpgrade,
    cancel: subT.historyTypeCancel,
    pack: subT.historyTypePack,
    other: subT.historyTypeOther,
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="udp-backdrop"
            className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            aria-hidden
          />
        )}
        {open && (
          <motion.div
            key="udp-drawer"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-120 flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[-8px_0_60px_-8px_rgba(15,23,42,0.2)] dark:border-slate-700 dark:bg-slate-900"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-modal
            aria-labelledby="user-detail-title"
          >
          <div className="relative shrink-0">
            <div className="h-28 bg-linear-to-br from-primary via-[#7c5cff] to-cyan-400 sm:h-32" />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
              <p
                id="user-detail-title"
                className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white backdrop-blur-sm"
              >
                {u.detailTitle}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              >
                <X size={16} />
              </button>
            </div>

            {user && !loading && !error && (
              <div className="absolute left-5 sm:left-6 -bottom-12">
                <div className="rounded-full bg-white p-1 shadow-lg ring-4 ring-white dark:bg-slate-900 dark:ring-slate-900">
                  <AvatarCircle
                    key={user.avatarUrl || user.id}
                    avatarUrl={user.avatarUrl}
                    fullName={user.fullName}
                    size="lg"
                    className="h-20! w-20! text-xl!"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && (
              <div className="flex min-h-56 items-center justify-center pt-16">
                <Loader2 size={28} className="animate-spin text-[#7C3AED]" />
              </div>
            )}

            {error && !loading && (
              <div className="mx-6 mt-16 rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-center dark:border-red-900 dark:bg-red-950/30">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-3 text-sm font-semibold text-[#7C3AED] hover:underline dark:text-[#a78bff]"
                  >
                    {u.retry}
                  </button>
                )}
              </div>
            )}

            {user && !loading && !error && (
              <div className="px-5 pb-5 pt-16 sm:px-6">
                {/* Identity + Gán Premium button */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className={cn("text-xl font-bold tracking-tight", portalHeadingAlt)}>
                      {user.fullName}
                    </h3>
                    <p className={cn("mt-0.5 text-sm", portalSubtextAlt)}>{user.email}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          roleBadge[user.roleKey]
                        )}
                      >
                        {roleLabels[user.roleKey]}
                      </span>
                      {statusKey && (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                            statusBadge[statusKey]
                          )}
                        >
                          {statusLabels[statusKey]}
                        </span>
                      )}
                      {canManageSub && sub && !subLoading && (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
                            isPremium
                              ? "bg-amber-500 text-white"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
                          )}
                        >
                          {isPremium ? "Premium" : "Free"}
                        </span>
                      )}
                    </div>
                    {canManageSub && sub && !subLoading && (
                      <p className="mt-2 text-[11px] text-slate-400">
                        {sub.planName || sub.planCode}
                        {" · "}
                        {formatDateCompact(sub.periodStart)}
                        {" → "}
                        {formatDateCompact(sub.periodEnd)}
                      </p>
                    )}
                  </div>

                  {canManageSub && !subLoading && !subError && sub && (
                    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                      {!grantFormOpen && (
                        <button
                          type="button"
                          disabled={subMutating}
                          onClick={() => setGrantFormOpen(true)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:bg-primary-hover disabled:opacity-50"
                        >
                          <Crown size={15} />
                          {isPremium ? subT.extend : subT.grant}
                        </button>
                      )}
                      {isPremium && !grantFormOpen && (
                        <button
                          type="button"
                          disabled={subMutating}
                          onClick={() => setRevokeOpen(true)}
                          className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-red-500 hover:underline"
                        >
                          {subT.revoke}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Form gán — chỉ khi bấm nút */}
                {canManageSub && grantFormOpen && (
                  <div className="mb-6 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-4 dark:border-violet-800/50 dark:bg-violet-950/20">
                    <p className={cn("mb-3 text-sm font-semibold", portalHeadingAlt)}>
                      {isPremium ? subT.extend : subT.grant}
                    </p>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {subT.periodMonths}
                    </p>
                    <div className="mb-3 grid grid-cols-4 gap-1.5">
                      {PERIOD_OPTIONS.map((m) => {
                        const selected = periodMonths === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            disabled={subMutating}
                            onClick={() => setPeriodMonths(m)}
                            className={cn(
                              "rounded-lg py-2 text-sm font-semibold transition",
                              selected
                                ? "bg-primary text-white"
                                : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
                            )}
                          >
                            {m}m
                          </button>
                        );
                      })}
                    </div>
                    <label className="mb-3 block">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {subT.note}
                      </span>
                      <textarea
                        value={note}
                        disabled={subMutating}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        maxLength={400}
                        placeholder={subT.notePlaceholder}
                        className="mt-1.5 w-full resize-none rounded-xl border-0 bg-white px-3 py-2 text-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-slate-900 dark:ring-slate-700"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={subMutating}
                        onClick={() => {
                          setGrantFormOpen(false);
                          setNote("");
                        }}
                        className="min-h-10 flex-1 rounded-xl text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-white dark:text-slate-300 dark:ring-slate-700"
                      >
                        {u.modal.cancel}
                      </button>
                      <button
                        type="button"
                        disabled={subMutating}
                        onClick={() => void handleGrantSubmit()}
                        className="inline-flex min-h-10 flex-[1.4] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                      >
                        {subMutating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Crown size={14} />
                        )}
                        {isPremium ? subT.extend : subT.grant}
                      </button>
                    </div>
                  </div>
                )}

                {/* Hồ sơ chi tiết */}
                <section className="mb-6">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {lang === "vi" ? "Hồ sơ chi tiết" : "Profile details"}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {profileItems.map((item, idx) => (
                      <MetaItem
                        key={`${item.label}-${idx}`}
                        icon={item.icon}
                        label={item.label}
                        value={item.value}
                        href={item.href}
                      />
                    ))}
                  </div>

                  {techStack.length > 0 && (
                    <div className="mt-2 rounded-xl bg-slate-50/80 px-3.5 py-3 dark:bg-slate-800/40">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {d.techStack}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {techStack.map((tech) => (
                          <span
                            key={tech}
                            className="inline-flex items-center rounded-full bg-slate-200/70 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700/60 dark:text-slate-300"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {bio && (
                    <div className="mt-2 rounded-xl bg-slate-50/80 px-3.5 py-3 dark:bg-slate-800/40">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {d.bio}
                      </p>
                      <p className={cn("mt-1 text-sm leading-relaxed", portalHeadingAlt)}>{bio}</p>
                    </div>
                  )}
                </section>

                {/* Lịch sử gói — phụ, gọn */}
                {canManageSub && (
                  <section>
                    <div className="mb-2 flex items-center gap-1.5">
                      <History size={13} className="text-slate-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {subT.historyTitle}
                      </h4>
                    </div>

                    {subLoading && (
                      <div className="flex justify-center py-6">
                        <Loader2 size={20} className="animate-spin text-[#7C3AED]" />
                      </div>
                    )}

                    {subError && !subLoading && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-center dark:border-red-900 dark:bg-red-950/30">
                        <p className="text-sm text-red-700 dark:text-red-400">{subError}</p>
                        <button
                          type="button"
                          onClick={() => void loadSubscription(user.id)}
                          className="mt-1 text-sm font-semibold text-[#7C3AED] hover:underline"
                        >
                          {u.retry}
                        </button>
                      </div>
                    )}

                    {!subLoading && !subError && history.length === 0 && (
                      <p className={cn("rounded-xl bg-slate-50 px-4 py-5 text-center text-sm dark:bg-slate-800/40", portalSubtextAlt)}>
                        {subT.historyEmpty}
                      </p>
                    )}

                    {!subLoading && !subError && history.length > 0 && (
                      <ul className="max-h-48 overflow-y-auto rounded-xl bg-slate-50/80 px-3.5 dark:bg-slate-800/40">
                        {history.map((item) => (
                          <HistoryRow
                            key={item.id}
                            item={item}
                            locale={locale}
                            labels={histLabels}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>

          {user && !loading && !error && (
            <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/80 sm:px-6">
              {user.isActive ? (
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => setPendingAction({ user, nextActive: false })}
                  className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  {statusUpdating ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                  {u.deactivate}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => setPendingAction({ user, nextActive: true })}
                  className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {statusUpdating ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <UserCheck size={15} />
                  )}
                  {u.activate}
                </button>
              )}
            </div>
          )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmOpen}
        title={isDeactivate ? u.deactivateTitle : u.activateTitle}
        message={isDeactivate ? u.deactivateConfirm : u.activateConfirm}
        confirmLabel={isDeactivate ? u.deactivate : u.activate}
        cancelLabel={u.modal.cancel}
        variant={isDeactivate ? "danger" : "primary"}
        loading={statusUpdating}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmDialog
        open={revokeOpen}
        title={subT.revokeTitle}
        message={subT.revokeConfirm}
        confirmLabel={subT.revoke}
        cancelLabel={u.modal.cancel}
        variant="danger"
        loading={subMutating}
        onConfirm={() => void handleRevokeConfirm()}
        onCancel={() => setRevokeOpen(false)}
      />

    </>
  );
}
