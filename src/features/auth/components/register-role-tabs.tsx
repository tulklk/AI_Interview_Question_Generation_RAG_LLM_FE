"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RegisterForm } from "@/features/auth/components/register-form";
import { RegisterJobSeekerForm } from "@/features/auth/components/register-jobseeker-form";
import { useLanguage } from "@/shared/providers/language-context";

export function RegisterRoleTabs() {
  const [role, setRole] = useState<"hr" | "jobseeker">("hr");
  const { t } = useLanguage();
  const lp = t.loginPage;

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Role selector with spring-animated sliding indicator */}
      <div className="relative flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => setRole("hr")}
          className={`relative flex-1 py-2 text-sm font-semibold rounded-lg transition-colors z-10 ${
            role === "hr" ? "text-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {role === "hr" && (
            <motion.div
              layoutId="role-tab-bg"
              className="absolute inset-0 rounded-lg bg-white dark:bg-gray-900 shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{lp.roleHr}</span>
        </button>

        <button
          type="button"
          onClick={() => setRole("jobseeker")}
          className={`relative flex-1 py-2 text-sm font-semibold rounded-lg transition-colors z-10 ${
            role === "jobseeker" ? "text-primary" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {role === "jobseeker" && (
            <motion.div
              layoutId="role-tab-bg"
              className="absolute inset-0 rounded-lg bg-white dark:bg-gray-900 shadow-sm"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{lp.roleJobSeeker}</span>
        </button>
      </div>

      {/* Form with fade + slide transition on tab switch */}
      <AnimatePresence mode="wait">
        <motion.div
          key={role}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
        >
          {role === "hr" ? (
            <RegisterForm key="hr" registerRole="hr" />
          ) : (
            <RegisterJobSeekerForm key="jobseeker" registerRole="jobseeker" />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
