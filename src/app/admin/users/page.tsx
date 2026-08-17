"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminRouteGuard } from "@/features/admin/components/guards/admin-route-guard";
import { UserStats } from "@/features/admin/components/users/user-stats";
import {
  UserTable,
  type UserTableColumnFilters,
} from "@/features/admin/components/users/user-table";
import { UserDetailPanel } from "@/features/admin/components/users/user-detail-panel";
import { UserPagination } from "@/features/admin/components/users/user-pagination";
import { getUserById, listUsers, updateUserStatus } from "@/features/admin/services/admin-users.service";
import { UserFilters } from "@/features/admin/components/users/user-filters";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useToast } from "@/shared/providers/toast-context";
import type { AdminUserDetail, AdminUserListItem } from "@/features/admin/types/admin-user";
import { useSubscriptionRealtime } from "@/features/subscription/hooks/use-subscription-realtime";

/** How often admin user list silently auto-refreshes to pick up new payments / admin grants. */
const ADMIN_USER_LIST_POLL_MS = 60_000; // 60 seconds

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 10;

const EMPTY_FILTERS: UserTableColumnFilters = {
  search: "",
  role: "all",
  status: "all",
  plan: "all",
  createdFrom: "",
  createdTo: "",
};

export default function UserManagementPage() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const u = t.adminPages.users;

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<UserTableColumnFilters>(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  // Any filter change resets to page 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.role, filters.status, filters.plan, filters.createdFrom, filters.createdTo]);

  const listParams = useMemo(() => {
    let isActive: boolean | undefined;
    if (filters.status === "Active") isActive = true;
    else if (filters.status === "Suspended") isActive = false;

    let isPremium: boolean | undefined;
    if (filters.plan === "PREMIUM") isPremium = true;
    else if (filters.plan === "FREE") isPremium = false;

    return {
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search: debouncedSearch || undefined,
      role: filters.role === "all" ? undefined : filters.role,
      isActive,
      isPremium,
      createdFrom: filters.createdFrom || undefined,
      createdTo: filters.createdTo || undefined,
    };
  }, [page, debouncedSearch, filters.role, filters.status, filters.plan, filters.createdFrom, filters.createdTo]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers(listParams);
      // Client-side plan filter fallback in case backend ignores IsPremium param
      let items = result.items;
      if (listParams.isPremium === true) items = items.filter((u) => !!u.isPremium);
      else if (listParams.isPremium === false) items = items.filter((u) => !u.isPremium);
      setUsers(items);
      setTotalCount(result.totalCount);
    } catch {
      setUsers([]);
      setTotalCount(0);
      setError(u.loadError);
    } finally {
      setLoading(false);
    }
  }, [listParams, u.loadError]);

  // Silent background refresh — no loading skeleton, just swaps data when ready
  const refreshUsersQuietly = useCallback(async () => {
    try {
      const result = await listUsers(listParams);
      let items = result.items;
      if (listParams.isPremium === true) items = items.filter((u) => !!u.isPremium);
      else if (listParams.isPremium === false) items = items.filter((u) => !u.isPremium);
      setUsers(items);
      setTotalCount(result.totalCount);
    } catch {
      // Silently ignore — table keeps showing existing data
    }
  }, [listParams]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // ── Real-time: SignalR subscription events ────────────────────────────────
  // When a user pays or admin grants/revokes premium from another session,
  // silently refresh the user list to reflect the new plan badge.
  useSubscriptionRealtime({ onSubscriptionChanged: refreshUsersQuietly });

  // ── Real-time: 60-second background poll ──────────────────────────────────
  // Shorter than the 5-min fallback in useSubscriptionRealtime so the admin
  // monitoring panel stays timely even when SignalR events are not received.
  useEffect(() => {
    const id = window.setInterval(() => void refreshUsersQuietly(), ADMIN_USER_LIST_POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshUsersQuietly]);

  // ── Real-time: refresh on tab focus ──────────────────────────────────────
  // Picks up changes that happened while admin was on another tab.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void refreshUsersQuietly();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshUsersQuietly]);

  const fetchDetail = useCallback(
    async (userId: string) => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const data = await getUserById(userId);
        setDetail(data);
        // Đồng bộ ảnh từ API chi tiết vào hàng bảng (list đôi khi thiếu avatarUrl).
        if (data.avatarUrl) {
          setUsers((prev) =>
            prev.map((row) =>
              row.id === data.id ? { ...row, avatarUrl: data.avatarUrl } : row
            )
          );
        }
      } catch {
        setDetail(null);
        setDetailError(u.detailLoadError);
      } finally {
        setDetailLoading(false);
      }
    },
    [u.detailLoadError]
  );

  function handleSelectUser(user: AdminUserListItem) {
    setSelectedUserId(user.id);
    setDetailOpen(true);
    setDetail(null);
    void fetchDetail(user.id);
  }

  function handleCloseDetail() {
    setDetailOpen(false);
    setSelectedUserId(null);
    setDetail(null);
    setDetailError(null);
  }

  async function handleToggleStatus(user: AdminUserDetail, nextActive: boolean) {
    setStatusUpdating(true);
    try {
      await updateUserStatus(user.id, nextActive);
      addToast("success", u.statusUpdateSuccess);
      await fetchUsers();
      await fetchDetail(user.id);
    } catch {
      addToast("error", u.statusUpdateError);
    } finally {
      setStatusUpdating(false);
    }
  }

  function handleFiltersChange(next: Partial<UserTableColumnFilters>) {
    setFilters((prev) => ({ ...prev, ...next }));
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
    setDebouncedSearch("");
    setPage(1);
  }

  return (
    <AdminAppShell
      pageTitle={u.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: u.heading }]}
    >
      <AdminRouteGuard>
        <div className="mb-8 animate-fade-up">
          <h2 className={cn("text-[30px] font-bold leading-9", portalHeadingAlt)}>{u.heading}</h2>
          <p className={cn("text-base leading-6 mt-2", portalSubtextAlt)}>{u.subtext}</p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <UserStats users={users} totalCount={totalCount} loading={loading} />
        </div>

        <div className="mt-6 animate-fade-up" style={{ animationDelay: "160ms" }}>
          <UserFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
          <UserTable
            users={users}
            loading={loading}
            error={error}
            selectedUserId={selectedUserId}
            onSelectUser={handleSelectUser}
            onRetry={() => void fetchUsers()}
            page={page}
          />
          {!error && (
            <UserPagination
              page={page}
              pageSize={DEFAULT_PAGE_SIZE}
              totalCount={totalCount}
              loading={loading}
              onPageChange={setPage}
            />
          )}
        </div>

        <UserDetailPanel
          open={detailOpen}
          user={detail}
          loading={detailLoading}
          error={detailError}
          statusUpdating={statusUpdating}
          onClose={handleCloseDetail}
          onToggleStatus={(userRow, nextActive) => void handleToggleStatus(userRow, nextActive)}
          onRetry={() => selectedUserId && void fetchDetail(selectedUserId)}
          onSubscriptionChange={(userId, newPlanCode) => {
            // Optimistic: update the badge instantly in the visible list
            setUsers((prev) =>
              prev.map((u) =>
                u.id === userId
                  ? { ...u, planCode: newPlanCode ?? undefined, isPremium: newPlanCode?.toUpperCase().includes("PREMIUM") ?? false }
                  : u
              )
            );
            // Background confirm: sync with server without showing a loading skeleton
            void refreshUsersQuietly();
          }}
        />
      </AdminRouteGuard>
    </AdminAppShell>
  );
}
