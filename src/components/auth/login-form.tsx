"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import type { AxiosError } from "axios";
import { login, resendVerification } from "@/lib/api/auth";
import { isDisabledAccountLoginError, isUnverifiedLoginError } from "@/lib/login-errors";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  setAuth,
  setAuthTokens,
  setUserRole,
  extractRole,
  getRoleRedirect,
  clearAuth,
} from "@/lib/auth";
import type { ApiErrorResponse } from "@/types/auth";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import { useUser } from "@/context/user-context";
import { setCachedUserProfile } from "@/lib/user-profile-cache";
import { resolveAvatarUrl } from "@/lib/user-display";
import { SocialOAuthRow } from "@/components/auth/social-oauth-buttons";
import { GoogleLoginOnboarding } from "@/components/auth/google-login-onboarding";
import {
  verifyGoogleToken,
  completeGoogleLogin,
  finishGoogleAuth,
  parseGoogleClaims,
  type GoogleClaims,
} from "@/lib/google-oauth-flow";
import { markLoginWelcomeForRedirect } from "@/lib/login-welcome";

type LoginView = "login" | "onboarding";

interface OnboardingState {
  credential: string;
  claims: GoogleClaims;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const lp = t.loginPage;
  const { addToast } = useToast();
  const { refreshUser, clearUser } = useUser();

  useEffect(() => {
    if (searchParams.get("reset") !== "success") return;
    addToast("success", lp.passwordResetSuccess);
    const url = new URL(window.location.href);
    url.searchParams.delete("reset");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, [searchParams, addToast, lp.passwordResetSuccess]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const [googleLoading, setGoogleLoading] = useState(false);
  const [view, setView] = useState<LoginView>("login");
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);

  const [unverifiedOpen, setUnverifiedOpen] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  function parseLoginError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiErrorResponse>;
    const status = axiosErr.response?.status;

    if (isUnverifiedLoginError(err)) return lp.unverifiedEmail;
    if (isDisabledAccountLoginError(err)) return lp.accountDisabled;
    if (status === 401 || status === 400) return lp.invalidCredentials;
    if (status === 403) return lp.accountDisabled;
    return lp.loginFailed;
  }

  function showUnverifiedDialog(targetEmail: string) {
    setUnverifiedEmail(targetEmail.trim());
    setUnverifiedOpen(true);
  }

  async function handleResendVerification() {
    if (!unverifiedEmail || resendLoading) return;
    setResendLoading(true);
    try {
      await resendVerification(unverifiedEmail);
      addToast("success", t.verifyEmailPage.resendSuccess);
      setUnverifiedOpen(false);
      router.push(`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`);
    } catch {
      addToast("error", t.verifyEmailPage.resendFailed);
    } finally {
      setResendLoading(false);
    }
  }

  async function handleSuccess(
    data: unknown,
    role: string | null,
    profileHint?: { fullName: string; email: string; avatarUrl?: string | null }
  ) {
    const d = data as Record<string, unknown>;
    const src = (typeof d.data === "object" && d.data ? d.data : d) as Record<string, unknown>;
    const accessToken = (src.accessToken ?? src.access_token ?? src.token) as string | undefined;
    const refreshToken = (src.refreshToken ?? src.refresh_token) as string | undefined;
    if (accessToken) setAuthTokens(accessToken, refreshToken);
    setAuth();
    setUserRole(role ?? "");

    const profile = await refreshUser();

    if (profileHint) {
      setCachedUserProfile({
        ...profileHint,
        avatarUrl: resolveAvatarUrl(profile) ?? profileHint.avatarUrl ?? null,
      });
    }

    const redirect = getRoleRedirect(role);
    markLoginWelcomeForRedirect(redirect);
    router.push(redirect);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = lp.emailRequired;
    if (!password) errs.password = lp.passwordRequired;
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const data = await login({ email: email.trim(), password });
      const role = extractRole(data);
      await handleSuccess(data, role, {
        fullName: email.trim().split("@")[0],
        email: email.trim(),
      });
    } catch (err) {
      if (isUnverifiedLoginError(err)) {
        showUnverifiedDialog(email);
      } else {
        addToast("error", parseLoginError(err));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credential: string | undefined) {
    if (!credential) {
      addToast("error", lp.loginFailed);
      return;
    }

    setGoogleLoading(true);
    const claims = parseGoogleClaims(credential);

    try {
      const verify = await verifyGoogleToken(credential);

      if (verify.linkedToLocalAccount) {
        addToast("error", lp.useEmailPassword);
        return;
      }

      if (!verify.isNewUser) {
        const { role } = await completeGoogleLogin(credential);
        markLoginWelcomeForRedirect(getRoleRedirect(role));
        await finishGoogleAuth(router, refreshUser, claims, credential, role);
        return;
      }

      setOnboarding({ credential, claims });
      setView("onboarding");
    } catch (err) {
      if (isUnverifiedLoginError(err)) {
        showUnverifiedDialog(claims.email ?? email);
      } else {
        addToast("error", parseLoginError(err));
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleOnboardingCancel() {
    clearUser();
    clearAuth();
    setOnboarding(null);
    setView("login");
  }

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
              className="text-xs text-primary font-medium hover:underline"
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
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
        <Link href="/register" className="text-primary font-semibold hover:underline">
          {lp.signUpFree}
        </Link>
      </motion.p>

      <motion.p
        variants={formRow}
        className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-3 leading-relaxed"
      >
        {lp.legal}{" "}
        <button type="button" className="underline hover:text-gray-600 dark:hover:text-gray-300">
          {lp.terms}
        </button>
        {" "}&amp;{" "}
        <button type="button" className="underline hover:text-gray-600 dark:hover:text-gray-300">
          {lp.privacyPolicy}
        </button>
      </motion.p>
    </motion.div>
    </>
  );
}
