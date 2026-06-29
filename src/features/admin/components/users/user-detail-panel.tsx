"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Ban, UserCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { getAdminUserStatus } from "@/features/admin/utils/admin-user-display";
import { AvatarCircle } from "@/shared/components/common/avatar-circle";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useOverlayTransition } from "@/shared/hooks/use-overlay-transition";
import type { AdminUserDetail } from "@/features/admin/types/admin-user";
import { portalDivider, portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

interface UserDetailPanelProps {
  open: boolean;
  user: AdminUserDetail | null;
  loading?: boolean;
  error?: string | null;
  statusUpdating?: boolean;
  onClose: () => void;
  onToggleStatus: (user: AdminUserDetail, nextActive: boolean) => void;
  onRetry?: () => void;
}

type PendingStatusAction = { user: AdminUserDetail; nextActive: boolean } | null;

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  const { t } = useLanguage();
  const noValue = t.adminPages.users.detail.noValue;

  return (
    <div className={cn("border-b py-3 last:border-0", portalDivider)}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </dt>
      <dd className={cn("mt-1 text-sm break-words", portalHeadingAlt)}>{value?.trim() || noValue}</dd>
    </div>
  );
}

function formatDate(value: string | undefined, locale: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
}: UserDetailPanelProps) {
  const { t, lang } = useLanguage();
  const d = t.adminPages.users.detail;
  const u = t.adminPages.users;
  const roleLabels = u.roles;
  const statusLabels = u.statusLabels;

  const { mounted, exiting } = useOverlayTransition(open, 300);
  const [pendingAction, setPendingAction] = useState<PendingStatusAction>(null);

  useEffect(() => {
    if (!open) setPendingAction(null);
  }, [open]);

  if (!mounted) return null;

  const statusKey = user ? getAdminUserStatus(user) : null;
  const confirmOpen = pendingAction !== null;
  const isDeactivate = pendingAction?.nextActive === false;

  function handleConfirmStatusChange() {
    if (!pendingAction) return;
    onToggleStatus(pendingAction.user, pendingAction.nextActive);
    setPendingAction(null);
  }

  function handleClose() {
    if (exiting || pendingAction) return;
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div
          className={cn(
            "absolute inset-0 bg-black/30 backdrop-blur-sm",
            exiting ? "animate-fade-out" : "animate-fade-in"
          )}
          onClick={handleClose}
          aria-hidden
        />
        <aside
          className={cn(
            "relative flex h-full w-full max-w-md flex-col border-l bg-white dark:bg-gray-900 shadow-[-8px_0_24px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_24px_rgba(0,0,0,0.3)]",
            portalDivider,
            exiting ? "animate-slide-out-right" : "animate-slide-right"
          )}
          role="dialog"
          aria-modal
          aria-labelledby="user-detail-title"
        >
          <div className={cn("flex items-center justify-between border-b px-5 py-4", portalDivider)}>
            <h2 id="user-detail-title" className={cn("text-base font-bold", portalHeadingAlt)}>
              {u.detailTitle}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading && (
              <div className="flex min-h-50 items-center justify-center">
                <Loader2 size={28} className="animate-spin text-[#7C3AED]" />
              </div>
            )}

            {error && !loading && (
              <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-6 text-center">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-3 text-sm font-semibold text-[#7C3AED] dark:text-[#a78bff] hover:underline"
                  >
                    {u.retry}
                  </button>
                )}
              </div>
            )}

            {user && !loading && !error && (
              <>
                <div className="mb-5 flex items-center gap-4">
                  <AvatarCircle avatarUrl={user.avatarUrl} fullName={user.fullName} size="lg" />
                  <div>
                    <p className={cn("text-lg font-bold", portalHeadingAlt)}>{user.fullName}</p>
                    <p className={cn("text-sm", portalSubtextAlt)}>{user.email}</p>
                  </div>
                </div>

                <dl>
                  <DetailRow label={d.fullName} value={user.fullName} />
                  <DetailRow label={d.email} value={user.email} />
                  <DetailRow label={d.role} value={roleLabels[user.roleKey]} />
                  <DetailRow
                    label={d.status}
                    value={statusKey ? statusLabels[statusKey] : undefined}
                  />
                  <DetailRow
                    label={d.createdAt}
                    value={formatDate(user.createdAt, lang === "vi" ? "vi-VN" : "en-US")}
                  />
                  <DetailRow label={d.phoneNumber} value={user.phoneNumber} />

                  {user.candidateProfile && (
                    <>
                      <DetailRow label={d.targetRole} value={user.candidateProfile.targetRole} />
                      <DetailRow
                        label={d.seniorityLevel}
                        value={user.candidateProfile.seniorityLevel}
                      />
                      <DetailRow
                        label={d.techStack}
                        value={user.candidateProfile.techStack?.join(", ")}
                      />
                      <DetailRow label={d.linkedInUrl} value={user.candidateProfile.linkedInUrl} />
                      <DetailRow label={d.githubUrl} value={user.candidateProfile.githubUrl} />
                      <DetailRow label={d.bio} value={user.candidateProfile.bio} />
                    </>
                  )}

                  {user.hrProfile && (
                    <>
                      <DetailRow label={d.companyName} value={user.hrProfile.companyName} />
                      <DetailRow label={d.jobTitle} value={user.hrProfile.jobTitle} />
                      <DetailRow label={d.linkedInUrl} value={user.hrProfile.linkedInUrl} />
                      <DetailRow label={d.bio} value={user.hrProfile.bio} />
                    </>
                  )}
                </dl>
              </>
            )}
          </div>

          {user && !loading && !error && (
            <div className={cn("border-t px-5 py-4", portalDivider)}>
              {user.isActive ? (
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => setPendingAction({ user, nextActive: false })}
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-100 dark:hover:bg-red-950/50 disabled:opacity-50"
                >
                  {statusUpdating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Ban size={14} />
                  )}
                  {u.deactivate}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => setPendingAction({ user, nextActive: true })}
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-lg bg-[#6c47ff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a3dd9] disabled:opacity-50"
                >
                  {statusUpdating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <UserCheck size={14} />
                  )}
                  {u.activate}
                </button>
              )}
            </div>
          )}
        </aside>
      </div>

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
    </>
  );
}
