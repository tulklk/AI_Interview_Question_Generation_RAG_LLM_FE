"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { verifyEmail, resendVerification } from "@/lib/api/auth";
import type { AxiosError } from "axios";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import { AuthPageToolbar } from "@/components/auth/auth-page-toolbar";

const COOLDOWN = 60;

type VerifyStatus = "loading" | "success" | "error";
type ErrorType = "expired" | "invalid" | "generic";

// ─── Token verification view ──────────────────────────────────────────────────

function VerifyTokenView({ token }: { token: string }) {
  const { t } = useLanguage();
  const vp = t.verifyEmailPage;
  const router = useRouter();
  const { addToast } = useToast();

  const [status, setStatus] = useState<VerifyStatus>("loading");
  const [errorType, setErrorType] = useState<ErrorType>("generic");
  const [errorMsg, setErrorMsg] = useState("");

  // Resend section state (shown when token expired)
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    verifyEmail(token)
      .then(() => {
        setStatus("success");
      })
      .catch((err: AxiosError<{ message?: string }>) => {
        setStatus("error");
        const httpStatus = err.response?.status;
        const msg = (err.response?.data?.message ?? "").toLowerCase();

        if (httpStatus === 400 && msg.includes("expir")) {
          setErrorType("expired");
          setErrorMsg(vp.tokenExpired);
        } else if (
          httpStatus === 400 &&
          (msg.includes("invalid") || msg.includes("used") || msg.includes("not found"))
        ) {
          setErrorType("invalid");
          setErrorMsg(vp.tokenInvalid);
        } else if (httpStatus === 404) {
          setErrorType("invalid");
          setErrorMsg(vp.tokenInvalid);
        } else {
          setErrorType("generic");
          setErrorMsg(err.response?.data?.message ?? vp.tokenInvalid);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-redirect on success
  useEffect(() => {
    if (status !== "success") return;
    const id = setTimeout(() => router.push("/login"), 3000);
    return () => clearTimeout(id);
  }, [status, router]);

  // Resend cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail.trim() || cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      await resendVerification(resendEmail.trim());
      setCooldown(COOLDOWN);
      addToast("success", vp.resendSuccess);
    } catch {
      addToast("error", vp.resendFailed);
    } finally {
      setResendLoading(false);
    }
  }

  // Loading
  if (status === "loading") {
    return (
      <div className="w-full max-w-sm mx-auto text-center animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <span className="w-7 h-7 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{vp.verifyingTitle}</h2>
        <p className="text-sm text-gray-500">{vp.verifyingSubtitle}</p>
      </div>
    );
  }

  // Success
  if (status === "success") {
    return (
      <div className="w-full max-w-sm mx-auto text-center animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{vp.successTitle}</h2>
        <p className="text-sm text-gray-500 mb-8">{vp.successSubtitle}</p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold text-sm py-3 px-6 rounded-lg transition-colors"
        >
          {vp.goToLogin}
        </Link>
      </div>
    );
  }

  // Error
  return (
    <div className="w-full max-w-sm mx-auto text-center animate-fade-up">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
        <AlertCircle size={28} className="text-red-500" />
      </div>
      <p className="text-sm text-gray-600 mb-6">{errorMsg}</p>

      {errorType === "expired" ? (
        <form onSubmit={handleResend} className="text-left space-y-3 mb-6" noValidate>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              {vp.resendEmailLabel}
            </label>
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder={vp.resendEmailPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-gray-400"
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            disabled={!resendEmail.trim() || cooldown > 0 || resendLoading}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors"
          >
            {resendLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : cooldown > 0 ? (
              vp.resendCooldown.replace("{{seconds}}", String(cooldown))
            ) : (
              vp.resendButton
            )}
          </button>
        </form>
      ) : null}

      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        {vp.backToLogin}
      </Link>
    </div>
  );
}

// ─── Waiting view (existing behavior when ?email=xxx) ─────────────────────────

function WaitingView({ email }: { email: string }) {
  const { t } = useLanguage();
  const vp = t.verifyEmailPage;
  const { addToast } = useToast();

  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  async function handleResend() {
    if (!email || resendLoading) return;
    setResendLoading(true);
    try {
      await resendVerification(email);
      setResendDone(true);
      addToast("success", vp.resendSuccess);
    } catch {
      addToast("error", vp.resendFailed);
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto animate-fade-up text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <Mail size={28} className="text-primary" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">{vp.title}</h2>
      <p className="text-sm text-gray-500 mb-1">{vp.subtitle}</p>
      {email && (
        <p className="text-sm font-semibold text-gray-800 mb-6 break-all">{email}</p>
      )}

      <p className="text-xs text-gray-400 mb-8">{vp.checkSpam}</p>

      <button
        type="button"
        onClick={handleResend}
        disabled={resendLoading || resendDone}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-lg transition-colors mb-4"
      >
        {resendLoading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          vp.resendButton
        )}
      </button>

      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        {vp.backToLogin}
      </Link>
    </div>
  );
}

// ─── Root content (dispatches to the right view) ─────────────────────────────

function VerifyEmailContent() {
  const { t } = useLanguage();
  const vp = t.verifyEmailPage;
  const { addToast } = useToast();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  useEffect(() => {
    if (!token && !email) {
      addToast("error", vp.missingToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (token) return <VerifyTokenView token={token} />;
  if (email) return <WaitingView email={email} />;

  // Neither token nor email — show minimal fallback with back link
  return (
    <div className="w-full max-w-sm mx-auto text-center animate-fade-up">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
        <AlertCircle size={28} className="text-red-500" />
      </div>
      <p className="text-sm text-gray-600 mb-6">{vp.missingToken}</p>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        {vp.backToLogin}
      </Link>
    </div>
  );
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
