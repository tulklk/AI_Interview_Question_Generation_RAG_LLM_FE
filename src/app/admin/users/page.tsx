"use client";

import { useState, useMemo } from "react";
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

  const [users, setUsers] = useState<AdminUser[]>(adminUsers);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState(f.allRoles);
  const [status, setStatus] = useState(f.allStatus);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const filtered = useMemo(
    () =>
      users.filter((usr) => {
        const matchSearch =
          search === "" ||
          usr.name.toLowerCase().includes(search.toLowerCase()) ||
          usr.email.toLowerCase().includes(search.toLowerCase());
        const matchRole = role === f.allRoles || usr.role === role;
        const matchStatus = status === f.allStatus || usr.status === status;
        return matchSearch && matchRole && matchStatus;
      }),
    [users, search, role, status, f.allRoles, f.allStatus]
  );

  function openAdd() {
    setEditingUser(null);
    setModalOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditingUser(user);
    setModalOpen(true);
  }

  function handleSaveUser(data: {
    id?: string;
    name: string;
    email: string;
    role: AdminUser["role"];
    status: AdminUser["status"];
  }) {
    if (data.id) {
      setUsers((prev) =>
        prev.map((urow) =>
          urow.id === data.id
            ? {
                ...urow,
                name: data.name,
                email: data.email,
                role: data.role,
                status: data.status,
              }
            : urow
        )
      );
    } else {
      const newUser: AdminUser = {
        id: `u-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status,
        createdDate: new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date()),
        lastActive: "Never",
      };
      setUsers((prev) => [...prev, newUser]);
    }
  }

  function handleSuspend(user: AdminUser) {
    setUsers((prev) =>
      prev.map((urow) => (urow.id === user.id ? { ...urow, status: "Suspended" as const } : urow))
    );
  }

  function handleDelete(user: AdminUser) {
    const msg = u.deleteConfirm.replace("{name}", user.name);
    if (typeof window !== "undefined" && !window.confirm(msg)) return;
    setUsers((prev) => prev.filter((urow) => urow.id !== user.id));
  }

  return (
    <AdminAppShell
      pageTitle={u.heading}
      breadcrumb={[{ label: "Admin", href: "/admin/dashboard" }, { label: u.heading }]}
    >
      <div className="mb-8 animate-fade-up">
        <h2 className="text-[30px] font-bold leading-9 text-[#111827]">{u.heading}</h2>
        <p className="text-base text-[#6b7280] leading-6 mt-2">{u.subtext}</p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
        <UserStats users={users} />
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
        <UserTable
          users={filtered}
          onEdit={openEdit}
          onSuspend={handleSuspend}
          onDelete={handleDelete}
        />
      </div>

      <UserModal
        open={modalOpen}
        user={editingUser}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveUser}
      />
    </AdminAppShell>
  );
}
