"use client";

import { useState } from "react";
import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { UserStats } from "@/components/admin/users/user-stats";
import { UserFilters } from "@/components/admin/users/user-filters";
import { UserTable } from "@/components/admin/users/user-table";
import { UserModal } from "@/components/admin/users/user-modal";
import { adminUsers } from "@/data/admin";
import type { AdminUser } from "@/types/admin";

export default function UserManagementPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All Roles");
  const [status, setStatus] = useState("All Status");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const filtered = adminUsers.filter((u) => {
    const matchSearch =
      search === "" ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = role === "All Roles" || u.role === role;
    const matchStatus = status === "All Status" || u.status === status;
    return matchSearch && matchRole && matchStatus;
  });

  function openAdd() {
    setEditingUser(null);
    setModalOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditingUser(user);
    setModalOpen(true);
  }

  return (
    <AdminAppShell
      pageTitle="User Management"
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Users" }]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage all platform accounts, roles, and access.
        </p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <UserStats />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <UserFilters
          search={search}
          role={role}
          status={status}
          onSearchChange={setSearch}
          onRoleChange={setRole}
          onStatusChange={setStatus}
          onAddUser={openAdd}
        />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <UserTable users={filtered} onEdit={openEdit} />
      </div>

      <UserModal
        open={modalOpen}
        user={editingUser}
        onClose={() => setModalOpen(false)}
      />
    </AdminAppShell>
  );
}
