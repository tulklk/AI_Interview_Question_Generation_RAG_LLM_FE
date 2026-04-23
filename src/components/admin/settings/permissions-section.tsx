"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

type Role = "Admin" | "Recruiter" | "Guest";

interface Permission {
  id: string;
  label: string;
  description: string;
}

const permissions: Permission[] = [
  { id: "generate", label: "Generate Questions", description: "Access the JD question generator" },
  { id: "history", label: "View History", description: "Browse past generation sessions" },
  { id: "export", label: "Export Sessions", description: "Export questions to PDF/DOCX" },
  { id: "analytics", label: "View Analytics", description: "Access usage and analytics data" },
  { id: "manage_users", label: "Manage Users", description: "Create, edit, and disable accounts" },
  { id: "system_settings", label: "System Settings", description: "Modify platform configuration" },
];

const defaultAccess: Record<Role, Record<string, boolean>> = {
  Admin: Object.fromEntries(permissions.map((p) => [p.id, true])),
  Recruiter: { generate: true, history: true, export: true, analytics: false, manage_users: false, system_settings: false },
  Guest: { generate: false, history: false, export: false, analytics: false, manage_users: false, system_settings: false },
};

const roleColors: Record<Role, string> = {
  Admin: "text-violet-600",
  Recruiter: "text-blue-600",
  Guest: "text-gray-500",
};

export function PermissionsSection() {
  const [access, setAccess] = useState(defaultAccess);

  function toggle(role: Role, permId: string) {
    if (role === "Admin") return;
    setAccess((prev) => ({
      ...prev,
      [role]: { ...prev[role], [permId]: !prev[role][permId] },
    }));
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">User Permissions</h3>

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-64">Feature</th>
              {(["Admin", "Recruiter", "Guest"] as Role[]).map((role) => (
                <th key={role} className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide ${roleColors[role]}`}>
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {permissions.map((perm) => (
              <tr key={perm.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <p className="text-sm font-medium text-gray-800">{perm.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{perm.description}</p>
                </td>
                {(["Admin", "Recruiter", "Guest"] as Role[]).map((role) => (
                  <td key={role} className="px-4 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Toggle
                        checked={access[role][perm.id]}
                        onChange={() => toggle(role, perm.id)}
                        disabled={role === "Admin"}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3">Admin permissions are locked and cannot be modified.</p>

      <button className="mt-5 w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
        <Save size={14} />
        Save Permissions
      </button>
    </div>
  );
}
