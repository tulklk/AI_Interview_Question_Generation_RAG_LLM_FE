"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { verifyEmail, resendVerification } from "@/features/auth/services/auth.service";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { AuthPageToolbar } from "@/features/auth/components/auth-page-toolbar";
import { cn } from "@/lib/cn";

const COOLDOWN = 60;
const OTP_LENGTH = 6;

// ─── OTP verify view ──────────────────────────────────────────────────────────

function OtpVerifyView({ email }: { email: string }) {
  const { t } = useLanguage();
  const vp = t.verifyEmailPage;
  const router = useRouter();
  const { addToast } = useToast();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-redirect on success
  useEffect(() => {
    if (!success) return;
    const id = setTimeout(() => router.push("/login"), 3000);
    return () => clearTimeout(id);
  }, [success, router]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function handleDigitChange(index: number, value: string) {
    // Handle paste — fill multiple boxes at once
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
      const next = Array(OTP_LENGTH).fill("");
      for (let i = 0; i < cleaned.length; i++) next[i] = cleaned[i];
      setDigits(next);
      const focusIdx = Math.min(cleaned.length, OTP_LENGTH - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setSubmitError(null);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await verifyEmail(email, otp);
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string; errors?: string[] } } };
      const data = e.response?.data;
      const msg =
        Array.isArray(data?.errors) && data.errors.length > 0
          ? data.errors.join(" ")
          : (data?.message ?? vp.otpError);
      setSubmitError(msg);
      // Clear boxes on error so user can re-enter
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      await resendVerification(email);
      setCooldown(COOLDOWN);
      addToast("success", vp.resendSuccess);
    } catch {
      addToast("error", vp.resendFailed);
    } finally {
      setResendLoading(false);
    }
  }

  // Success state
  if (success) {
    return (
      <div className="w-full max-w-sm mx-auto text-center animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {vp.successTitle}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{vp.successSubtitle}</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold text-sm py-3 px-6 rounded-lg transition-colors"
        >
          {vp.goToLogin}
        </Link>
      </div>
    );
  }

  const otpComplete = digits.every(Boolean);

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-up">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <Mail size={28} className="text-primary" />
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{vp.title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{vp.subtitle}</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-all">{email}</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        {/* OTP boxes */}
        <div className="flex items-center justify-center gap-2.5 mb-5">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              disabled={submitting}
              autoFocus={i === 0}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              className={cn(
                "w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors",
                "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
                submitError
                  ? "border-red-400 dark:border-red-600 focus:ring-red-200 dark:focus:ring-red-900"
                  : digit
                  ? "border-primary focus:ring-primary/20"
                  : "border-gray-200 dark:border-gray-700 focus:ring-primary/20 focus:border-primary"
              )}
            />
          ))}
        </div>

        {/* Inline error */}
        {submitError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 px-3 py-2.5 mb-4">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-600 dark:text-red-400">{submitError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!otpComplete || submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors mb-4"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {vp.submitting}
            </>
          ) : (
            vp.submitButton
          )}
        </button>
      </form>

      {/* Resend */}
      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={cooldown > 0 || resendLoading}
        className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover disabled:text-primary/40 disabled:cursor-not-allowed transition-colors mb-6"
      >
        {resendLoading && <Loader2 size={14} className="animate-spin" />}
        {cooldown > 0
          ? vp.resendCooldown.replace("{{seconds}}", String(cooldown))
          : vp.resendButton}
      </button>

      {/* Back to login */}
      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={14} />
          {vp.backToLogin}
        </Link>
      </div>
    </div>
  );
}

// ─── Fallback when no email in URL ────────────────────────────────────────────

function MissingEmailView() {
  const { t } = useLanguage();
  const vp = t.verifyEmailPage;
  return (
    <div className="w-full max-w-sm mx-auto text-center animate-fade-up">
      <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-6">
        <AlertCircle size={28} className="text-red-500" />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{vp.missingEmail}</p>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ArrowLeft size={14} />
        {vp.backToLogin}
      </Link>
    </div>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  if (!email) return <MissingEmailView />;
  return <OtpVerifyView email={email} />;
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function VerifyEmailPage() {
  return (
    <div className="relative flex h-screen items-center justify-center bg-white dark:bg-gray-950 px-8">
      <div className="absolute top-6 right-8 z-10">
        <AuthPageToolbar />
      </div>
      <Suspense>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
