"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { AdminRouteGuard } from "@/components/admin/guards/admin-route-guard";
import { UserStats } from "@/components/admin/users/user-stats";
import { UserFilters, type RoleFilterValue, type StatusFilterValue } from "@/components/admin/users/user-filters";
import { UserTable } from "@/components/admin/users/user-table";
import { UserDetailPanel } from "@/components/admin/users/user-detail-panel";
import { UserPagination } from "@/components/admin/users/user-pagination";
import { getAdminUserStatus } from "@/lib/admin-user-display";
import { getUserById, listUsers, updateUserStatus } from "@/lib/api/admin-users";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import type { AdminUserDetail, AdminUserListItem } from "@/types/admin-user";

const SEARCH_DEBOUNCE_MS = 300;

export default function UserManagementPage() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const u = t.adminPages.users;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");

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
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const apiStatusFilter = useMemo(() => {
    if (statusFilter === "Active") return true;
    if (statusFilter === "Suspended") return false;
    return undefined;
  }, [statusFilter]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await listUsers({
        page,
        pageSize,
        search: debouncedSearch || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        isActive: apiStatusFilter,
      });

      let items = result.items;

      if (statusFilter === "Pending") {
        items = items.filter((item) => getAdminUserStatus(item) === "Pending");
      }

      setUsers(items);
      setTotalCount(
        statusFilter === "Pending" ? items.length : result.totalCount
      );
    } catch {
      setUsers([]);
      setTotalCount(0);
      setError(u.loadError);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, roleFilter, apiStatusFilter, statusFilter, u.loadError]);

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

  function handleRoleChange(value: RoleFilterValue) {
    setRoleFilter(value);
    setPage(1);
  }

  function handleStatusChange(value: StatusFilterValue) {
    setStatusFilter(value);
    setPage(1);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <AdminAppShell
      pageTitle={u.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: u.heading }]}
    >
      <AdminRouteGuard>
        <div className="mb-8 animate-fade-up">
          <h2 className="text-[30px] font-bold leading-9 text-[#111827]">{u.heading}</h2>
          <p className="text-base text-[#6b7280] leading-6 mt-2">{u.subtext}</p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <UserStats users={users} totalCount={totalCount} loading={loading} />
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
          <UserFilters
            search={searchInput}
            role={roleFilter}
            status={statusFilter}
            onSearchChange={setSearchInput}
            onRoleChange={handleRoleChange}
            onStatusChange={handleStatusChange}
          />
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
          <UserTable
            users={users}
            loading={loading}
            error={error}
            selectedUserId={selectedUserId}
            onSelectUser={handleSelectUser}
            onRetry={() => void fetchUsers()}
          />
          {!error && (
            <UserPagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              loading={loading}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
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
