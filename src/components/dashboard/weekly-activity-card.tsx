"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { weeklyActivity } from "@/data/dashboard";

export function WeeklyActivityCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Weekly Activity
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Questions generated this week
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6c47ff] inline-block" />
            Questions
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            JDs
          </span>
        </div>
      </div>

      <div className="flex-1 mt-4" style={{ minHeight: 200 }}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={weeklyActivity}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            <defs>
              <linearGradient id="gradQuestions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6c47ff" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#6c47ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradJDs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              domain={[0, 60]}
              ticks={[0, 15, 30, 45, 60]}
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
            <Area
              type="monotone"
              dataKey="questions"
              name="Questions"
              stroke="#6c47ff"
              strokeWidth={2.5}
              fill="url(#gradQuestions)"
              dot={false}
              activeDot={{ r: 4, fill: "#6c47ff" }}
            />
            <Area
              type="monotone"
              dataKey="jds"
              name="JDs"
              stroke="#34d399"
              strokeWidth={2.5}
              fill="url(#gradJDs)"
              dot={false}
              activeDot={{ r: 4, fill: "#34d399" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
