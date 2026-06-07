"use client";

import { useState, useRef, useEffect } from "react";
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
  Briefcase,
  CheckCircle2,
  X,
  ChevronDown,
  Search,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import type { AxiosError } from "axios";
import { registerCandidate, loginWithGoogle, updateCandidateProfile } from "@/lib/api/auth";
import { setAuth, setAuthTokens, setUserRole, extractRole, getRoleRedirect, clearAuth } from "@/lib/auth";
import { parseGoogleIdToken } from "@/lib/google-id-token";
import { syncGoogleAvatarIfNeeded } from "@/lib/sync-google-avatar";
import { resolveAvatarUrl } from "@/lib/user-display";
import type { ApiErrorResponse } from "@/types/auth";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import { useUser } from "@/context/user-context";
import { setCachedUserProfile } from "@/lib/user-profile-cache";

const TECH_OPTIONS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular",
  "Node.js", "Python", "Java", "Go", "C#", "PHP", "Ruby", "Swift", "Kotlin",
  "Docker", "Kubernetes", "AWS", "Azure", "MySQL", "PostgreSQL", "MongoDB",
  "Redis", "GraphQL",
];

const SENIORITY_LEVELS = ["Intern", "Junior", "Mid-level", "Senior", "Lead"];

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  targetRole?: string;
  seniorityLevel?: string;
  techStack?: string;
}

export function RegisterJobSeekerForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const rp = t.registerJobSeekerPage;
  const { addToast } = useToast();
  const { refreshUser, clearUser } = useUser();

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState("");

  // ── Step 1 fields ───────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Step 2 fields ───────────────────────────────────────────────────────────
  const [targetRole, setTargetRole] = useState("");
  const [seniorityLevel, setSeniorityLevel] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techSearch, setTechSearch] = useState("");
  const [techOpen, setTechOpen] = useState(false);

  // ── Shared ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const techDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (techDropdownRef.current && !techDropdownRef.current.contains(e.target as Node)) {
        setTechOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Password strength ────────────────────────────────────────────────────────
  const passwordStrength =
    password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 8 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4
    : 3;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-emerald-500"][passwordStrength];

  // ── Tech stack helpers ───────────────────────────────────────────────────────
  const filteredTech = TECH_OPTIONS.filter(
    (t) => t.toLowerCase().includes(techSearch.toLowerCase()) && !techStack.includes(t)
  );

  function toggleTech(tech: string) {
    setTechStack((prev) => prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]);
    if (fieldErrors.techStack) setFieldErrors((p) => ({ ...p, techStack: undefined }));
  }

  // ── Step 1 validation ────────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const errors: FieldErrors = {};
    if (!fullName.trim()) errors.fullName = "Họ tên là bắt buộc";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = "Vui lòng nhập email hợp lệ";
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

  // ── Submit (step 2) ──────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const errors: FieldErrors = {};
    if (!targetRole.trim()) errors.targetRole = "Vị trí mục tiêu là bắt buộc";
    if (!seniorityLevel) errors.seniorityLevel = "Vui lòng chọn cấp độ kinh nghiệm";
    if (techStack.length === 0) errors.techStack = "Chọn ít nhất một công nghệ";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      if (isGoogleSignup) {
        const displayName =
          fullName.trim() || email.trim().split("@")[0] || "User";
        await updateCandidateProfile({
          fullName: displayName,
          targetRole: targetRole.trim(),
          seniorityLevel,
          techStack,
          avatarUrl: googleAvatarUrl.trim() || undefined,
        });
        setCachedUserProfile({
          fullName: displayName,
          email: email.trim(),
          avatarUrl: googleAvatarUrl.trim() || null,
        });
        await refreshUser();
        addToast("success", rp.profileCompleteSuccess);
        router.push(getRoleRedirect("JOB_SEEKER"));
        return;
      }

      await registerCandidate({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        targetRole: targetRole.trim(),
        seniorityLevel,
        techStack,
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

  function persistGoogleSession(data: unknown) {
    const d = data as Record<string, unknown>;
    const src = (typeof d.data === "object" && d.data ? d.data : d) as Record<string, unknown>;
    const accessToken = (src.accessToken ?? src.access_token ?? src.token) as string | undefined;
    const refreshToken = (src.refreshToken ?? src.refresh_token) as string | undefined;
    if (accessToken) setAuthTokens(accessToken, refreshToken);
    setAuth();
    const role = extractRole(data) ?? "JOB_SEEKER";
    setUserRole(role);
  }

  async function handleGoogle(credential: string | undefined) {
    if (!credential) {
      addToast("error", rp.registrationFailed);
      return;
    }
    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle({ idToken: credential, intendedRole: "JOB_SEEKER" });
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
          await syncGoogleAvatarIfNeeded(credential, profile, "JOB_SEEKER");
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
    }
    setStep(1);
    setFieldErrors({});
  }

  // ── Shared input class ───────────────────────────────────────────────────────
  const inputBase =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-gray-400";
  const inputReadOnly =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed";
  const inputErrorCls = "border-red-300 focus:border-red-400 focus:ring-red-100";

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-up">

      {/* ── Step indicator ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        {/* Step 1 bubble */}
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
        {/* Step 2 bubble */}
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

      {/* ── Step 1: Account info ───────────────────────────────────────────── */}
      {step === 1 && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{rp.title}</h2>
          <p className="text-sm text-gray-500 mb-6">{rp.subtitle}</p>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.fullNameLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined })); }}
                  placeholder={rp.fullNamePlaceholder}
                  className={`${inputBase} ${fieldErrors.fullName ? inputErrorCls : ""}`}
                  autoComplete="name"
                />
              </div>
              {fieldErrors.fullName && <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.emailLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder={rp.emailPlaceholder}
                  className={`${inputBase} ${fieldErrors.email ? inputErrorCls : ""}`}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.passwordLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined })); }}
                  placeholder={rp.passwordPlaceholder}
                  className={`${inputBase} pr-10 ${fieldErrors.password ? inputErrorCls : ""}`}
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

            {/* Confirm Password */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.confirmPasswordLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                  placeholder={rp.confirmPasswordPlaceholder}
                  className={`${inputBase} pr-10 ${
                    confirmPassword.length > 0 && confirmPassword !== password ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                    : confirmPassword.length > 0 && confirmPassword === password ? "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100"
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

            {/* Continue button */}
            <button
              type="button"
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold text-sm py-3 rounded-lg transition-colors"
            >
              {rp.continueButton} <ArrowRight size={15} />
            </button>
          </div>

          {/* Divider + Google OAuth */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">{rp.orContinueWith}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="relative">
            {googleLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg z-10">
                <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            <GoogleLogin
              onSuccess={(c) => handleGoogle(c.credential)}
              onError={() => addToast("error", rp.registrationFailed)}
              useOneTap={false}
              text="signup_with"
              width="100%"
            />
          </div>

          {/* Footer links */}
          <p className="text-center text-sm text-gray-500 mt-5">
            {rp.alreadyHaveAccount}{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              {rp.signIn}
            </Link>
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            <Link href="/register" className="text-primary font-semibold hover:underline">
              {rp.hrRegisterLink}
            </Link>
          </p>
        </>
      )}

      {/* ── Step 2: Profile ────────────────────────────────────────────────── */}
      {step === 2 && (
        <>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{rp.step2Title}</h2>
          <p className="text-sm text-gray-500 mb-6">
            {isGoogleSignup ? rp.googleStep2Hint : rp.step2Subtitle}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {isGoogleSignup && (
              <>
                {/* Full Name — prefilled from Google, read-only */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    {rp.fullNameLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={fullName}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      className={inputReadOnly}
                    />
                  </div>
                </div>

                {/* Email — prefilled from Google, read-only */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    {rp.emailLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      className={inputReadOnly}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Target Role */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.targetRoleLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Briefcase size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => { setTargetRole(e.target.value); if (fieldErrors.targetRole) setFieldErrors((p) => ({ ...p, targetRole: undefined })); }}
                  placeholder={rp.targetRolePlaceholder}
                  className={`${inputBase} ${fieldErrors.targetRole ? inputErrorCls : ""}`}
                />
              </div>
              {fieldErrors.targetRole && <p className="text-xs text-red-500 mt-1">{fieldErrors.targetRole}</p>}
            </div>

            {/* Seniority Level */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.seniorityLabel} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={seniorityLevel}
                  onChange={(e) => { setSeniorityLevel(e.target.value); if (fieldErrors.seniorityLevel) setFieldErrors((p) => ({ ...p, seniorityLevel: undefined })); }}
                  className={`w-full px-3.5 py-2.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none pr-9 ${
                    fieldErrors.seniorityLevel ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-gray-200"
                  } ${!seniorityLevel ? "text-gray-400" : "text-gray-900"}`}
                >
                  <option value="" disabled>{rp.seniorityPlaceholder}</option>
                  {SENIORITY_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              {fieldErrors.seniorityLevel && <p className="text-xs text-red-500 mt-1">{fieldErrors.seniorityLevel}</p>}
            </div>

            {/* Tech Stack */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                {rp.techStackLabel} <span className="text-red-500">*</span>
              </label>

              {/* Selected tags */}
              {techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {techStack.map((tech) => (
                    <span key={tech} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {tech}
                      <button type="button" onClick={() => setTechStack((p) => p.filter((t) => t !== tech))} className="hover:text-primary/70 transition-colors">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search + dropdown */}
              <div className="relative" ref={techDropdownRef}>
                <div className={`flex items-center border rounded-lg bg-white transition-colors ${
                  techOpen ? "border-primary ring-2 ring-primary/20"
                  : fieldErrors.techStack ? "border-red-300"
                  : "border-gray-200"
                }`}>
                  <Search size={14} className="ml-3 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={techSearch}
                    onChange={(e) => setTechSearch(e.target.value)}
                    onFocus={() => setTechOpen(true)}
                    placeholder={rp.techStackSearch}
                    className="flex-1 px-2.5 py-2.5 text-sm bg-transparent focus:outline-none placeholder:text-gray-400"
                  />
                </div>
                {techOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredTech.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-gray-400 text-center">{rp.techStackEmpty}</p>
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
              {fieldErrors.techStack && <p className="text-xs text-red-500 mt-1">{fieldErrors.techStack}</p>}
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
                <>{rp.createAccount} <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          {/* Back link */}
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
