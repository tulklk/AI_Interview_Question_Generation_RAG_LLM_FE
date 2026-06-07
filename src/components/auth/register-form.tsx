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
  ArrowLeft,
  User,
  Building2,
  CheckCircle2,
  Briefcase,
} from "lucide-react";
import type { AxiosError } from "axios";
import { registerHr, loginWithGoogle } from "@/lib/api/auth";
import { updateHrProfile } from "@/lib/api/user";
import { searchCompanies } from "@/lib/api/company";
import type { CompanyOption } from "@/lib/api/company";
import type { ApiErrorResponse } from "@/types/auth";
import {
  setAuth,
  setAuthTokens,
  setUserRole,
  extractRole,
  getRoleRedirect,
  clearAuth,
} from "@/lib/auth";
import { parseGoogleIdToken } from "@/lib/google-id-token";
import { syncGoogleAvatarIfNeeded } from "@/lib/sync-google-avatar";
import { resolveAvatarUrl } from "@/lib/user-display";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import { useUser } from "@/context/user-context";
import { setCachedUserProfile } from "@/lib/user-profile-cache";
import { SocialOAuthRow } from "@/components/auth/social-oauth-buttons";

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
  const { refreshUser, clearUser } = useUser();

  const [step, setStep] = useState<1 | 2>(1);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState("");

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

  function validateStep1(): boolean {
    const errors: FieldErrors = {};
    if (!fullName.trim()) errors.fullName = "Full name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Email is required";
    }
    if (password.length < 8) errors.password = rp.passwordTooShort;
    if (confirmPassword !== password) errors.confirmPassword = rp.passwordMismatch;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }
    return true;
  }

  function handleContinue() {
    setFieldErrors({});
    if (validateStep1()) setStep(2);
  }

  function persistGoogleSession(data: unknown) {
    const d = data as Record<string, unknown>;
    const src = (typeof d.data === "object" && d.data ? d.data : d) as Record<string, unknown>;
    const accessToken = (src.accessToken ?? src.access_token ?? src.token) as string | undefined;
    const refreshToken = (src.refreshToken ?? src.refresh_token) as string | undefined;
    if (accessToken) setAuthTokens(accessToken, refreshToken);
    setAuth();
    const role = extractRole(data) ?? "HR_MANAGER";
    setUserRole(role);
  }

  async function handleGoogle(credential: string | undefined) {
    if (!credential) {
      addToast("error", rp.registrationFailed);
      return;
    }
    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle({ idToken: credential, intendedRole: "HR_MANAGER" });
      persistGoogleSession(res);

      const claims = parseGoogleIdToken(credential);
      const googleEmail = claims.email ?? "";
      const googleName = claims.name ?? googleEmail.split("@")[0] ?? "";
      const googlePicture = claims.picture?.trim() ?? "";
      setGoogleAvatarUrl(googlePicture);
      setFullName(googleName);
      setEmail(googleEmail);

      let profile = await refreshUser();
      if (googlePicture) {
        try {
          await syncGoogleAvatarIfNeeded(credential, profile, "HR_MANAGER");
          profile = await refreshUser();
        } catch {
          // Profile may not exist yet; avatar is saved on step 2 submit.
        }
      }

      setCachedUserProfile({
        fullName: googleName,
        email: googleEmail,
        avatarUrl: resolveAvatarUrl(profile) ?? (googlePicture || null),
      });
      setPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      setIsGoogleSignup(true);
      setStep(2);
      addToast(
        "success",
        rp.googleSignupSuccess.replace("{{email}}", googleEmail || googleName)
      );
    } catch {
      addToast("error", rp.registrationFailed);
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleBackFromStep2() {
    if (isGoogleSignup) {
      clearUser();
      clearAuth();
      setIsGoogleSignup(false);
      setGoogleAvatarUrl("");
      setFullName("");
      setEmail("");
    }
    setStep(1);
    setFieldErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    if (!agreed) {
      addToast("error", rp.mustAgree);
      return;
    }

    const errors: FieldErrors = {};
    if (!companyName.trim()) errors.companyName = "Company name is required";
    if (!jobTitle.trim()) errors.jobTitle = "Job title is required";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      if (isGoogleSignup) {
        const displayName =
          fullName.trim() || email.trim().split("@")[0] || "User";
        await updateHrProfile({
          fullName: displayName,
          companyId: companyId || undefined,
          companyName: companyName.trim(),
          jobTitle: jobTitle.trim(),
          avatarUrl: googleAvatarUrl.trim() || undefined,
        });
        setCachedUserProfile({
          fullName: displayName,
          email: email.trim(),
          avatarUrl: googleAvatarUrl.trim() || null,
        });
        await refreshUser();
        addToast("success", rp.profileCompleteSuccess);
        router.push(getRoleRedirect("HR_MANAGER"));
        return;
      }

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
        setStep(1);
      } else if (data?.errors) {
        setFieldErrors(data.errors as FieldErrors);
      } else {
        addToast("error", msg || (isGoogleSignup ? rp.profileCompleteFailed : rp.registrationFailed));
      }
    } finally {
      setLoading(false);
    }
  }

  const inputBase =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-gray-400";
  const inputReadOnly =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed";
  const inputError = "border-red-300 focus:border-red-400 focus:ring-red-100";

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-up">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        <span
          className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
            step === 1 ? "bg-primary text-white" : "bg-emerald-500 text-white"
          }`}
        >
          {step === 1 ? "1" : <CheckCircle2 size={14} />}
        </span>
        <span className={`text-xs font-medium ${step === 1 ? "text-primary" : "text-emerald-600"}`}>
          {rp.step1Title}
        </span>
        <div className="flex-1 h-px bg-gray-200 mx-1" />
        <span
          className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
            step === 2 ? "bg-primary text-white" : "bg-gray-200 text-gray-400"
          }`}
        >
          2
        </span>
        <span className={`text-xs font-medium ${step === 2 ? "text-primary" : "text-gray-400"}`}>
          {rp.step2Title}
        </span>
      </div>

      {/* Step 1: Account info */}
      {step === 1 && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{rp.title}</h2>
          <p className="text-sm text-gray-500 mb-6">{rp.subtitle}</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.fullNameLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
                  }}
                  placeholder={rp.fullNamePlaceholder}
                  className={`${inputBase} ${fieldErrors.fullName ? inputError : ""}`}
                  autoComplete="name"
                />
              </div>
              {fieldErrors.fullName && <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.emailLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder={rp.emailPlaceholder}
                  className={`${inputBase} ${fieldErrors.email ? inputError : ""}`}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.passwordLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder={rp.passwordPlaceholder}
                  className={`${inputBase} pr-10 ${fieldErrors.password ? inputError : ""}`}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div key={level} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${level <= passwordStrength ? strengthColor : "bg-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{strengthLabel}</p>
                </div>
              )}
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.confirmPasswordLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
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
                {confirmPassword.length > 0 && confirmPassword === password ? (
                  <CheckCircle2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                ) : (
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
              {fieldErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>}
            </div>

            <button
              type="button"
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold text-sm py-3 rounded-lg transition-colors"
            >
              {rp.continueButton} <ArrowRight size={15} />
            </button>
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">{rp.orContinueWith}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <SocialOAuthRow
            googleLoading={googleLoading}
            googleMode="signup"
            onGoogleSuccess={handleGoogle}
            onGoogleError={() => addToast("error", rp.registrationFailed)}
          />

          <p className="text-center text-sm text-gray-500 mt-5">
            {rp.alreadyHaveAccount}{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              {rp.signIn}
            </Link>
          </p>
        </>
      )}

      {/* Step 2: HR profile */}
      {step === 2 && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{rp.step2Title}</h2>
          <p className="text-sm text-gray-500 mb-6">
            {isGoogleSignup ? rp.googleStep2Hint : rp.step2Subtitle}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {isGoogleSignup && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    {rp.fullNameLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="text" value={fullName} readOnly tabIndex={-1} aria-readonly="true" className={inputReadOnly} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    {rp.emailLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="email" value={email} readOnly tabIndex={-1} aria-readonly="true" className={inputReadOnly} />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.companyNameLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={companyRef}>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    onFocus={() => { if (companyName.trim()) setCompanyOpen(true); }}
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
                    <CheckCircle2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                  ) : null}
                </div>

                {companyOpen && companyName.trim() && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {companyLoading && (
                      <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-400">
                        <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                        {rp.companySearchHint}
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
                        <p className="px-4 pt-3 pb-1 text-xs text-gray-400">{rp.companyNotSelected}</p>
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
              {fieldErrors.companyName && <p className="text-xs text-red-500 mt-1">{fieldErrors.companyName}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.jobTitleLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Briefcase size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => {
                    setJobTitle(e.target.value);
                    if (fieldErrors.jobTitle) setFieldErrors((p) => ({ ...p, jobTitle: undefined }));
                  }}
                  placeholder={rp.jobTitlePlaceholder}
                  className={`${inputBase} ${fieldErrors.jobTitle ? inputError : ""}`}
                  autoComplete="organization-title"
                />
              </div>
              {fieldErrors.jobTitle && <p className="text-xs text-red-500 mt-1">{fieldErrors.jobTitle}</p>}
            </div>

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
                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <p className="text-sm text-gray-600 leading-snug">
                {rp.agreeText}{" "}
                <button type="button" className="text-primary font-semibold hover:underline">{rp.terms}</button>{" "}
                {rp.andText}{" "}
                <button type="button" className="text-primary font-semibold hover:underline">{rp.privacyPolicy}</button>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>{rp.createAccount} <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={handleBackFromStep2}
            className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={14} />
            {rp.backButton}
          </button>
        </>
      )}
    </div>
  );
}
