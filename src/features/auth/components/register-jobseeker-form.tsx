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
import { motion, AnimatePresence, type Variants } from "framer-motion";
import type { AxiosError } from "axios";
import { registerCandidate } from "@/features/auth/services/auth.service";
import {
  verifyGoogleToken,
  completeGoogleLogin,
  finishGoogleAuth,
  parseGoogleClaims,
} from "@/features/auth/utils/google-oauth-flow";
import { toBackendIntendedRole, type RegisterRoleKey } from "@/features/auth/utils/google-onboarding";
import type { ApiErrorResponse } from "@/features/auth/types/auth";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { useUser } from "@/features/auth/context/user-context";
import { SocialOAuthRow } from "@/features/auth/components/social-oauth-buttons";

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
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" } },
};

const headingContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.02 } },
};

const headingWord: Variants = {
  hidden:  { opacity: 0, y: 24, scale: 0.82, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
};

// ── Reusable shimmer button ───────────────────────────────────────────────────

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

// ── Data ──────────────────────────────────────────────────────────────────────

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

interface RegisterJobSeekerFormProps {
  registerRole?: RegisterRoleKey;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RegisterJobSeekerForm({ registerRole = "jobseeker" }: RegisterJobSeekerFormProps) {
  const intendedRole = toBackendIntendedRole(registerRole);
  const router = useRouter();
  const { t } = useLanguage();
  const rp = t.registerJobSeekerPage;
  const lp = t.loginPage;
  const { addToast } = useToast();
  const { refreshUser } = useUser();

  const stepDir = useRef<1 | -1>(1);
  const [step, setStep] = useState<1 | 2>(1);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [googleCredential, setGoogleCredential] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [targetRole, setTargetRole] = useState("");
  const [seniorityLevel, setSeniorityLevel] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techSearch, setTechSearch] = useState("");
  const [techOpen, setTechOpen] = useState(false);

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

  const passwordStrength =
    password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 8 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4
    : 3;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "bg-red-400", "bg-amber-400", "bg-yellow-400", "bg-emerald-500"][passwordStrength];

  const filteredTech = TECH_OPTIONS.filter(
    (t) => t.toLowerCase().includes(techSearch.toLowerCase()) && !techStack.includes(t)
  );

  function toggleTech(tech: string) {
    setTechStack((prev) => prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]);
    if (fieldErrors.techStack) setFieldErrors((p) => ({ ...p, techStack: undefined }));
  }

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
    if (validateStep1()) {
      stepDir.current = 1;
      setStep(2);
    }
  }

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
        const claims = parseGoogleClaims(googleCredential);
        const { role } = await completeGoogleLogin(googleCredential, {
          intendedRole,
          targetRole: targetRole.trim(),
          seniorityLevel,
          techStack,
        });
        addToast("success", rp.profileCompleteSuccess);
        await finishGoogleAuth(router, refreshUser, claims, googleCredential, role);
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
        addToast("error", isGoogleSignup ? rp.profileCompleteFailed : rp.registrationFailed);
      }
    } finally {
      setLoading(false);
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
    }
    setStep(1);
    setFieldErrors({});
  }

  const inputBase =
    "auth-input-glow w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-gray-400 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500";
  const inputReadOnly =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400";
  const inputErrorCls = "border-red-300 focus:border-red-400 focus:ring-red-100";

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
        <div className="relative flex-1 h-px bg-gray-200 dark:bg-gray-700 mx-1 overflow-hidden">
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
                className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight"
              >
                {rp.title.split(" ").map((word, i) => (
                  <motion.span key={i} variants={headingWord} className="inline-block mr-[0.28em] last:mr-0">
                    {word}
                  </motion.span>
                ))}
              </motion.h2>
              <motion.p variants={fieldRow} className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                {rp.subtitle}
              </motion.p>

              <div className="space-y-4">
                {/* Full Name */}
                <motion.div variants={fieldRow}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
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
                </motion.div>

                {/* Email */}
                <motion.div variants={fieldRow}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
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
                </motion.div>

                {/* Password */}
                <motion.div variants={fieldRow}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
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
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="auth-eye-btn absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:hover:text-gray-300" tabIndex={-1}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((level) => (
                          <motion.div
                            key={level}
                            className={`h-1 flex-1 rounded-full ${level <= passwordStrength ? strengthColor : "bg-gray-200 dark:bg-gray-700"}`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: level <= passwordStrength ? 1 : 0.3 }}
                            transition={{ duration: 0.3, delay: level * 0.05 }}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{strengthLabel}</p>
                    </div>
                  )}
                  {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
                </motion.div>

                {/* Confirm Password */}
                <motion.div variants={fieldRow}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
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
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} className="auth-eye-btn absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:hover:text-gray-300" tabIndex={-1}>
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
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 dark:text-gray-500">{rp.orContinueWith}</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </motion.div>
              <motion.div variants={fieldRow}>
                <SocialOAuthRow
                  googleLoading={googleLoading}
                  googleMode="signup"
                  onGoogleSuccess={handleGoogle}
                  onGoogleError={() => addToast("error", rp.registrationFailed)}
                />
              </motion.div>
              <motion.p variants={fieldRow} className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
                {rp.alreadyHaveAccount}{" "}
                <Link href="/login" className="auth-link-glow font-semibold">
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
                className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight"
              >
                {rp.step2Title.split(" ").map((word, i) => (
                  <motion.span key={i} variants={headingWord} className="inline-block mr-[0.28em] last:mr-0">
                    {word}
                  </motion.span>
                ))}
              </motion.h2>
              <motion.p variants={fieldRow} className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                {isGoogleSignup ? rp.googleStep2Hint : rp.step2Subtitle}
              </motion.p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {isGoogleSignup && (
                  <>
                    <motion.div variants={fieldRow}>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                        {rp.fullNameLabel} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input type="text" value={fullName} readOnly tabIndex={-1} aria-readonly="true" className={inputReadOnly} />
                      </div>
                    </motion.div>
                    <motion.div variants={fieldRow}>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                        {rp.emailLabel} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input type="email" value={email} readOnly tabIndex={-1} aria-readonly="true" className={inputReadOnly} />
                      </div>
                    </motion.div>
                  </>
                )}

                {/* Target Role */}
                <motion.div variants={fieldRow}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
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
                </motion.div>

                {/* Seniority Level */}
                <motion.div variants={fieldRow}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                    {rp.seniorityLabel} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                      value={seniorityLevel}
                      onChange={(e) => { setSeniorityLevel(e.target.value); if (fieldErrors.seniorityLevel) setFieldErrors((p) => ({ ...p, seniorityLevel: undefined })); }}
                      className={`w-full px-3.5 py-2.5 text-sm border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none pr-9 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 ${
                        fieldErrors.seniorityLevel ? "border-red-300 focus:border-red-400 focus:ring-red-100" : "border-gray-200"
                      } ${!seniorityLevel ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"}`}
                    >
                      <option value="" disabled>{rp.seniorityPlaceholder}</option>
                      {SENIORITY_LEVELS.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                  {fieldErrors.seniorityLevel && <p className="text-xs text-red-500 mt-1">{fieldErrors.seniorityLevel}</p>}
                </motion.div>

                {/* Tech Stack */}
                <motion.div variants={fieldRow}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                    {rp.techStackLabel} <span className="text-red-500">*</span>
                  </label>

                  {/* Selected tags — spring pop-in */}
                  {techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <AnimatePresence>
                        {techStack.map((tech) => (
                          <motion.span
                            key={tech}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            layout
                          >
                            {tech}
                            <button
                              type="button"
                              onClick={() => setTechStack((p) => p.filter((t) => t !== tech))}
                              className="hover:text-primary/70 transition-colors"
                            >
                              <X size={11} />
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Search + dropdown */}
                  <div className="relative" ref={techDropdownRef}>
                    <div className={`flex items-center border rounded-lg bg-white dark:bg-gray-900 transition-colors ${
                      techOpen ? "border-primary ring-2 ring-primary/20"
                      : fieldErrors.techStack ? "border-red-300"
                      : "border-gray-200 dark:border-gray-700"
                    }`}>
                      <Search size={14} className="ml-3 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={techSearch}
                        onChange={(e) => setTechSearch(e.target.value)}
                        onFocus={() => setTechOpen(true)}
                        placeholder={rp.techStackSearch}
                        className="flex-1 px-2.5 py-2.5 text-sm bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                    </div>
                    <AnimatePresence>
                      {techOpen && (
                        <motion.div
                          className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.97 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                        >
                          {filteredTech.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">{rp.techStackEmpty}</p>
                          ) : (
                            <div className="p-2 flex flex-wrap gap-1.5">
                              {filteredTech.map((tech) => (
                                <button
                                  key={tech}
                                  type="button"
                                  onClick={() => toggleTech(tech)}
                                  className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                                >
                                  {tech}
                                </button>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {fieldErrors.techStack && <p className="text-xs text-red-500 mt-1">{fieldErrors.techStack}</p>}
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
                  className="mt-4 w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
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
