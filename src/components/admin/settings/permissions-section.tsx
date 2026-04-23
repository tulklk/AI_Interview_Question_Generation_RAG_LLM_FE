"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useLanguage } from "@/context/language-context";

type Role = "Admin" | "Recruiter" | "Guest";

const permissionIds = ["generate", "history", "export", "analytics", "manage_users", "system_settings"];

const defaultAccess: Record<Role, Record<string, boolean>> = {
  Admin: Object.fromEntries(permissionIds.map((p) => [p, true])),
  Recruiter: { generate: true, history: true, export: true, analytics: false, manage_users: false, system_settings: false },
  Guest: { generate: false, history: false, export: false, analytics: false, manage_users: false, system_settings: false },
};

const roleColors: Record<Role, string> = {
  Admin: "text-violet-600",
  Recruiter: "text-blue-600",
  Guest: "text-gray-500",
};

export function PermissionsSection() {
  const { t } = useLanguage();
  const p = t.adminPages.settings.permissions;

  const [access, setAccess] = useState(defaultAccess);

  function toggle(role: Role, permId: string) {
    if (role === "Admin") return;
    setAccess((prev) => ({
      ...prev,
      [role]: { ...prev[role], [permId]: !prev[role][permId] },
    }));
  }

  const roles: Role[] = ["Admin", "Recruiter", "Guest"];
  const roleColLabels: Record<Role, string> = {
    Admin: p.adminCol,
    Recruiter: p.recruiterCol,
    Guest: p.guestCol,
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">{p.title}</h3>

      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-64">{p.feature}</th>
              {roles.map((role) => (
                <th key={role} className={`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide ${roleColors[role]}`}>
                  {roleColLabels[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {p.features.map((feat, idx) => (
              <tr key={permissionIds[idx]} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <p className="text-sm font-medium text-gray-800">{feat.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{feat.desc}</p>
                </td>
                {roles.map((role) => (
                  <td key={role} className="px-4 py-3.5 text-center">
                    <div className="flex justify-center">
                      <Toggle
                        checked={access[role][permissionIds[idx]]}
                        onChange={() => toggle(role, permissionIds[idx])}
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

      <p className="text-xs text-gray-400 mt-3">{p.lockedNote}</p>

      <button className="mt-5 w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
        <Save size={14} />
        {p.saveBtn}
      </button>
    </div>
  );
}
