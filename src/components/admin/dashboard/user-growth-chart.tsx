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
import { userGrowthData } from "@/data/admin";
import { useLanguage } from "@/context/language-context";

export function UserGrowthChart() {
  const { t } = useLanguage();
  const ug = t.adminPages.dashboard.userGrowth;

  return (
    <div className="flex flex-col rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] animate-fade-up">
      <div className="mb-1 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-[#111827]">{ug.title}</h3>
          <p className="mt-0.5 text-xs text-[#6b7280]">{ug.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#6b7280]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#7c3aed]" />
            {ug.admins}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#6c47ff]" />
            {ug.recruiters}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a78bfa]" />
            {ug.guests}
          </span>
        </div>
      </div>

      <div className="mt-4" style={{ minHeight: 220 }}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={userGrowthData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gradAdmins" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRecruiters" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6c47ff" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#6c47ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradGuests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="week"
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
            <Area
              type="monotone"
              dataKey="admins"
              name={ug.admins}
              stroke="#7c3aed"
              strokeWidth={2}
              fill="url(#gradAdmins)"
              dot={false}
              activeDot={{ r: 4, fill: "#7c3aed" }}
            />
            <Area
              type="monotone"
              dataKey="recruiters"
              name={ug.recruiters}
              stroke="#6c47ff"
              strokeWidth={2.5}
              fill="url(#gradRecruiters)"
              dot={false}
              activeDot={{ r: 4, fill: "#6c47ff" }}
            />
            <Area
              type="monotone"
              dataKey="guests"
              name={ug.guests}
              stroke="#a78bfa"
              strokeWidth={2.5}
              fill="url(#gradGuests)"
              dot={false}
              activeDot={{ r: 4, fill: "#a78bfa" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
