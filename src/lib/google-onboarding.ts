export type GoogleOnboardingRole = "HR_MANAGER" | "JOB_SEEKER";

export type RegisterRoleKey = "hr" | "jobseeker";

export type GoogleOnboardingStep = "role-select" | "hr-profile" | "js-profile";

/** Matches DomainLayer.Constants.UserRole (JWT / oauth intendedRole). */
export const BACKEND_USER_ROLE = {
  HR: "HR",
  CANDIDATE: "Candidate",
} as const;

export function toBackendIntendedRole(
  role: GoogleOnboardingRole | RegisterRoleKey
): string {
  if (role === "hr" || role === "HR_MANAGER") {
    return BACKEND_USER_ROLE.HR;
  }
  return BACKEND_USER_ROLE.CANDIDATE;
}

export function normalizeRole(role: string | null | undefined): GoogleOnboardingRole | null {
  const r = (role ?? "").toUpperCase();
  if (r.includes("HR")) return "HR_MANAGER";
  if (r.includes("JOB") || r.includes("CANDIDATE") || r.includes("SEEKER")) return "JOB_SEEKER";
  return null;
}
