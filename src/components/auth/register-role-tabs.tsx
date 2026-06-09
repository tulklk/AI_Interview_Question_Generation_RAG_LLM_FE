"use client";

import { useState } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { RegisterJobSeekerForm } from "@/components/auth/register-jobseeker-form";
import { useLanguage } from "@/context/language-context";

export function RegisterRoleTabs() {
  const [role, setRole] = useState<"hr" | "jobseeker">("hr");
  const { t } = useLanguage();
  const lp = t.loginPage;

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Role selector */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => setRole("hr")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            role === "hr"
              ? "bg-white text-primary shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {lp.roleHr}
        </button>
        <button
          type="button"
          onClick={() => setRole("jobseeker")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            role === "jobseeker"
              ? "bg-white text-primary shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {lp.roleJobSeeker}
        </button>
      </div>

      {role === "hr" ? (
        <RegisterForm key="hr" registerRole="hr" />
      ) : (
        <RegisterJobSeekerForm key="jobseeker" registerRole="jobseeker" />
      )}
    </div>
  );
}
