import { Users2, UserCheck, Clock } from "lucide-react";
import { adminUsers } from "@/data/admin";

export function UserStats() {
  const total = adminUsers.length;
  const active = adminUsers.filter((u) => u.status === "Active").length;
  const pending = adminUsers.filter((u) => u.status === "Pending").length;

  const stats = [
    { label: "Total Users", value: total, icon: Users2, iconBg: "bg-blue-50", iconColor: "text-blue-500" },
    { label: "Active Users", value: active, icon: UserCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-500" },
    { label: "Pending Approval", value: pending, icon: Clock, iconBg: "bg-amber-50", iconColor: "text-amber-500" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>
              <Icon size={20} className={s.iconColor} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
