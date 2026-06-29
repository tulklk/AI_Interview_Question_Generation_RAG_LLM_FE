"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AxiosError } from "axios";
import { registerHr } from "@/features/auth/services/auth.service";
import { searchCompanies } from "@/features/hr/services/company.service";
import type { CompanyOption } from "@/features/hr/services/company.service";
import type { ApiErrorResponse } from "@/features/auth/types/auth";
import {
  verifyGoogleToken,
  completeGoogleLogin,
  finishGoogleAuth,
  parseGoogleClaims,
} from "@/features/auth/utils/google-oauth-flow";
import { toBackendIntendedRole, type RegisterRoleKey } from "@/features/auth/utils/google-onboarding";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { useUser } from "@/features/auth/context/user-context";

export interface RegisterFieldErrors {
  companyName?: string;
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  jobTitle?: string;
}

/**
 * Business logic for the two-step HR registration (incl. Google signup). The
 * form component consumes this and only renders UI.
 */
export function useRegister(registerRole: RegisterRoleKey = "hr") {
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
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});

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
    const errors: RegisterFieldErrors = {};
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

    const errors: RegisterFieldErrors = {};
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
        setFieldErrors(data.errors as RegisterFieldErrors);
      } else {
        addToast("error", isGoogleSignup ? rp.profileCompleteFailed : rp.registrationFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  return {
    rp,
    addToast,
    stepDir,
    step,
    isGoogleSignup,
    googleLoading,
    fullName,
    email,
    password,
    confirmPassword,
    showPassword,
    showConfirm,
    jobTitle,
    companyName,
    companyId,
    companyResults,
    companyOpen,
    companyLoading,
    companySearched,
    agreed,
    loading,
    fieldErrors,
    companyRef,
    passwordStrength,
    strengthLabel,
    strengthColor,
    setFullName,
    setEmail,
    setPassword,
    setConfirmPassword,
    setShowPassword,
    setShowConfirm,
    setJobTitle,
    setCompanyOpen,
    setAgreed,
    setFieldErrors,
    handleCompanyChange,
    selectCompany,
    useTypedName,
    handleContinue,
    handleGoogle,
    handleBackFromStep2,
    handleSubmit,
  };
}
