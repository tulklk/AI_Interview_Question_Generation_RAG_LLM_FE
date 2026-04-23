import { FileText, Zap, BarChart3 } from "lucide-react";
import { historyStats } from "@/data/history";

const icons = [FileText, Zap, BarChart3];
const iconBgs = ["bg-blue-50", "bg-violet-50", "bg-emerald-50"];
const iconColors = ["text-blue-500", "text-violet-500", "text-emerald-500"];

export function HistoryStats() {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {historyStats.map((stat, i) => {
        const Icon = icons[i];
        return (
          <div
            key={stat.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4"
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBgs[i]}`}
            >
              <Icon size={20} className={iconColors[i]} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
