"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import type { AxiosError } from "axios";
import { resetPassword } from "@/lib/api/auth";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";

function isTokenError(status: number | undefined, msg: string): boolean {
  const lower = msg.toLowerCase();
  if (status === 404) return true;
  if (status === 400) {
    return (
      lower.includes("expir") ||
      lower.includes("invalid") ||
      lower.includes("used") ||
      lower.includes("not found") ||
      lower.includes("token")
    );
  }
  return false;
}

export function ResetPasswordContent() {
  const { t } = useLanguage();
  const rp = t.resetPasswordPage;
  const router = useRouter();
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState(!token);
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  function validate(): boolean {
    const errors: { newPassword?: string; confirmPassword?: string } = {};
    if (newPassword.length < 8) errors.newPassword = rp.passwordTooShort;
    if (confirmPassword !== newPassword) errors.confirmPassword = rp.passwordMismatch;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    if (!token) {
      setTokenError(true);
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword({ token, newPassword, confirmPassword });
      router.push("/login?reset=success");
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const status = axiosErr.response?.status;
      const msg = axiosErr.response?.data?.message ?? "";

      if (isTokenError(status, msg)) {
        setTokenError(true);
      } else {
        addToast("error", rp.resetFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputBase =
    "w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-gray-400";
  const inputErrorCls =
    "border-red-300 focus:border-red-400 focus:ring-red-100";

  if (tokenError) {
    return (
      <div className="w-full max-w-sm mx-auto animate-fade-up text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <p className="text-sm text-gray-600 mb-6">{rp.tokenError}</p>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold text-sm py-3 px-6 rounded-lg transition-colors mb-4"
        >
          {rp.requestNewLink}
        </Link>
        <div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={14} />
            {rp.backToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-up">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <KeyRound size={24} className="text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{rp.title}</h2>
      <p className="text-sm text-gray-500 mb-7">{rp.subtitle}</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            {rp.newPasswordLabel}
          </label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword)
                  setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
              }}
              placeholder={rp.newPasswordPlaceholder}
              className={`${inputBase} pr-10 ${fieldErrors.newPassword ? inputErrorCls : ""}`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {fieldErrors.newPassword && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.newPassword}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            {rp.confirmPasswordLabel}
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
                if (fieldErrors.confirmPassword)
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              placeholder={rp.confirmPasswordPlaceholder}
              className={`${inputBase} pr-10 ${
                fieldErrors.confirmPassword
                  ? inputErrorCls
                  : confirmPassword && confirmPassword === newPassword
                  ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"
                  : ""
              }`}
              autoComplete="new-password"
            />
            {confirmPassword && confirmPassword === newPassword ? (
              <CheckCircle2
                size={15}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            )}
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !newPassword || !confirmPassword || !token}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            rp.submitButton
          )}
        </button>
      </form>

      <div className="text-center mt-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} />
          {rp.backToLogin}
        </Link>
      </div>
    </div>
  );
}
