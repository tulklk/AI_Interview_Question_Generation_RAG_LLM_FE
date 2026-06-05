"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Building2,
  CheckCircle2,
  Search,
  Briefcase,
} from "lucide-react";
import type { AxiosError } from "axios";
import { registerHr } from "@/lib/api/auth";
import { searchCompanies } from "@/lib/api/company";
import type { CompanyOption } from "@/lib/api/company";
import type { ApiErrorResponse } from "@/types/auth";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";

interface FieldErrors {
  companyName?: string;
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  jobTitle?: string;
}

export function RegisterForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const rp = t.registerPage;
  const { addToast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companyResults, setCompanyResults] = useState<CompanyOption[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySearched, setCompanySearched] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const companyRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setCompanyOpen(false);
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
    if (fieldErrors.companyName) setFieldErrors((p) => ({ ...p, companyName: undefined }));
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
    if (fieldErrors.companyName) setFieldErrors((p) => ({ ...p, companyName: undefined }));
  }

  function useTypedName() {
    setCompanyId("");
    setCompanyOpen(false);
    setCompanyResults([]);
    setCompanySearched(false);
  }

  const passwordStrength =
    password.length === 0
      ? 0
      : password.length < 6
      ? 1
      : password.length < 8
      ? 2
      : /[A-Z]/.test(password) && /[0-9]/.test(password)
      ? 4
      : 3;

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = [
    "",
    "bg-red-400",
    "bg-amber-400",
    "bg-yellow-400",
    "bg-emerald-500",
  ][passwordStrength];

  function validateClient(): FieldErrors {
    const errors: FieldErrors = {};
    if (!companyName.trim()) errors.companyName = "Company name is required";
    if (!fullName.trim()) errors.fullName = "Full name is required";
    if (!email.trim()) errors.email = "Email is required";
    if (!jobTitle.trim()) errors.jobTitle = "Job title is required";
    if (password.length < 8) errors.password = rp.passwordTooShort;
    if (confirmPassword !== password) errors.confirmPassword = rp.passwordMismatch;
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    if (!agreed) {
      addToast("error", rp.mustAgree);
      return;
    }

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setLoading(true);
    try {
      await registerHr({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        companyId,
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
      });
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      const status = axiosErr.response?.status;
      const data = axiosErr.response?.data;
      const msg = data?.message ?? "";

      if (status === 409 || msg.toLowerCase().includes("email")) {
        setFieldErrors({ email: rp.emailAlreadyUsed });
      } else if (data?.errors) {
        setFieldErrors(data.errors as FieldErrors);
      } else {
        addToast("error", msg || rp.registrationFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputBase =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-gray-400";

  const inputError =
    "border-red-300 focus:border-red-400 focus:ring-red-100";

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-up">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{rp.title}</h2>
      <p className="text-sm text-gray-500 mb-7">{rp.subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Company Name (searchable) */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            {rp.companyNameLabel} <span className="text-red-500">*</span>
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
                placeholder={rp.companyNamePlaceholder}
                className={`${inputBase} pr-9 ${
                  fieldErrors.companyName
                    ? inputError
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

            {/* Dropdown — always visible when open + has text */}
            {companyOpen && companyName.trim() && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {/* Loading state */}
                {companyLoading && (
                  <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-400">
                    <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                    {rp.companySearchHint}
                  </div>
                )}

                {/* Results */}
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

                {/* No results — allow using typed name */}
                {!companyLoading && companyResults.length === 0 && companySearched && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-xs text-gray-400">
                      {rp.companyNotSelected}
                    </p>
                    <button
                      type="button"
                      onMouseDown={useTypedName}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors text-left border-t border-gray-100 mt-1"
                    >
                      <Building2 size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">
                        {companyName}
                      </span>
                      <span className="ml-auto text-xs text-primary shrink-0">
                        Dùng tên này
                      </span>
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

        {/* Full Name */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            {rp.fullNameLabel} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              placeholder={rp.fullNamePlaceholder}
              className={`${inputBase} ${fieldErrors.fullName ? inputError : ""}`}
              autoComplete="name"
            />
          </div>
          {fieldErrors.fullName && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>
          )}
        </div>

        {/* Job Title */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            {rp.jobTitleLabel} <span className="text-red-500">*</span>
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
                if (fieldErrors.jobTitle) setFieldErrors((prev) => ({ ...prev, jobTitle: undefined }));
              }}
              placeholder={rp.jobTitlePlaceholder}
              className={`${inputBase} ${fieldErrors.jobTitle ? inputError : ""}`}
              autoComplete="organization-title"
            />
          </div>
          {fieldErrors.jobTitle && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.jobTitle}</p>
          )}
        </div>

        {/* Work Email */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            {rp.emailLabel} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder={rp.emailPlaceholder}
              className={`${inputBase} ${fieldErrors.email ? inputError : ""}`}
              autoComplete="email"
            />
          </div>
          {fieldErrors.email && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            {rp.passwordLabel} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder={rp.passwordPlaceholder}
              className={`${inputBase} pr-10 ${fieldErrors.password ? inputError : ""}`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      level <= passwordStrength ? strengthColor : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">{strengthLabel}</p>
            </div>
          )}
          {fieldErrors.password && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            {rp.confirmPasswordLabel} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              placeholder={rp.confirmPasswordPlaceholder}
              className={`${inputBase} pr-10 ${
                confirmPassword.length > 0 && confirmPassword !== password
                  ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                  : confirmPassword.length > 0 && confirmPassword === password
                  ? "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
                  : ""
              }`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            {confirmPassword.length > 0 && confirmPassword === password && (
              <CheckCircle2
                size={15}
                className="absolute right-9 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"
              />
            )}
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        {/* Terms checkbox */}
        <div className="flex items-start gap-2.5">
          <button
            type="button"
            onClick={() => setAgreed((v) => !v)}
            className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              agreed ? "border-primary bg-primary" : "border-gray-300 bg-white"
            }`}
          >
            {agreed && (
              <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                <path
                  d="M1 3L3 5L7 1"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <p className="text-sm text-gray-600 leading-snug">
            {rp.agreeText}{" "}
            <button type="button" className="text-primary font-semibold hover:underline">
              {rp.terms}
            </button>{" "}
            {rp.andText}{" "}
            <button type="button" className="text-primary font-semibold hover:underline">
              {rp.privacyPolicy}
            </button>
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {rp.createAccount} <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">{rp.orContinueWith}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Social buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          GitHub
        </button>
      </div>

      {/* Already have account */}
      <p className="text-center text-sm text-gray-500 mt-6">
        {rp.alreadyHaveAccount}{" "}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          {rp.signIn}
        </Link>
      </p>

      {/* Job Seeker link */}
      <p className="text-center text-sm text-gray-500 mt-2">
        <Link href="/register/jobseeker" className="text-primary font-semibold hover:underline">
          {rp.jobSeekerLink}
        </Link>
      </p>
    </div>
  );
}
