import type { CurrentUser } from "@/types/user";

export type GoogleOnboardingRole = "HR_MANAGER" | "JOB_SEEKER";

export type HrProfileField = "companyName" | "jobTitle";
export type CandidateProfileField = "targetRole" | "seniorityLevel" | "techStack";

export function normalizeRole(role: string | null | undefined): GoogleOnboardingRole | null {
  const r = (role ?? "").toUpperCase();
  if (r.includes("HR")) return "HR_MANAGER";
  if (r.includes("JOB") || r.includes("CANDIDATE") || r.includes("SEEKER")) return "JOB_SEEKER";
  return null;
}

export function isHrProfileComplete(user: CurrentUser): boolean {
  const hp = user.hrProfile;
  return Boolean(hp?.companyName?.trim() && hp?.jobTitle?.trim());
}

export function isCandidateProfileComplete(user: CurrentUser): boolean {
  const cp = user.candidateProfile;
  return Boolean(
    cp?.targetRole?.trim() &&
      cp?.seniorityLevel?.trim() &&
      (cp?.techStack?.length ?? 0) > 0
  );
}

export function isProfileCompleteForRole(
  user: CurrentUser,
  role: GoogleOnboardingRole
): boolean {
  return role === "HR_MANAGER"
    ? isHrProfileComplete(user)
    : isCandidateProfileComplete(user);
}

export function isProfileComplete(user: CurrentUser): boolean {
  const role = normalizeRole(user.role);
  if (!role) return false;
  return isProfileCompleteForRole(user, role);
}

function hasHrProfileData(user: CurrentUser): boolean {
  const hp = user.hrProfile;
  return Boolean(hp?.companyName?.trim() || hp?.jobTitle?.trim());
}

function hasCandidateProfileData(user: CurrentUser): boolean {
  const cp = user.candidateProfile;
  return Boolean(
    cp?.targetRole?.trim() ||
      cp?.seniorityLevel?.trim() ||
      (cp?.techStack?.length ?? 0) > 0
  );
}

/** True when role is unknown or both role-specific profiles are empty. */
export function needsRoleSelection(user: CurrentUser): boolean {
  const role = normalizeRole(user.role);
  if (!role) return true;
  if (hasHrProfileData(user) || hasCandidateProfileData(user)) return false;
  return !isProfileCompleteForRole(user, role);
}

export function needsProfileCompletion(
  user: CurrentUser,
  role: GoogleOnboardingRole
): boolean {
  return !isProfileCompleteForRole(user, role);
}

export function getMissingHrFields(user: CurrentUser): HrProfileField[] {
  const hp = user.hrProfile;
  const missing: HrProfileField[] = [];
  if (!hp?.companyName?.trim()) missing.push("companyName");
  if (!hp?.jobTitle?.trim()) missing.push("jobTitle");
  return missing;
}

export function getMissingCandidateFields(user: CurrentUser): CandidateProfileField[] {
  const cp = user.candidateProfile;
  const missing: CandidateProfileField[] = [];
  if (!cp?.targetRole?.trim()) missing.push("targetRole");
  if (!cp?.seniorityLevel?.trim()) missing.push("seniorityLevel");
  if ((cp?.techStack?.length ?? 0) === 0) missing.push("techStack");
  return missing;
}

export function getMissingFields(
  user: CurrentUser,
  role: GoogleOnboardingRole
): HrProfileField[] | CandidateProfileField[] {
  return role === "HR_MANAGER"
    ? getMissingHrFields(user)
    : getMissingCandidateFields(user);
}

export type GoogleOnboardingStep = "role-select" | "hr-profile" | "js-profile";

export function resolveOnboardingStep(user: CurrentUser): GoogleOnboardingStep {
  if (needsRoleSelection(user)) return "role-select";
  const role = normalizeRole(user.role) ?? "HR_MANAGER";
  return role === "HR_MANAGER" ? "hr-profile" : "js-profile";
}
