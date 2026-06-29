"use client";

import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion, type Variants } from "framer-motion";

const formContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const formRow: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const headingContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.02 } },
};

const headingWord: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.82, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.5, ease: "easeOut" } },
};
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { SocialOAuthRow } from "@/features/auth/components/social-oauth-buttons";
import { GoogleLoginOnboarding } from "@/features/auth/components/google-login-onboarding";
import { useLogin } from "@/features/auth/hooks/use-login";

export function LoginForm() {
  const {
    lp,
    addToast,
    view,
    onboarding,
    email,
    password,
    showPassword,
    rememberMe,
    loading,
    googleLoading,
    fieldErrors,
    unverifiedOpen,
    unverifiedEmail,
    resendLoading,
    setEmail,
    setPassword,
    setShowPassword,
    setRememberMe,
    setFieldErrors,
    setUnverifiedOpen,
    handleSignIn,
    handleGoogleSuccess,
    handleOnboardingCancel,
    handleResendVerification,
  } = useLogin();

  const inputBase =
    "auth-input-glow w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500";

  const inputError = "border-red-300 focus:border-red-400 focus:ring-red-100";

  if (view === "onboarding" && onboarding) {
    return (
      <GoogleLoginOnboarding
        credential={onboarding.credential}
        claims={onboarding.claims}
        onCancel={handleOnboardingCancel}
      />
    );
  }

  return (
    <>
    <ConfirmDialog
      open={unverifiedOpen}
      title={lp.unverifiedDialogTitle}
      message={
        unverifiedEmail
          ? lp.unverifiedDialogMessage.replace("{{email}}", unverifiedEmail)
          : lp.unverifiedDialogMessage.replace("{{email}}", "—")
      }
      confirmLabel={lp.unverifiedResend}
      cancelLabel={lp.unverifiedClose}
      variant="primary"
      loading={resendLoading}
      onConfirm={handleResendVerification}
      onCancel={() => {
        if (resendLoading) return;
        setUnverifiedOpen(false);
      }}
    />
    <motion.div
      className="w-full max-w-sm mx-auto"
      variants={formContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.h2
        variants={headingContainer}
        className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight"
      >
        {lp.welcome.split(" ").map((word, i) => (
          <motion.span key={i} variants={headingWord} className="inline-block mr-[0.28em] last:mr-0">
            {word}
          </motion.span>
        ))}
      </motion.h2>

      <motion.p
        className="text-sm text-gray-500 dark:text-gray-400 mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.55, ease: "easeOut" }}
      >
        {lp.subtitle}
      </motion.p>

      <form onSubmit={handleSignIn} className="space-y-4" noValidate>
        <motion.div variants={formRow}>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
            {lp.emailLabel}
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
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder={lp.emailPlaceholder}
              className={`${inputBase} ${fieldErrors.email ? inputError : ""}`}
              autoComplete="email"
            />
          </div>
          {fieldErrors.email && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
          )}
        </motion.div>

        <motion.div variants={formRow}>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{lp.passwordLabel}</label>
            <Link
              href="/forgot-password"
              className="auth-link-underline text-xs text-primary font-medium"
            >
              {lp.forgotPassword}
            </Link>
          </div>
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
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="••••••••"
              className={`${inputBase} pr-10 ${fieldErrors.password ? inputError : ""}`}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="auth-eye-btn absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
          )}
        </motion.div>

        <motion.div variants={formRow} className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setRememberMe((v) => !v)}
            className={`auth-checkbox w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              rememberMe ? "border-primary bg-primary" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
            }`}
          >
            {rememberMe && (
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
          <span className="text-sm text-gray-600 dark:text-gray-400">{lp.rememberMe}</span>
        </motion.div>

        <motion.div variants={formRow}>
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full relative overflow-hidden flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors"
            whileHover="hover"
            whileTap={{ scale: 0.98 }}
          >
            {/* Shimmer sweep on hover */}
            {!loading && (
              <motion.span
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none"
                initial={{ x: "-100%" }}
                variants={{ hover: { x: "250%", transition: { duration: 0.55, ease: "easeInOut" } } }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {lp.signIn} <ArrowRight size={15} />
                </>
              )}
            </span>
          </motion.button>
        </motion.div>
      </form>

      <motion.div variants={formRow} className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400 dark:text-gray-500">{lp.orContinueWith}</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </motion.div>

      <motion.div variants={formRow}>
        <SocialOAuthRow
          googleLoading={googleLoading}
          googleMode="signin"
          onGoogleSuccess={handleGoogleSuccess}
          onGoogleError={() => addToast("error", lp.loginFailed)}
        />
      </motion.div>

      <motion.p variants={formRow} className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        {lp.noAccount}{" "}
        <Link href="/register" className="auth-link-glow font-semibold">
          {lp.signUpFree}
        </Link>
      </motion.p>

      <motion.p
        variants={formRow}
        className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-3 leading-relaxed"
      >
        {lp.legal}{" "}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
          {lp.terms}
        </a>
        {" "}&amp;{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
          {lp.privacyPolicy}
        </a>
      </motion.p>
    </motion.div>
    </>
  );
}
