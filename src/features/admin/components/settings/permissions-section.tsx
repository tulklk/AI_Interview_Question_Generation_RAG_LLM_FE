"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Toggle } from "@/shared/components/ui/toggle";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalDivider, portalHeading, portalSubtext, portalTableRow } from "@/shared/utils/portal-ui";

type Role = "Admin" | "Recruiter" | "Guest";

const permissionIds = ["generate", "history", "export", "analytics", "manage_users", "system_settings"];

const defaultAccess: Record<Role, Record<string, boolean>> = {
  Admin: Object.fromEntries(permissionIds.map((p) => [p, true])),
  Recruiter: { generate: true, history: true, export: true, analytics: false, manage_users: false, system_settings: false },
  Guest: { generate: false, history: false, export: false, analytics: false, manage_users: false, system_settings: false },
};

const roleColors: Record<Role, string> = {
  Admin: "text-violet-600 dark:text-violet-400",
  Recruiter: "text-blue-600 dark:text-blue-400",
  Guest: "text-gray-500 dark:text-gray-400",
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
      <h3 className={cn("text-base font-semibold mb-5", portalHeading)}>{p.title}</h3>

      <div className={cn("overflow-hidden rounded-lg border", portalDivider)}>
        <table className="w-full text-sm">
          <thead className={cn("bg-gray-50 dark:bg-gray-800/50 border-b", portalDivider)}>
            <tr>
              <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-64", portalSubtext)}>{p.feature}</th>
              {roles.map((role) => (
                <th key={role} className={cn(`px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide`, roleColors[role])}>
                  {roleColLabels[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn("divide-y", portalDivider)}>
            {p.features.map((feat, idx) => (
              <tr key={permissionIds[idx]} className={cn("transition-colors", portalTableRow)}>
                <td className="px-4 py-3.5">
                  <p className={cn("text-sm font-medium", portalHeading)}>{feat.label}</p>
                  <p className={cn("text-xs mt-0.5", portalSubtext)}>{feat.desc}</p>
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

      <p className={cn("text-xs mt-3", portalSubtext)}>{p.lockedNote}</p>

      <button className="mt-5 w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
        <Save size={14} />
        {p.saveBtn}
      </button>
    </div>
  );
}
