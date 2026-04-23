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

export function WeeklyUsageChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col animate-fade-up">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Weekly Platform Usage</h3>
          <p className="text-xs text-gray-400 mt-0.5">Active users vs JD submissions</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6c47ff] inline-block" />
            Active Users
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            JD Submissions
          </span>
        </div>
      </div>

      <div className="mt-4" style={{ minHeight: 220 }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={weeklyUsageData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
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
              name="Active Users"
              stroke="#6c47ff"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#6c47ff" }}
            />
            <Line
              type="monotone"
              dataKey="submissions"
              name="JD Submissions"
              stroke="#34d399"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#34d399" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
