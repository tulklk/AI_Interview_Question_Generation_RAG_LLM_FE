"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { useLanguage } from "@/context/language-context";

export function ProfileSection() {
  const { t } = useLanguage();
  const sp = t.settingsPage.profile;
  const [firstName, setFirstName] = useState("HR");
  const [lastName, setLastName] = useState("Manager");
  const [email, setEmail] = useState("hr@company.com");
  const [company, setCompany] = useState("Tech Corp Inc.");
  const [jobTitle, setJobTitle] = useState("HR Manager");
  const [bio, setBio] = useState(
    "HR Manager at Tech Corp with 8+ years experience in technical recruitment."
  );

  const inputCls =
    "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors bg-white";

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">{sp.title}</h3>

      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-lg bg-[#6c47ff] flex items-center justify-center shrink-0">
          <span className="text-white text-lg font-bold">HR</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">{sp.photo}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sp.photoFormats}</p>
          <button className="mt-2 text-xs font-medium text-[#6c47ff] border border-[#6c47ff]/30 hover:bg-indigo-50 rounded-lg px-3 py-1 transition-colors">
            {sp.uploadPhoto}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label={sp.firstName} htmlFor="first-name">
            <input
              id="first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputCls}
            />
          </FormField>
          <FormField label={sp.lastName} htmlFor="last-name">
            <input
              id="last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputCls}
            />
          </FormField>
        </div>

        <FormField label={sp.email} htmlFor="email">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={sp.company} htmlFor="company">
            <input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputCls}
            />
          </FormField>
          <FormField label={sp.jobTitle} htmlFor="job-title">
            <input
              id="job-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className={inputCls}
            />
          </FormField>
        </div>

        <FormField label={sp.bio} htmlFor="bio">
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </FormField>
      </div>

      <button className="mt-6 w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
        <Save size={14} />
        {sp.save}
      </button>
    </div>
  );
}
