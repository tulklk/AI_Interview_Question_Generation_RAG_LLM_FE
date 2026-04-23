"use client";

import { useState } from "react";
import { Search, Filter, Clock, Download } from "lucide-react";

const roles = ["All Roles", "Frontend", "Backend", "Data", "Product", "Design", "DevOps", "ML"];
const levels = ["All Levels", "Intern", "Junior", "Mid-Level", "Senior", "Lead"];

export function HistoryFilters() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All Roles");
  const [level, setLevel] = useState("All Levels");

  return (
    <div className="flex items-center gap-3 mb-4 animate-fade-up">
      <div className="relative flex-1 max-w-xs">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by job title..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors"
        />
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
        <Filter size={13} className="text-gray-400 shrink-0" />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="text-sm text-gray-600 bg-transparent focus:outline-none cursor-pointer"
        >
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
        <Clock size={13} className="text-gray-400 shrink-0" />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="text-sm text-gray-600 bg-transparent focus:outline-none cursor-pointer"
        >
          {levels.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>

      <button className="ml-auto flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 bg-white rounded-xl px-4 py-2 transition-colors hover:border-gray-300">
        <Download size={14} />
        Export All
      </button>
    </div>
  );
}
