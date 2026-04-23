import { UserPlus, LogIn, Zap, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { systemActivity } from "@/data/admin";
import type { SystemActivityEvent } from "@/types/admin";

const eventConfig: Record<
  SystemActivityEvent["type"],
  { label: string; icon: typeof UserPlus; iconBg: string; iconColor: string; badgeBg: string; badgeColor: string }
> = {
  user_created: {
    label: "User Created",
    icon: UserPlus,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    badgeBg: "bg-blue-50",
    badgeColor: "text-blue-600",
  },
  recruiter_login: {
    label: "Login",
    icon: LogIn,
    iconBg: "bg-gray-50",
    iconColor: "text-gray-400",
    badgeBg: "bg-gray-100",
    badgeColor: "text-gray-500",
  },
  jd_generation: {
    label: "Generation",
    icon: Zap,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
    badgeBg: "bg-violet-50",
    badgeColor: "text-violet-600",
  },
  export: {
    label: "Export",
    icon: Download,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    badgeBg: "bg-emerald-50",
    badgeColor: "text-emerald-600",
  },
};

export function SystemActivityTable() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Recent System Activity</h3>
          <p className="text-xs text-gray-400 mt-0.5">Latest platform events</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {systemActivity.map((event, i) => {
              const cfg = eventConfig[event.type];
              const Icon = cfg.icon;
              return (
                <tr
                  key={event.id}
                  className="hover:bg-gray-50/50 transition-colors animate-fade-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cfg.iconBg)}>
                        <Icon size={13} className={cfg.iconColor} />
                      </div>
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", cfg.badgeBg, cfg.badgeColor)}>
                        {cfg.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-gray-800">{event.actor}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{event.description}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-500">{event.metadata}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-xs text-gray-400">{event.timestamp}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
