"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { forgotPassword } from "@/features/auth/services/auth.service";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { BrandLogo } from "@/shared/components/common/brand-logo";

const COOLDOWN = 60;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const fp = t.forgotPasswordPage;
  const { addToast } = useToast();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError("");
    if (!email.trim()) {
      setFieldError(fp.emailRequired);
      return;
    }
    if (!isValidEmail(email)) {
      setFieldError(fp.emailInvalid);
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
      setCooldown(COOLDOWN);
    } catch {
      addToast("error", fp.sendFailed);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setCooldown(COOLDOWN);
    } catch {
      addToast("error", fp.sendFailed);
    } finally {
      setLoading(false);
    }
  }

  const inputBase =
    "w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-gray-400 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500";
  const inputErrorCls =
    "border-red-300 focus:border-red-400 focus:ring-red-100";

  return (
    <div className="relative flex min-h-screen flex-col bg-white dark:bg-gray-950">
      <div className="absolute top-6 right-8 z-10 animate-fade-in">
        <BrandLogo
          className="justify-end"
          logoClassName="w-10 h-10"
          titleClassName="text-[16px]"
          subtitleClassName="text-[11px]"
        />
      </div>

      <div className="flex flex-1 items-center justify-center px-8 py-16">
        <div className="w-full max-w-sm mx-auto animate-fade-up">
        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{fp.successTitle}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{fp.successSubtitle}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{fp.successEmailHint}</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-6 break-all">{email}</p>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline mb-8 transition-opacity"
            >
              {loading && (
                <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              )}
              {cooldown > 0
                ? fp.resendCooldown.replace("{{seconds}}", String(cooldown))
                : fp.resendButton}
            </button>

            <div>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <ArrowLeft size={14} />
                {fp.backToLogin}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                <Mail size={24} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">{fp.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{fp.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                  {fp.emailLabel}
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
                      if (fieldError) setFieldError("");
                    }}
                    placeholder={fp.emailPlaceholder}
                    className={`${inputBase} ${fieldError ? inputErrorCls : ""}`}
                    autoComplete="email"
                    required
                  />
                </div>
                {fieldError && (
                  <p className="text-xs text-red-500 mt-1">{fieldError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  fp.submitButton
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <ArrowLeft size={14} />
                {fp.backToLogin}
              </Link>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
