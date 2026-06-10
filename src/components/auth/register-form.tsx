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
import { motion, AnimatePresence, type Variants } from "framer-motion";
import type { AxiosError } from "axios";
import { registerHr } from "@/lib/api/auth";
import { searchCompanies } from "@/lib/api/company";
import type { CompanyOption } from "@/lib/api/company";
import type { ApiErrorResponse } from "@/types/auth";
import {
  verifyGoogleToken,
  completeGoogleLogin,
  finishGoogleAuth,
  parseGoogleClaims,
} from "@/lib/google-oauth-flow";
import { toBackendIntendedRole, type RegisterRoleKey } from "@/lib/google-onboarding";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import { useUser } from "@/context/user-context";
import { SocialOAuthRow } from "@/components/auth/social-oauth-buttons";

// ── Animation variants ───────────────────────────────────────────────────────

const stepContentVariants: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 30 : -30 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit:  (dir: number) => ({ opacity: 0, x: dir > 0 ? -30 : 30, transition: { duration: 0.2, ease: "easeIn" } }),
};

const fieldRows: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const fieldRow: Variants = {
  hidden:   { opacity: 0, y: 14 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } },
};

const headingContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.02 } },
};

const headingWord: Variants = {
  hidden:  { opacity: 0, y: 24, scale: 0.82, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
};

// ── Shimmer button ────────────────────────────────────────────────────────────

function ShimmerButton({
  type = "button",
  onClick,
  disabled,
  className,
  children,
}: {
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`relative overflow-hidden flex items-center justify-center gap-2 ${className ?? ""}`}
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
    >
      <motion.span
        className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none"
        initial={{ x: "-100%" }}
        variants={{ hover: { x: "250%", transition: { duration: 0.55, ease: "easeInOut" } } }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

// ── Field errors ──────────────────────────────────────────────────────────────

interface FieldErrors {
  companyName?: string;
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  jobTitle?: string;
}

interface RegisterFormProps {
  registerRole?: RegisterRoleKey;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RegisterForm({ registerRole = "hr" }: RegisterFormProps) {
  const intendedRole = toBackendIntendedRole(registerRole);
  const router = useRouter();
  const { t } = useLanguage();
  const rp = t.registerPage;
  const lp = t.loginPage;
  const { addToast } = useToast();
  const { refreshUser } = useUser();

  const stepDir = useRef<1 | -1>(1);
  const [step, setStep] = useState<1 | 2>(1);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleCredential, setGoogleCredential] = useState("");

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
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-emerald-500"][passwordStrength];

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
    if (validateStep1()) {
      stepDir.current = 1;
      setStep(2);
    }
  }

  async function handleGoogle(credential: string | undefined) {
    if (!credential) {
      addToast("error", rp.registrationFailed);
      return;
    }
    setGoogleLoading(true);
    try {
      const claims = parseGoogleClaims(credential);
      const verify = await verifyGoogleToken(credential, { intendedRole });

      if (verify.linkedToLocalAccount) {
        addToast("error", lp.useEmailPassword);
        return;
      }

      if (!verify.isNewUser) {
        const { role } = await completeGoogleLogin(credential, { intendedRole });
        addToast("success", lp.googleAccountExists);
        await finishGoogleAuth(router, refreshUser, claims, credential, role);
        return;
      }

      setGoogleCredential(credential);
      setFullName(claims.name);
      setEmail(claims.email);
      setPassword("");
      setConfirmPassword("");
      setFieldErrors({});
      setIsGoogleSignup(true);
      stepDir.current = 1;
      setStep(2);
      addToast("success", rp.googleSignupSuccess.replace("{{email}}", claims.email || claims.name));
    } catch {
      addToast("error", rp.registrationFailed);
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleBackFromStep2() {
    stepDir.current = -1;
    if (isGoogleSignup) {
      setIsGoogleSignup(false);
      setGoogleCredential("");
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
        const claims = parseGoogleClaims(googleCredential);
        const { role } = await completeGoogleLogin(googleCredential, {
          intendedRole,
          companyId: companyId || undefined,
          companyName: companyName.trim(),
          jobTitle: jobTitle.trim(),
        });
        addToast("success", rp.profileCompleteSuccess);
        await finishGoogleAuth(router, refreshUser, claims, googleCredential, role);
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
    "auth-input-glow w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-gray-400";
  const inputReadOnly =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed";
  const inputError = "border-red-300 focus:border-red-400 focus:ring-red-100";

  return (
    <motion.div
      className="w-full max-w-sm mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {/* ── Animated step indicator ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-5">
        {/* Step 1 bubble */}
        <div className="relative shrink-0 w-7 h-7">
          {/* Pulsing glow ring — active only */}
          <span
            className={`absolute inset-0 rounded-full bg-primary pointer-events-none ${step === 1 ? "step-ring-active" : "opacity-0"}`}
          />
          <motion.span
            className="relative w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center overflow-hidden"
            animate={{ backgroundColor: step === 1 ? "#6c47ff" : "#10b981" }}
            transition={{ duration: 0.35 }}
          >
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.span
                  key="n1"
                  className="text-white"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  1
                </motion.span>
              ) : (
                <motion.span
                  key="c1"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <CheckCircle2 size={14} className="text-white" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        </div>

        <motion.span
          className="text-xs"
          animate={{
            color: step === 1 ? "#6c47ff" : "#059669",
            fontWeight: step === 1 ? 700 : 500,
          }}
          transition={{ duration: 0.3 }}
        >
          {rp.step1Title}
        </motion.span>

        {/* Animated progress line */}
        <div className="relative flex-1 h-px bg-gray-200 mx-1 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-emerald-400 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: step === 2 ? "100%" : "0%" }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
          />
        </div>

        {/* Step 2 bubble */}
        <div className="relative shrink-0 w-7 h-7">
          <span
            className={`absolute inset-0 rounded-full bg-primary pointer-events-none ${step === 2 ? "step-ring-active" : "opacity-0"}`}
          />
          <motion.span
            className="relative w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
            animate={{
              backgroundColor: step === 2 ? "#6c47ff" : "#e5e7eb",
              color: step === 2 ? "#ffffff" : "#9ca3af",
              scale: step === 2 ? [1, 1.18, 1] : 1,
            }}
            transition={{ duration: 0.35 }}
          >
            2
          </motion.span>
        </div>

        <motion.span
          className="text-xs"
          animate={{
            color: step === 2 ? "#6c47ff" : "#9ca3af",
            fontWeight: step === 2 ? 700 : 500,
          }}
          transition={{ duration: 0.3 }}
        >
          {rp.step2Title}
        </motion.span>
      </div>

      {/* ── Step content with slide transition ──────────────────────────────── */}
      <AnimatePresence mode="wait" custom={stepDir.current}>
        {step === 1 ? (
          <motion.div
            key="step1"
            custom={stepDir.current}
            variants={stepContentVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <motion.div variants={fieldRows} initial="hidden" animate="visible">
              <motion.h2
                variants={headingContainer}
                className="text-2xl font-bold text-gray-900 mb-3 leading-tight"
              >
                {rp.title.split(" ").map((word, i) => (
                  <motion.span key={i} variants={headingWord} className="inline-block mr-[0.28em] last:mr-0">
                    {word}
                  </motion.span>
                ))}
              </motion.h2>
              <motion.p variants={fieldRow} className="text-sm text-gray-500 mb-5">
                {rp.subtitle}
              </motion.p>

              <div className="space-y-4">
                {/* Full name */}
                <motion.div variants={fieldRow}>
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
                      className={`${inputBase} ${fieldErrors.fullName ? inputError : ""}`}
                      autoComplete="name"
                    />
                  </div>
                  {fieldErrors.fullName && <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>}
                </motion.div>

                {/* Email */}
                <motion.div variants={fieldRow}>
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
                      className={`${inputBase} ${fieldErrors.email ? inputError : ""}`}
                      autoComplete="email"
                    />
                  </div>
                  {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                </motion.div>

                {/* Password */}
                <motion.div variants={fieldRow}>
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
                          <motion.div
                            key={level}
                            className={`h-1 flex-1 rounded-full ${level <= passwordStrength ? strengthColor : "bg-gray-200"}`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: level <= passwordStrength ? 1 : 0.3 }}
                            transition={{ duration: 0.3, delay: level * 0.05 }}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{strengthLabel}</p>
                    </div>
                  )}
                  {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
                </motion.div>

                {/* Confirm password */}
                <motion.div variants={fieldRow}>
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
                </motion.div>

                {/* Continue button */}
                <motion.div variants={fieldRow}>
                  <ShimmerButton
                    type="button"
                    onClick={handleContinue}
                    className="w-full bg-primary hover:bg-primary-hover text-white font-semibold text-sm py-3 rounded-lg transition-colors"
                  >
                    {rp.continueButton} <ArrowRight size={15} />
                  </ShimmerButton>
                </motion.div>
              </div>

              {/* Divider + Social */}
              <motion.div variants={fieldRow} className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{rp.orContinueWith}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </motion.div>
              <motion.div variants={fieldRow}>
                <SocialOAuthRow
                  googleLoading={googleLoading}
                  googleMode="signup"
                  onGoogleSuccess={handleGoogle}
                  onGoogleError={() => addToast("error", rp.registrationFailed)}
                />
              </motion.div>
              <motion.p variants={fieldRow} className="text-center text-sm text-gray-500 mt-5">
                {rp.alreadyHaveAccount}{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  {rp.signIn}
                </Link>
              </motion.p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            custom={stepDir.current}
            variants={stepContentVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <motion.div variants={fieldRows} initial="hidden" animate="visible">
              <motion.h2
                variants={headingContainer}
                className="text-2xl font-bold text-gray-900 mb-3 leading-tight"
              >
                {rp.step2Title.split(" ").map((word, i) => (
                  <motion.span key={i} variants={headingWord} className="inline-block mr-[0.28em] last:mr-0">
                    {word}
                  </motion.span>
                ))}
              </motion.h2>
              <motion.p variants={fieldRow} className="text-sm text-gray-500 mb-5">
                {isGoogleSignup ? rp.googleStep2Hint : rp.step2Subtitle}
              </motion.p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {isGoogleSignup && (
                  <>
                    <motion.div variants={fieldRow}>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">
                        {rp.fullNameLabel} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input type="text" value={fullName} readOnly tabIndex={-1} aria-readonly="true" className={inputReadOnly} />
                      </div>
                    </motion.div>
                    <motion.div variants={fieldRow}>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">
                        {rp.emailLabel} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input type="email" value={email} readOnly tabIndex={-1} aria-readonly="true" className={inputReadOnly} />
                      </div>
                    </motion.div>
                  </>
                )}

                {/* Company name */}
                <motion.div variants={fieldRow}>
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
                          fieldErrors.companyName ? inputError : companyId ? "border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100" : ""
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
                </motion.div>

                {/* Job title */}
                <motion.div variants={fieldRow}>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">
                    {rp.jobTitleLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => { setJobTitle(e.target.value); if (fieldErrors.jobTitle) setFieldErrors((p) => ({ ...p, jobTitle: undefined })); }}
                      placeholder={rp.jobTitlePlaceholder}
                      className={`${inputBase} ${fieldErrors.jobTitle ? inputError : ""}`}
                      autoComplete="organization-title"
                    />
                  </div>
                  {fieldErrors.jobTitle && <p className="text-xs text-red-500 mt-1">{fieldErrors.jobTitle}</p>}
                </motion.div>

                {/* Agree */}
                <motion.div variants={fieldRow} className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAgreed((v) => !v)}
                    className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${agreed ? "border-primary bg-primary" : "border-gray-300 bg-white"}`}
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
                </motion.div>

                {/* Submit */}
                <motion.div variants={fieldRow}>
                  <ShimmerButton
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>{rp.createAccount} <ArrowRight size={15} /></>
                    )}
                  </ShimmerButton>
                </motion.div>
              </form>

              <motion.div variants={fieldRow}>
                <button
                  type="button"
                  onClick={handleBackFromStep2}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft size={14} />
                  {rp.backButton}
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
