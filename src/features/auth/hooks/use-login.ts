"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AxiosError } from "axios";
import { login, resendVerification } from "@/features/auth/services/auth.service";
import {
  isDisabledAccountLoginError,
  isUnverifiedLoginError,
} from "@/features/auth/utils/login-errors";
import {
  setAuth,
  setAuthTokens,
  setUserRole,
  extractRole,
  getRoleRedirect,
  clearAuth,
} from "@/core/auth/permissions";
import type { ApiErrorResponse } from "@/features/auth/types/auth";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { useUser } from "@/features/auth/context/user-context";
import { setCachedUserProfile } from "@/core/storage/user-profile-cache";
import { resolveAvatarUrl } from "@/shared/utils/user-display";
import {
  verifyGoogleToken,
  completeGoogleLogin,
  finishGoogleAuth,
  parseGoogleClaims,
  type GoogleClaims,
} from "@/features/auth/utils/google-oauth-flow";
import { markLoginWelcomeForRedirect } from "@/features/auth/utils/login-welcome";

export type LoginView = "login" | "onboarding";

export interface OnboardingState {
  credential: string;
  claims: GoogleClaims;
}

interface LoginFieldErrors {
  email?: string;
  password?: string;
}

/**
 * Encapsulates all login/Google-OAuth business logic so the form component only
 * renders UI. Flow: useLogin -> auth.service -> http-client -> token.service.
 */
export function useLogin() {
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
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

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

    const errs: LoginFieldErrors = {};
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

  return {
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
  };
}
