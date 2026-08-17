import type { CoachJob } from "@/features/candidate/services/coach.service";

export const COACH_JOB_LS_KEY = "cand_coach_job";
export const COACH_JOB_EVENT = "cand:coach-job-updated";

export type CoachJobEntry = {
  id: string;
  purpose?: string;
  status: string;
  questionSetId?: string | null;
  errorMessage?: string | null;
};

export function readCoachJobEntry(): CoachJobEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COACH_JOB_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CoachJobEntry;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCoachJobEntry(entry: CoachJobEntry | null) {
  if (typeof window === "undefined") return;
  if (!entry) localStorage.removeItem(COACH_JOB_LS_KEY);
  else localStorage.setItem(COACH_JOB_LS_KEY, JSON.stringify(entry));
  window.dispatchEvent(new CustomEvent(COACH_JOB_EVENT));
}

export function registerCoachJob(job: CoachJob) {
  writeCoachJobEntry({
    id: job.id,
    purpose: job.purpose,
    status: job.status,
    questionSetId: job.questionSetId ?? null,
    errorMessage: job.errorMessage ?? null,
  });
}

export function clearCoachJob() {
  writeCoachJobEntry(null);
}
