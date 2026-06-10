const LOGIN_WELCOME_KEY = "interviewai_login_welcome";

export type LoginWelcomeRole = "jobseeker" | "admin";

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

export function getLoginWelcomeRoleFromRedirect(path: string): LoginWelcomeRole | null {
  const normalized = normalizePath(path);
  if (normalized === "/jobseeker") return "jobseeker";
  if (normalized === "/admin/dashboard" || normalized.startsWith("/admin/")) {
    return "admin";
  }
  return null;
}

export function markLoginWelcomePending(role: LoginWelcomeRole): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LOGIN_WELCOME_KEY, role);
}

export function markLoginWelcomeForRedirect(redirect: string): void {
  const role = getLoginWelcomeRoleFromRedirect(redirect);
  if (role) markLoginWelcomePending(role);
}

export function hasLoginWelcomePending(role: LoginWelcomeRole): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(LOGIN_WELCOME_KEY) === role;
}

export function clearLoginWelcomePending(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(LOGIN_WELCOME_KEY);
}

/** @deprecated Use markLoginWelcomeForRedirect */
export function markJobseekerLoginWelcomePending(): void {
  markLoginWelcomePending("jobseeker");
}

/** @deprecated Use hasLoginWelcomePending("jobseeker") */
export function hasJobseekerLoginWelcomePending(): boolean {
  return hasLoginWelcomePending("jobseeker");
}

/** @deprecated Use clearLoginWelcomePending */
export function clearJobseekerLoginWelcomePending(): void {
  clearLoginWelcomePending();
}

/** @deprecated Use getLoginWelcomeRoleFromRedirect */
export function isJobseekerHomeRedirect(path: string): boolean {
  return getLoginWelcomeRoleFromRedirect(path) === "jobseeker";
}
