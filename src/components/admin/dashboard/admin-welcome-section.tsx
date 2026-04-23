"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useLanguage } from "@/context/language-context";

export function AdminWelcomeSection() {
  const { t } = useLanguage();
  const d = t.adminPages.dashboard;

  return (
    <div className="flex items-start justify-between mb-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{d.welcome}</h2>
        <p className="text-sm text-gray-500 mt-1">{d.welcomeSub}</p>
      </div>
      <Link
        href="/admin/users"
        className="flex items-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shrink-0"
      >
        <UserPlus size={15} />
        {d.addUser}
      </Link>
    </div>
  );
}
