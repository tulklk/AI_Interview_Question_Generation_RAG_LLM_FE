"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import type { AxiosError } from "axios";
import { login, loginWithGoogle } from "@/lib/api/auth";
import {
  setAuth,
  setAuthTokens,
  setUserRole,
  extractRole,
  getRoleRedirect,
} from "@/lib/auth";
import type { ApiErrorResponse } from "@/types/auth";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import { useUser } from "@/context/user-context";
import { setCachedUserProfile } from "@/lib/user-profile-cache";
import { parseGoogleIdToken } from "@/lib/google-id-token";
import { syncGoogleAvatarIfNeeded } from "@/lib/sync-google-avatar";
import { resolveAvatarUrl } from "@/lib/user-display";

export function LoginForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const lp = t.loginPage;
  const { addToast } = useToast();
  const { refreshUser } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const [googleLoading, setGoogleLoading] = useState(false);
  const googleRole: "HR_MANAGER" | "JOB_SEEKER" = "HR_MANAGER";

  function parseLoginError(err: unknown): string {
    const axiosErr = err as AxiosError<ApiErrorResponse>;
    const status = axiosErr.response?.status;
    const msg = (axiosErr.response?.data?.message ?? "").toLowerCase();

    if (status === 401 || status === 400) return lp.invalidCredentials;
    if (status === 403 && msg.includes("verif")) return lp.unverifiedEmail;
    if (status === 403) return lp.accountDisabled;
    if (status === 423 || msg.includes("lock") || msg.includes("disabled")) return lp.accountDisabled;
    return lp.loginFailed;
  }

  async function handleSuccess(
    data: unknown,
    role: string | null,
    profileHint?: { fullName: string; email: string; avatarUrl?: string | null },
    options?: { googleIdToken?: string }
  ) {
    const d = data as Record<string, unknown>;
    const src = (typeof d.data === "object" && d.data ? d.data : d) as Record<string, unknown>;
    const accessToken = (src.accessToken ?? src.access_token ?? src.token) as string | undefined;
    const refreshToken = (src.refreshToken ?? src.refresh_token) as string | undefined;
    if (accessToken) setAuthTokens(accessToken, refreshToken);
    setAuth();
    setUserRole(role ?? "");

    let profile = await refreshUser();
    if (options?.googleIdToken) {
      try {
        await syncGoogleAvatarIfNeeded(options.googleIdToken, profile, role);
        profile = await refreshUser();
      } catch {
        // Avatar sync is best-effort; login should still succeed.
      }
    }

    if (profileHint) {
      setCachedUserProfile({
        ...profileHint,
        avatarUrl: resolveAvatarUrl(profile) ?? profileHint.avatarUrl ?? null,
      });
    }

    router.push(getRoleRedirect(role));
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
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      const status = axiosErr.response?.status;
      const beMsg = (axiosErr.response?.data?.message ?? "").toLowerCase();
      if (status === 403 && beMsg.includes("verif")) {
        addToast("error", lp.unverifiedEmail, {
          label: "Resend verification",
          href: `/verify-email?email=${encodeURIComponent(email.trim())}`,
        });
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
    try {
      const data = await loginWithGoogle({ idToken: credential, intendedRole: googleRole });
      const role = extractRole(data);
      const claims = parseGoogleIdToken(credential);
      const googleEmail = claims.email ?? "";
      const googleName = claims.name ?? googleEmail.split("@")[0] ?? "";
      await handleSuccess(
        data,
        role,
        {
          fullName: googleName,
          email: googleEmail,
          avatarUrl: claims.picture?.trim() || null,
        },
        { googleIdToken: credential }
      );
    } catch (err) {
      addToast("error", parseLoginError(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  const inputBase =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-gray-400";

  const inputError = "border-red-300 focus:border-red-400 focus:ring-red-100";

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-up">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{lp.welcome}</h2>
      <p className="text-sm text-gray-500 mb-7">{lp.subtitle}</p>

      <form onSubmit={handleSignIn} className="space-y-4" noValidate>
        {/* Email */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
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
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-gray-700">{lp.passwordLabel}</label>
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
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setRememberMe((v) => !v)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              rememberMe ? "border-primary bg-primary" : "border-gray-300 bg-white"
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
          <span className="text-sm text-gray-600">{lp.rememberMe}</span>
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
              {lp.signIn} <ArrowRight size={15} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">{lp.orContinueWith}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Google login button */}
      <div className="relative">
        {googleLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg z-10">
            <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        <GoogleLogin
          onSuccess={(credentialResponse) =>
            handleGoogleSuccess(credentialResponse.credential)
          }
          onError={() => addToast("error", lp.loginFailed)}
          useOneTap={false}
          text="signin_with"
          width="100%"
        />
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-gray-500 mt-6">
        {lp.noAccount}{" "}
        <Link href="/register" className="text-primary font-semibold hover:underline">
          {lp.signUpFree}
        </Link>
      </p>

      {/* Legal */}
      <p className="text-center text-[11px] text-gray-400 mt-3 leading-relaxed">
        {lp.legal}{" "}
        <button type="button" className="underline hover:text-gray-600">
          {lp.terms}
        </button>
        {" "}&amp;{" "}
        <button type="button" className="underline hover:text-gray-600">
          {lp.privacyPolicy}
        </button>
      </p>
    </div>
  );
}
