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
import { adminCategoryStats } from "@/data/admin";

export function CategoryChart() {
  const max = Math.max(...adminCategoryStats.map((c) => c.count));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col animate-fade-up">
      <div className="mb-1">
        <h3 className="text-base font-semibold text-gray-900">Question Categories</h3>
        <p className="text-xs text-gray-400 mt-0.5">Distribution across all sessions</p>
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={adminCategoryStats}
            margin={{ top: 4, right: 4, bottom: 0, left: -28 }}
            barSize={28}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
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
            <Bar dataKey="count" name="Questions" fill="#6c47ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 space-y-3">
        {adminCategoryStats.map((cat) => (
          <div key={cat.name} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-24 shrink-0">{cat.name}</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#6c47ff] rounded-full"
                style={{ width: `${(cat.count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-12 text-right shrink-0">
              {cat.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
