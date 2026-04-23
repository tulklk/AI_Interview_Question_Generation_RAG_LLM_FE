"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { questionsTrendData } from "@/data/admin";

export function QuestionsTrendChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col animate-fade-up">
      <div className="mb-1">
        <h3 className="text-base font-semibold text-gray-900">Questions Generated</h3>
        <p className="text-xs text-gray-400 mt-0.5">Daily generation volume this week</p>
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={questionsTrendData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            barSize={32}
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
              cursor={{ fill: "#f5f3ff" }}
            />
            <Bar
              dataKey="count"
              name="Questions"
              fill="#6c47ff"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
