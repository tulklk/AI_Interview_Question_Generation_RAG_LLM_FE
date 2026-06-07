"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Ban, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { getAdminUserStatus } from "@/lib/admin-user-display";
import { AvatarCircle } from "@/components/shared/avatar-circle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useOverlayTransition } from "@/hooks/use-overlay-transition";
import type { AdminUserDetail } from "@/types/admin-user";

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
    <div className="border-b border-[#f3f4f6] py-3 last:border-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[#111827] break-words">{value?.trim() || noValue}</dd>
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
            "relative flex h-full w-full max-w-md flex-col border-l border-[#e5e7eb] bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.08)]",
            exiting ? "animate-slide-out-right" : "animate-slide-right"
          )}
          role="dialog"
          aria-modal
          aria-labelledby="user-detail-title"
        >
          <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
            <h2 id="user-detail-title" className="text-base font-bold text-[#111827]">
              {u.detailTitle}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-[#f5f7fb] hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading && (
              <div className="flex min-h-[200px] items-center justify-center">
                <Loader2 size={28} className="animate-spin text-[#6c47ff]" />
              </div>
            )}

            {error && !loading && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
                <p className="text-sm text-red-700">{error}</p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-3 text-sm font-semibold text-[#6c47ff] hover:underline"
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
                    <p className="text-lg font-bold text-[#111827]">{user.fullName}</p>
                    <p className="text-sm text-[#6b7280]">{user.email}</p>
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
            <div className="border-t border-[#e5e7eb] px-5 py-4">
              {user.isActive ? (
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => setPendingAction({ user, nextActive: false })}
                  className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
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
