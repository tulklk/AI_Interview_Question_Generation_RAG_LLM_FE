"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { adminCategoryStats } from "@/data/admin";
import { useLanguage } from "@/context/language-context";

const BAR_COLORS = ["#6c47ff", "#7c5cf0", "#957aed", "#a78bfa", "#c7b9ff"];

export function AdminDashboardCategoryMix() {
  const { t } = useLanguage();
  const c = t.adminPages.dashboard.categoryMix;

  const data = adminCategoryStats.map((row, i) => ({
    ...row,
    fill: BAR_COLORS[i % BAR_COLORS.length],
  }));

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex flex-col rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] animate-fade-up">
      <div className="mb-1">
        <h3 className="text-base font-bold text-[#111827]">{c.title}</h3>
        <p className="mt-0.5 text-xs text-[#6b7280]">{c.subtitle}</p>
      </div>

      <div className="mt-2" style={{ minHeight: 220 }}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, maxCount * 1.08]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={88}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [
                typeof value === "number" ? value.toLocaleString() : String(value ?? ""),
                c.countLabel,
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
              cursor={{ fill: "rgba(108, 71, 255, 0.06)" }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
              {data.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
