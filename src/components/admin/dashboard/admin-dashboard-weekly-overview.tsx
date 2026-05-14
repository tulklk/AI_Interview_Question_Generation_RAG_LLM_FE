"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { weeklyUsageData } from "@/data/admin";
import { useLanguage } from "@/context/language-context";

export function AdminDashboardWeeklyOverview() {
  const { t } = useLanguage();
  const w = t.adminPages.dashboard.weeklyOverview;

  return (
    <div className="flex flex-col rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] animate-fade-up">
      <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-[#111827]">{w.title}</h3>
          <p className="mt-0.5 text-xs text-[#6b7280]">{w.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#6b7280]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#6c47ff]" />
            {w.usersLegend}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a78bfa]" />
            {w.jdLegend}
          </span>
        </div>
      </div>

      <div className="mt-4" style={{ minHeight: 220 }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={weeklyUsageData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
              cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="users"
              name={w.usersLegend}
              stroke="#6c47ff"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#6c47ff" }}
            />
            <Line
              type="monotone"
              dataKey="submissions"
              name={w.jdLegend}
              stroke="#a78bfa"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#a78bfa" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
