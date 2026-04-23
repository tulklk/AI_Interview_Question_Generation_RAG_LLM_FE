"use client";

import { useState } from "react";
import { AdminAppShell } from "@/components/admin/layout/admin-app-shell";
import { UserStats } from "@/components/admin/users/user-stats";
import { UserFilters } from "@/components/admin/users/user-filters";
import { UserTable } from "@/components/admin/users/user-table";
import { UserModal } from "@/components/admin/users/user-modal";
import { adminUsers } from "@/data/admin";
import type { AdminUser } from "@/types/admin";
import { useLanguage } from "@/context/language-context";

export default function UserManagementPage() {
  const { t } = useLanguage();
  const u = t.adminPages.users;
  const f = u.filters;

  const [search, setSearch] = useState("");
  const [role, setRole] = useState(f.allRoles);
  const [status, setStatus] = useState(f.allStatus);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const filtered = adminUsers.filter((usr) => {
    const matchSearch =
      search === "" ||
      usr.name.toLowerCase().includes(search.toLowerCase()) ||
      usr.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = role === f.allRoles || usr.role === role;
    const matchStatus = status === f.allStatus || usr.status === status;
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
      pageTitle={u.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: u.heading }]}
    >
      <div className="mb-6 animate-fade-up">
        <h2 className="text-2xl font-bold text-gray-900">{u.heading}</h2>
        <p className="text-sm text-gray-500 mt-1">{u.subtext}</p>
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
