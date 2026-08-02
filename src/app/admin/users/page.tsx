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
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useToast } from "@/shared/providers/toast-context";
import type { AdminUserDetail, AdminUserListItem } from "@/features/admin/types/admin-user";

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 10;

const EMPTY_FILTERS: UserTableColumnFilters = {
  search: "",
  role: "all",
  status: "all",
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

  // Đổi filter (trừ gõ search debounce) → về trang 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.role, filters.status]);

  const listParams = useMemo(() => {
    const status = filters.status;
    let isActive: boolean | undefined;
    if (status === "Active") isActive = true;
    else if (status === "Suspended") isActive = false;

    return {
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search: debouncedSearch || undefined,
      role: filters.role === "all" ? undefined : filters.role,
      isActive,
    };
  }, [page, debouncedSearch, filters.role, filters.status]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listUsers(listParams);
      setUsers(result.items);
      setTotalCount(result.totalCount);
    } catch {
      setUsers([]);
      setTotalCount(0);
      setError(u.loadError);
    } finally {
      setLoading(false);
    }
  }, [listParams, u.loadError]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const fetchDetail = useCallback(
    async (userId: string) => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const data = await getUserById(userId);
        setDetail(data);
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
          <UserTable
            users={users}
            loading={loading}
            error={error}
            selectedUserId={selectedUserId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            onSelectUser={handleSelectUser}
            onRetry={() => void fetchUsers()}
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
        />
      </AdminRouteGuard>
    </AdminAppShell>
  );
}
