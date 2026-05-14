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
import { useLanguage } from "@/context/language-context";

export function QuestionsTrendChart() {
  const { t } = useLanguage();
  const qt = t.adminPages.dashboard.questionsTrend;

  return (
    <div className="flex flex-col rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] animate-fade-up">
      <div className="mb-1">
        <h3 className="text-base font-bold text-[#111827]">{qt.title}</h3>
        <p className="mt-0.5 text-xs text-[#6b7280]">{qt.subtitle}</p>
      </div>

      <div className="mt-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={questionsTrendData}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            barSize={32}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
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
              name={qt.questions}
              fill="#6c47ff"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
