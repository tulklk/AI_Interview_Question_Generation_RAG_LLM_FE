import { Users, FileText, Zap, Download } from "lucide-react";
import { analyticsStats } from "@/data/admin";

const icons = [Users, FileText, Zap, Download];
const iconBgs = ["bg-blue-50", "bg-violet-50", "bg-orange-50", "bg-emerald-50"];
const iconColors = ["text-blue-500", "text-violet-500", "text-orange-500", "text-emerald-500"];

export function AnalyticsStats() {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {analyticsStats.map((stat, i) => {
        const Icon = icons[i];
        return (
          <div
            key={stat.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-fade-up"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBgs[i]}`}>
                <Icon size={20} className={iconColors[i]} />
              </div>
            </div>
            <p className="text-[26px] font-bold text-gray-900 leading-none">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
