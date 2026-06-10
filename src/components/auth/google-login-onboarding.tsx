"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  User,
  Building2,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  ChevronDown,
  Search,
} from "lucide-react";
import { searchCompanies } from "@/lib/api/company";
import type { CompanyOption } from "@/lib/api/company";
import type { GoogleClaims } from "@/lib/google-oauth-flow";
import { completeGoogleLogin, finishGoogleAuth } from "@/lib/google-oauth-flow";
import { getRoleRedirect } from "@/lib/auth";
import { markLoginWelcomeForRedirect } from "@/lib/login-welcome";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import { useUser } from "@/context/user-context";
import {
  toBackendIntendedRole,
  type GoogleOnboardingRole,
  type GoogleOnboardingStep,
} from "@/lib/google-onboarding";

const TECH_OPTIONS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular",
  "Node.js", "Python", "Java", "Go", "C#", "PHP", "Ruby", "Swift", "Kotlin",
  "Docker", "Kubernetes", "AWS", "Azure", "MySQL", "PostgreSQL", "MongoDB",
  "Redis", "GraphQL",
];

const SENIORITY_LEVELS = ["Intern", "Junior", "Mid-level", "Senior", "Lead"];

interface GoogleLoginOnboardingProps {
  credential: string;
  claims: GoogleClaims;
  onCancel: () => void;
}

export function GoogleLoginOnboarding({
  credential,
  claims,
  onCancel,
}: GoogleLoginOnboardingProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const lp = t.loginPage;
  const hrp = t.registerPage;
  const jsp = t.registerJobSeekerPage;
  const { addToast } = useToast();
  const { refreshUser } = useUser();

  const [step, setStep] = useState<GoogleOnboardingStep>("role-select");
  const [selectedRole, setSelectedRole] = useState<GoogleOnboardingRole>("HR_MANAGER");
  const [loading, setLoading] = useState(false);

  const fullName = claims.name || claims.email.split("@")[0] || "";
  const email = claims.email;

  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyResults, setCompanyResults] = useState<CompanyOption[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySearched, setCompanySearched] = useState(false);

  const [targetRole, setTargetRole] = useState("");
  const [seniorityLevel, setSeniorityLevel] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techSearch, setTechSearch] = useState("");
  const [techOpen, setTechOpen] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const companyRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const techDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setCompanyOpen(false);
      }
      if (techDropdownRef.current && !techDropdownRef.current.contains(e.target as Node)) {
        setTechOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCompanies = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setCompanyResults([]);
      setCompanySearched(false);
      return;
    }
    setCompanyLoading(true);
    try {
      const results = await searchCompanies(keyword);
      setCompanyResults(results);
    } catch {
      setCompanyResults([]);
    } finally {
      setCompanyLoading(false);
      setCompanySearched(true);
    }
  }, []);

  function handleCompanyChange(value: string) {
    setCompanyName(value);
    setCompanyId("");
    setCompanySearched(false);
    if (fieldErrors.companyName) setFieldErrors((p) => ({ ...p, companyName: "" }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim()) {
      debounceRef.current = setTimeout(() => fetchCompanies(value), 350);
    } else {
      setCompanyResults([]);
    }
    setCompanyOpen(true);
  }

  function selectCompany(company: CompanyOption) {
    setCompanyName(company.name);
    setCompanyId(company.id);
    setCompanyOpen(false);
    setCompanyResults([]);
    setCompanySearched(false);
    if (fieldErrors.companyName) setFieldErrors((p) => ({ ...p, companyName: "" }));
  }

  function useTypedName() {
    setCompanyId("");
    setCompanyOpen(false);
    setCompanyResults([]);
    setCompanySearched(false);
  }

  const filteredTech = TECH_OPTIONS.filter(
    (tech) => tech.toLowerCase().includes(techSearch.toLowerCase()) && !techStack.includes(tech)
  );

  function toggleTech(tech: string) {
    setTechStack((prev) =>
      prev.includes(tech) ? prev.filter((item) => item !== tech) : [...prev, tech]
    );
    if (fieldErrors.techStack) setFieldErrors((p) => ({ ...p, techStack: "" }));
  }

  function handleRolePick(role: GoogleOnboardingRole) {
    setSelectedRole(role);
    setFieldErrors({});
    setStep(role === "HR_MANAGER" ? "hr-profile" : "js-profile");
  }

  async function handleHrSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    const errors: Record<string, string> = {};
    if (!companyName.trim()) errors.companyName = hrp.companyNameLabel;
    if (!jobTitle.trim()) errors.jobTitle = hrp.jobTitleLabel;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const { role } = await completeGoogleLogin(credential, {
        intendedRole: toBackendIntendedRole(selectedRole),
        companyId: companyId || undefined,
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
      });
      addToast("success", hrp.profileCompleteSuccess);
      markLoginWelcomeForRedirect(getRoleRedirect(role));
      await finishGoogleAuth(router, refreshUser, claims, credential, role);
    } catch {
      addToast("error", hrp.profileCompleteFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleJsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    const errors: Record<string, string> = {};
    if (!targetRole.trim()) errors.targetRole = jsp.targetRoleLabel;
    if (!seniorityLevel) errors.seniorityLevel = jsp.seniorityLabel;
    if (techStack.length === 0) errors.techStack = jsp.techStackLabel;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const { role } = await completeGoogleLogin(credential, {
        intendedRole: toBackendIntendedRole(selectedRole),
        targetRole: targetRole.trim(),
        seniorityLevel,
        techStack,
      });
      addToast("success", jsp.profileCompleteSuccess);
      markLoginWelcomeForRedirect(getRoleRedirect(role));
      await finishGoogleAuth(router, refreshUser, claims, credential, role);
    } catch {
      addToast("error", jsp.profileCompleteFailed);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step === "role-select") {
      onCancel();
      return;
    }
    setStep("role-select");
    setFieldErrors({});
  }

  const inputBase =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-gray-400";
  const inputReadOnly =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed";
  const inputErrorCls = "border-red-300 focus:border-red-400 focus:ring-red-100";

  if (step === "role-select") {
    return (
      <div className="w-full max-w-sm mx-auto animate-fade-up">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{lp.googleOnboardingTitle}</h2>
        <p className="text-sm text-gray-500 mb-6">{lp.googleOnboardingSubtitle}</p>

        <p className="text-sm font-medium text-gray-700 mb-3">{lp.selectRoleTitle}</p>
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => handleRolePick("HR_MANAGER")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              selectedRole === "HR_MANAGER"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {lp.roleHr}
          </button>
          <button
            type="button"
            onClick={() => handleRolePick("JOB_SEEKER")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              selectedRole === "JOB_SEEKER"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {lp.roleJobSeeker}
          </button>
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} />
          {lp.backToLogin}
        </button>
      </div>
    );
  }

  const isHr = step === "hr-profile";

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-up">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{lp.completeProfileTitle}</h2>
      <p className="text-sm text-gray-500 mb-6">{lp.completeProfileHint}</p>

      <form onSubmit={isHr ? handleHrSubmit : handleJsSubmit} className="space-y-4" noValidate>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            {isHr ? hrp.fullNameLabel : jsp.fullNameLabel}{" "}
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" value={fullName} readOnly tabIndex={-1} className={inputReadOnly} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            {isHr ? hrp.emailLabel : jsp.emailLabel}{" "}
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="email" value={email} readOnly tabIndex={-1} className={inputReadOnly} />
          </div>
        </div>

        {isHr ? (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {hrp.companyNameLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={companyRef}>
                <div className="relative">
                  <Building2
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"
                  />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    onFocus={() => {
                      if (companyName.trim()) setCompanyOpen(true);
                    }}
                    placeholder={hrp.companyNamePlaceholder}
                    className={`${inputBase} pr-9 ${
                      fieldErrors.companyName
                        ? inputErrorCls
                        : companyId
                        ? "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                        : ""
                    }`}
                    autoComplete="off"
                  />
                  {companyLoading ? (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : companyId ? (
                    <CheckCircle2
                      size={14}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"
                    />
                  ) : null}
                </div>

                {companyOpen && companyName.trim() && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {companyLoading && (
                      <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-400">
                        <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                        {hrp.companySearchHint}
                      </div>
                    )}
                    {!companyLoading && companyResults.length > 0 && (
                      <div className="max-h-44 overflow-y-auto py-1">
                        {companyResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => selectCompany(c)}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors text-left"
                          >
                            <Building2 size={13} className="text-gray-400 shrink-0" />
                            <span className="truncate">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {!companyLoading && companyResults.length === 0 && companySearched && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-xs text-gray-400">{hrp.companyNotSelected}</p>
                        <button
                          type="button"
                          onMouseDown={useTypedName}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors text-left border-t border-gray-100 mt-1"
                        >
                          <Building2 size={13} className="text-gray-400 shrink-0" />
                          <span className="truncate">{companyName}</span>
                          <span className="ml-auto text-xs text-primary shrink-0">Dùng tên này</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {fieldErrors.companyName && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.companyName}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {hrp.jobTitleLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Briefcase
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => {
                    setJobTitle(e.target.value);
                    if (fieldErrors.jobTitle) setFieldErrors((p) => ({ ...p, jobTitle: "" }));
                  }}
                  placeholder={hrp.jobTitlePlaceholder}
                  className={`${inputBase} ${fieldErrors.jobTitle ? inputErrorCls : ""}`}
                  autoComplete="organization-title"
                />
              </div>
              {fieldErrors.jobTitle && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.jobTitle}</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {jsp.targetRoleLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Briefcase
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => {
                    setTargetRole(e.target.value);
                    if (fieldErrors.targetRole) setFieldErrors((p) => ({ ...p, targetRole: "" }));
                  }}
                  placeholder={jsp.targetRolePlaceholder}
                  className={`${inputBase} ${fieldErrors.targetRole ? inputErrorCls : ""}`}
                />
              </div>
              {fieldErrors.targetRole && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.targetRole}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {jsp.seniorityLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <ChevronDown
                  size={15}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <select
                  value={seniorityLevel}
                  onChange={(e) => {
                    setSeniorityLevel(e.target.value);
                    if (fieldErrors.seniorityLevel) {
                      setFieldErrors((p) => ({ ...p, seniorityLevel: "" }));
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none pr-9 ${
                    fieldErrors.seniorityLevel
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-200"
                  } ${!seniorityLevel ? "text-gray-400" : "text-gray-900"}`}
                >
                  <option value="" disabled>
                    {jsp.seniorityPlaceholder}
                  </option>
                  {SENIORITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              {fieldErrors.seniorityLevel && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.seniorityLevel}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {jsp.techStackLabel} <span className="text-red-500">*</span>
              </label>

              {techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {techStack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => setTechStack((p) => p.filter((t) => t !== tech))}
                        className="hover:text-primary/70 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative" ref={techDropdownRef}>
                <div
                  className={`flex items-center border rounded-lg bg-white transition-colors ${
                    techOpen
                      ? "border-primary ring-2 ring-primary/20"
                      : fieldErrors.techStack
                      ? "border-red-300"
                      : "border-gray-200"
                  }`}
                >
                  <Search size={14} className="ml-3 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={techSearch}
                    onChange={(e) => setTechSearch(e.target.value)}
                    onFocus={() => setTechOpen(true)}
                    placeholder={jsp.techStackSearch}
                    className="flex-1 px-2.5 py-2.5 text-sm bg-transparent focus:outline-none placeholder:text-gray-400"
                  />
                </div>
                {techOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredTech.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-gray-400 text-center">{jsp.techStackEmpty}</p>
                    ) : (
                      <div className="p-2 flex flex-wrap gap-1.5">
                        {filteredTech.map((tech) => (
                          <button
                            key={tech}
                            type="button"
                            onClick={() => toggleTech(tech)}
                            className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                          >
                            {tech}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {fieldErrors.techStack && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.techStack}</p>
              )}
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {lp.completeProfileButton} <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>

      <button
        type="button"
        onClick={handleBack}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        {lp.backToLogin}
      </button>
    </div>
  );
}
