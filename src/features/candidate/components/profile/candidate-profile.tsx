"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Edit2,
  Save,
  X,
  Plus,
  Target,
  BookOpen,
  Trophy,
  TrendingUp,
  Flame,
  Mail,
  User,
  Phone,
  Link,
  Sparkles,
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  Eye,
  ChevronDown,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  getPracticeStats,
  listCompletedSessions,
  type PracticeStats,
  type CompletedSessionSummary,
} from "@/features/candidate/services/practice-session.service";
import { computeStreakDays } from "@/features/candidate/utils/practice-streak";
import { buildGamificationHeatmap } from "@/features/candidate/utils/dashboard-analytics";
import { PracticeHeatmap } from "@/features/candidate/components/dashboard/practice-heatmap";
import { useDailyActivity } from "@/features/gamification/hooks/use-daily-activity";
import { AchievementGrid } from "@/features/gamification/components/achievement-grid";
import { SkillBadge } from "@/features/candidate/components/profile/skill-badge";
import { SENIORITY_LEVELS } from "@/shared/constants/seniority-levels";
import { useLanguage } from "@/shared/providers/language-context";
import { useUser } from "@/features/auth/context/user-context";
import { useToast } from "@/shared/providers/toast-context";
import { getCurrentUser, updateCandidateProfile } from "@/features/auth/services/user.service";
import { AvatarUpload } from "@/shared/components/common/avatar-upload";
import { LinkedGoogleAccount } from "@/shared/components/common/linked-google-account";
import { uploadAvatarToCloudinary } from "@/shared/utils/cloudinary";
import { mapAvatarUploadError } from "@/shared/utils/avatar-upload-messages";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Toggle } from "@/shared/components/ui/toggle";
import { SectionCard, Field } from "@/features/candidate/components/ui/section-card";
import {
  getCv,
  uploadCv,
  deleteCv,
  CvValidationError,
  type CvInfo,
} from "@/features/candidate/services/candidate-cv.service";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { isValidUrl } from "@/shared/utils/url-validation";
import {
  portalCard,
  portalHeadingAlt,
  portalIconWell,
  portalInput,
  portalMutedBg,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";
import { GamificationProgressCard } from "@/features/gamification/components/gamification-progress-card";

const EARNED_BADGE_CLS = "bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-800/30";
const TARGET_ROLE_CLS = "bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-800/30";

const INPUT_CLASS = cn(
  "w-full text-[13px] rounded-lg px-3 py-2 outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(108,71,255,0.1)]",
  portalInput
);

const READONLY_CLASS = cn(
  "w-full text-[13px] rounded-lg px-3 py-2 cursor-not-allowed",
  portalSubtextAlt,
  portalIconWell,
  "border border-gray-200 dark:border-gray-700"
);

interface ProfileFormState {
  fullName: string;
  email: string;
  bio: string;
  targetRole: string;
  seniorityLevel: string;
  skills: string[];
  phoneNumber: string;
  linkedInUrl: string;
  githubUrl: string;
  avatarUrl: string;
}

const EMPTY_FORM: ProfileFormState = {
  fullName: "",
  email: "",
  bio: "",
  targetRole: "",
  seniorityLevel: "",
  skills: [],
  phoneNumber: "",
  linkedInUrl: "",
  githubUrl: "",
  avatarUrl: "",
};

function isImageCv(fileName: string | null | undefined): boolean {
  return /\.(jpe?g|png|gif|webp|bmp)$/i.test(fileName || "");
}

function isPdfCv(fileName: string | null | undefined): boolean {
  return /\.pdf$/i.test(fileName || "");
}

function formFromUser(user: Awaited<ReturnType<typeof getCurrentUser>>): ProfileFormState {
  const cp = user.candidateProfile;
  const avatar =
    typeof cp?.avatarUrl === "string"
      ? cp.avatarUrl
      : typeof user.avatarUrl === "string"
        ? user.avatarUrl
        : "";
  return {
    fullName: cp?.fullName || user.fullName,
    email: user.email,
    bio: cp?.bio ?? "",
    targetRole: cp?.targetRole ?? "",
    seniorityLevel: cp?.seniorityLevel ?? "",
    skills: cp?.techStack ?? [],
    phoneNumber: cp?.phoneNumber ?? "",
    linkedInUrl: cp?.linkedInUrl ?? "",
    githubUrl: cp?.githubUrl ?? "",
    avatarUrl: avatar,
  };
}

export function CandidateProfile() {
  const { t, lang } = useLanguage();
  const p = t.jobseekerProfilePage;
  const { refreshUser } = useUser();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [snapshot, setSnapshot] = useState<ProfileFormState>(EMPTY_FORM);
  const [skillInput, setSkillInput] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [linkedInTouched, setLinkedInTouched] = useState(false);
  const [githubTouched, setGithubTouched] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(false);

  const [cv, setCv] = useState<CvInfo | null>(null);
  const [cvLoading, setCvLoading] = useState(true);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvDeleting, setCvDeleting] = useState(false);
  const [cvDeleteConfirmOpen, setCvDeleteConfirmOpen] = useState(false);
  const [showCvInsights, setShowCvInsights] = useState(false);
  const [showAllCvSkills, setShowAllCvSkills] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [cvLightbox, setCvLightbox] = useState(false);
  const cvFileInputRef = useRef<HTMLInputElement>(null);
  const [cvDragOver, setCvDragOver] = useState(false);


  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [sessions, setSessions] = useState<CompletedSessionSummary[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!cvLightbox) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setCvLightbox(false);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cvLightbox]);

  useEffect(() => {
    let cancelled = false;
    getCv()
      .then((c) => { if (!cancelled) setCv(c); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCvLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // pageSize 200: đủ cho heatmap 52 tuần mà không phụ thuộc endpoint riêng.
    Promise.all([getPracticeStats(), listCompletedSessions({ pageSize: 200 })])
      .then(([statsRes, sessionsRes]) => {
        if (cancelled) return;
        setStats(statsRes);
        setSessions(sessionsRes.items);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function uploadCvFile(file: File) {
    if (!/\.(pdf|docx|jpe?g|png)$/i.test(file.name)) {
      addToast("error", p.cv.invalidFormat);
      return;
    }
    setCvUploading(true);
    uploadCv(file)
      .then(({ cv: next, analysisFailed }) => {
        setCv(next);
        // BE overwrites the profile's TechStack from the new CV analysis — mirror
        // that here so "Skills & Expertise" reflects it without a page reload.
        if (!analysisFailed && next.techStack.length > 0) {
          setForm((prev) => ({ ...prev, skills: next.techStack }));
          setSnapshot((prev) => ({ ...prev, skills: next.techStack }));
        }
        // A 200 with parsedAt set but no summary/skills means BE ran the parser
        // and found nothing (e.g. the file isn't actually a resume) — that's not
        // "analyzed successfully" and shouldn't be announced as such. The file
        // itself is still saved fine either way, so this stays a "success" toast
        // (matching the analysisFailed case below) — only the wording changes.
        const hasInsights = Boolean(next.summary) || next.skills.length > 0;
        const message = analysisFailed
          ? p.cv.uploadedAnalysisFailed
          : hasInsights
            ? p.cv.uploadSuccess
            : p.cv.uploadedNoSkills;
        addToast("success", message);
      })
      .catch((err) => {
        addToast("error", err instanceof CvValidationError && err.message ? err.message : p.cv.uploadFailed);
      })
      .finally(() => setCvUploading(false));
  }

  function handleCvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadCvFile(file);
  }

  function handleCvDrop(e: React.DragEvent) {
    e.preventDefault();
    setCvDragOver(false);
    if (cvUploading || cvDeleting) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    uploadCvFile(file);
  }

  function handleCvDelete() {
    setCvDeleting(true);
    deleteCv()
      .then(() => {
        setCv(null);
        // Clear CV-derived skills from both form and snapshot so the
        // "Kỹ năng chuyên môn" section empties along with the CV.
        setForm((prev) => ({ ...prev, skills: [] }));
        setSnapshot((prev) => ({ ...prev, skills: [] }));
        // Persist skill-clearing to the backend so a page refresh does not
        // bring the old skills back. Fire-and-forget — failure is silent
        // because local state is already cleared and the next explicit
        // profile save will also persist the empty techStack.
        void updateCandidateProfile({
          fullName: form.fullName.trim(),
          targetRole: form.targetRole.trim() || undefined,
          seniorityLevel: form.seniorityLevel || undefined,
          techStack: [],
          bio: form.bio.trim() || undefined,
          phoneNumber: form.phoneNumber.trim() || undefined,
          linkedInUrl: form.linkedInUrl.trim() || undefined,
          githubUrl: form.githubUrl.trim() || undefined,
          avatarUrl: form.avatarUrl.trim() || undefined,
        }).catch(() => {/* non-critical — local state already cleared */});
        addToast("success", p.cv.deleteSuccess);
      })
      .catch(() => addToast("error", p.cv.deleteFailed))
      .finally(() => {
        setCvDeleting(false);
        setCvDeleteConfirmOpen(false);
      });
  }

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      const next = formFromUser(user);
      setForm(next);
      setSnapshot(next);
      setGoogleLinked(Boolean(user.isGoogleLinked));
    } catch {
      addToast("error", p.saveFailed);
    } finally {
      setLoading(false);
    }
  }, [addToast, p.saveFailed]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const sessionCount = stats?.totalSessions ?? 0;
  const avgScore = stats?.averageScore ?? null;
  const bestScore = stats?.bestScore ?? null;
  const streakDays = computeStreakDays(sessions.map((s) => s.completedAt));

  // Gamification activity — drives profile heatmap (XP per day from real API).
  const { activity, loading: activityLoading } = useDailyActivity(365);
  // SCRUM-401: contribution heatmap 52 tuần trên profile — XP từ gamification API.
  const practiceHeatmap = useMemo(() => buildGamificationHeatmap(activity, 52), [activity]);

  function addSkill() {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, s] }));
    }
    setSkillInput("");
  }

  function handleCancel() {
    setForm(snapshot);
    setEditing(false);
    setUploadingAvatar(false);
    setLinkedInTouched(false);
    setGithubTouched(false);
  }

  function handleAvatarUploadError(code: string) {
    addToast("error", mapAvatarUploadError(code, p));
  }

  const linkedInInvalid = editing && !isValidUrl(form.linkedInUrl);
  const githubInvalid = editing && !isValidUrl(form.githubUrl);
  const linkedInError = linkedInInvalid && linkedInTouched;
  const githubError = githubInvalid && githubTouched;

  async function handleSave() {
    if (!form.fullName.trim() || linkedInInvalid || githubInvalid) {
      setLinkedInTouched(true);
      setGithubTouched(true);
      addToast("error", linkedInInvalid || githubInvalid ? p.invalidUrl : p.saveFailed);
      return;
    }
    setSaving(true);
    try {
      await updateCandidateProfile({
        fullName: form.fullName.trim(),
        targetRole: form.targetRole.trim() || undefined,
        seniorityLevel: form.seniorityLevel || undefined,
        techStack: form.skills,
        bio: form.bio.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        linkedInUrl: form.linkedInUrl.trim() || undefined,
        githubUrl: form.githubUrl.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
      });
      await refreshUser();
      await loadProfile();
      setEditing(false);
      addToast("success", p.saveSuccess);
    } catch {
      addToast("error", p.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const profileStats = [
    {
      icon: BookOpen,
      label: p.stats.sessions,
      value: sessionCount.toString(),
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      icon: TrendingUp,
      label: p.stats.avgScore,
      value: avgScore !== null ? `${avgScore}%` : "—",
      color: "text-violet-500 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
      icon: Trophy,
      label: p.stats.bestScore,
      value: bestScore !== null ? `${bestScore}%` : "—",
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      icon: Flame,
      label: p.stats.streak,
      value: `${streakDays} ${streakDays === 1 ? p.stats.day : p.stats.days}`,
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
  ];

  const displayValue = (value: string) =>
    value.trim() ? value : (
      <span className="text-gray-400 dark:text-gray-500 italic">{p.emptyField}</span>
    );

  const displayUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return displayValue("");
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[14px] text-primary hover:underline break-all"
      >
        {trimmed}
      </a>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
        <div className="flex flex-col gap-5">
          <div className="hr-glass-card p-6 flex flex-col items-center text-center">
            <Skeleton className="w-20 h-20 rounded-full mb-4" />
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-3 w-40" />
            <div className="grid grid-cols-2 gap-3 w-full mt-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="hr-glass-card p-5">
            <Skeleton className="h-4 w-24 mb-4" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-5 min-w-0">
          <Skeleton className="h-8 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="hr-glass-card p-5">
              <Skeleton className="h-4 w-32 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
      <div className="flex flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="hr-glass-card p-6 flex flex-col items-center text-center"
        >
          <AvatarUpload
            avatarUrl={form.avatarUrl.trim() || null}
            fullName={form.fullName || "?"}
            size="lg"
            editing={true}
            uploading={uploadingAvatar}
            disabled={saving}
            uploadFile={uploadAvatarToCloudinary}
            onUpload={async (url) => {
              setForm((prev) => ({ ...prev, avatarUrl: url }));
              try {
                await updateCandidateProfile({
                  fullName: form.fullName.trim() || "User",
                  targetRole: form.targetRole.trim() || undefined,
                  seniorityLevel: form.seniorityLevel || undefined,
                  techStack: form.skills,
                  bio: form.bio.trim() || undefined,
                  phoneNumber: form.phoneNumber.trim() || undefined,
                  linkedInUrl: form.linkedInUrl.trim() || undefined,
                  githubUrl: form.githubUrl.trim() || undefined,
                  avatarUrl: url,
                });
                await refreshUser();
              } catch {
                addToast("error", p.saveFailed);
              }
            }}
            onError={handleAvatarUploadError}
            onUploadStart={() => setUploadingAvatar(true)}
            onUploadEnd={() => setUploadingAvatar(false)}
            labels={{
              uploadPhoto: p.uploadPhoto,
              photoFormats: p.photoFormats,
              uploadingPhoto: p.uploadingPhoto,
            }}
            avatarClassName="mb-0 bg-primary"
            className="mb-4"
          />
          <h2 className={cn("text-[18px] font-[700]", portalHeadingAlt)}>{form.fullName}</h2>
          <p className={cn("text-[13px] mt-1", portalSubtextAlt)}>{form.email}</p>
          {googleLinked ? (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              {/* Google G logo */}
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" className="shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {p.googleLinkedBadge} Google
              {/* Tick */}
              <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" className="shrink-0">
                <circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.18" />
                <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </span>
          ) : null}

          {form.targetRole ? (
            <div className={cn("flex items-center gap-1.5 mt-3 rounded-full px-3 py-1.5", TARGET_ROLE_CLS)}>
              <Target size={12} className="text-primary" />
              <span className="text-[12px] font-[600] text-primary">{form.targetRole}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 w-full mt-5">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn(portalIconWell, "rounded-lg p-3 flex flex-col items-center gap-1.5")}>
                  <Skeleton className="w-7 h-7 rounded-lg" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-2.5 w-14" />
                </div>
              ))
            ) : (
              profileStats.map((s) => (
                <div key={s.label} className={cn(portalIconWell, "rounded-lg p-3 text-center")}>
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1.5",
                      s.bg
                    )}
                  >
                    <s.icon size={13} className={s.color} />
                  </div>
                  <p className={cn("text-[16px] font-[700] leading-none", portalHeadingAlt)}>{s.value}</p>
                  <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{s.label}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* XP / Gamification progress */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 }}
        >
          <GamificationProgressCard />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AchievementGrid variant="compact" />
        </motion.div>

        {/* CV preview dưới Achievements — ảnh CV gần full (giống HR recommendation detail) */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="hr-glass-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <p className={cn("text-[12px] font-bold truncate", portalHeadingAlt)}>CV Review</p>
            </div>
            {cv?.downloadUrl && (
              <a
                href={cv.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 px-2 flex items-center gap-1 text-[11px] font-semibold text-primary hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition-colors shrink-0"
              >
                <Download size={11} />
                {p.cv.downloadBtn}
              </a>
            )}
          </div>

          {cvLoading ? (
            <div className="aspect-210/297 flex items-center justify-center bg-gray-50 dark:bg-gray-900/40">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : cv && isImageCv(cv.fileName) && cv.downloadUrl ? (
            /* Image CV — container is exactly 1 A4 page tall, scroll to see more */
            <button
              type="button"
              onClick={() => setCvLightbox(true)}
              className="group relative block w-full text-left aspect-210/297 overflow-y-auto bg-gray-50 dark:bg-gray-900/40"
              title={p.cv.previewHint}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cv.downloadUrl}
                alt={cv.fileName}
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain bg-white dark:bg-gray-950"
              />
              <span className="sticky bottom-0 inset-x-0 pointer-events-none flex justify-center pb-3 -mt-10">
                <span className="opacity-90 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-black/55 shadow-sm">
                  <Maximize2 size={11} />
                  {p.cv.previewOpen}
                </span>
              </span>
            </button>
          ) : cv && isPdfCv(cv.fileName) && cv.downloadUrl ? (
            /* PDF CV — iframe sized to 1 A4 page; native PDF viewer handles page scrolling */
            <div className="relative w-full aspect-210/297 bg-gray-50 dark:bg-gray-900/40">
              <iframe
                src={cv.downloadUrl}
                title={cv.fileName}
                className="absolute inset-0 w-full h-full bg-white dark:bg-gray-950"
              />
              <button
                type="button"
                onClick={() => setCvLightbox(true)}
                title={p.cv.previewHint}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-black/55 shadow-sm hover:bg-black/70 transition-colors z-10"
              >
                <Maximize2 size={11} />
                {p.cv.previewOpen}
              </button>
            </div>
          ) : cv ? (
            <a
              href={cv.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-40 flex flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
            >
              <FileText size={22} className="text-gray-400" />
              <span className={cn("text-[11px] font-medium px-3 text-center truncate max-w-full", portalSubtextAlt)}>
                {cv.fileName}
              </span>
            </a>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <p className={cn("text-[12px] italic", portalSubtextAlt)}>Chưa cập nhật</p>
            </div>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col gap-5 min-w-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className={cn("text-[24px] font-[800]", portalHeadingAlt)}>{p.heading}</h1>
          {editing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving || uploadingAvatar}
                className={cn(
                  "flex items-center gap-1.5 h-[34px] px-4 text-[12px] font-[600] hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50",
                  portalCard,
                  portalSubtextAlt
                )}
              >
                <X size={13} />
                {p.cancelBtn}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || uploadingAvatar || linkedInError || githubError}
                className="shimmer-button flex items-center gap-1.5 h-8.5 px-4 text-[12px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                {p.saveBtn}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={cn(
                "flex items-center gap-1.5 h-[34px] px-4 text-[12px] font-[600] hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors",
                portalCard,
                portalHeadingAlt
              )}
            >
              <Edit2 size={13} />
              {p.editBtn}
            </button>
          )}
        </div>

        {/* SCRUM-401: Contribution heatmap — cột phải đủ rộng cho 52 tuần */}
        <div className="hr-glass-card p-5 overflow-hidden">
          <div className="mb-3">
            <h3 className={cn("text-[14px] font-[700]", portalHeadingAlt)}>{p.heatmap.title}</h3>
            <p className={cn("text-[12px] mt-0.5", portalSubtextAlt)}>{p.heatmap.subtitle}</p>
          </div>
          {activityLoading ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : practiceHeatmap.activeDays === 0 ? (
            <p className={cn("text-[13px] py-6 text-center", portalSubtextAlt)}>{p.heatmap.empty}</p>
          ) : (
            <PracticeHeatmap heatmap={practiceHeatmap} source="profile" compact />
          )}
        </div>

        {/* Contact information */}
        <SectionCard title={p.sectionContact} icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            <Field label={p.fullName}>
              {editing ? (
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className={cn(INPUT_CLASS, "pl-9")}
                  />
                </div>
              ) : (
                <span className={cn("text-[14px] font-[600]", portalHeadingAlt)}>{displayValue(form.fullName)}</span>
              )}
            </Field>

            <Field label={p.phoneNumber}>
              {editing ? (
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    className={cn(INPUT_CLASS, "pl-9")}
                  />
                </div>
              ) : (
                <span className={cn("text-[14px]", portalHeadingAlt)}>{displayValue(form.phoneNumber)}</span>
              )}
            </Field>

            <Field label={p.email} full>
              {editing ? (
                <>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={form.email} readOnly className={cn(READONLY_CLASS, "pl-9")} />
                  </div>
                  <p className={cn("text-[11px] mt-2", portalSubtextAlt)}>{p.emailReadOnlyHint}</p>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  <span className={cn("text-[14px]", portalHeadingAlt)}>{displayValue(form.email)}</span>
                </div>
              )}
            </Field>

            {googleLinked ? (
              <Field label={p.googleAccount} full>
                <LinkedGoogleAccount
                  linked
                  email={form.email}
                  labels={{
                    linkedBadge: p.googleLinkedBadge,
                    hint: p.googleLinkedHint,
                  }}
                />
              </Field>
            ) : null}
          </div>
        </SectionCard>

        {/* Career goals */}
        <SectionCard title={p.sectionCareer} icon={Target}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 mb-5">
            <Field label={p.targetRole}>
              {editing ? (
                <input
                  type="text"
                  value={form.targetRole}
                  onChange={(e) => setForm((prev) => ({ ...prev, targetRole: e.target.value }))}
                  placeholder={p.targetRolePlaceholder}
                  className={INPUT_CLASS}
                />
              ) : (
                <span className={cn("text-[14px] font-[600]", portalHeadingAlt)}>
                  {displayValue(form.targetRole)}
                </span>
              )}
            </Field>

            <Field label={p.seniorityLevel}>
              {editing ? (
                <select
                  value={form.seniorityLevel}
                  onChange={(e) => setForm((prev) => ({ ...prev, seniorityLevel: e.target.value }))}
                  className={cn(INPUT_CLASS, !form.seniorityLevel && "text-gray-400 dark:text-gray-500")}
                >
                  <option value="">{p.seniorityPlaceholder}</option>
                  {SENIORITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={cn("text-[14px]", portalHeadingAlt)}>{displayValue(form.seniorityLevel)}</span>
              )}
            </Field>
          </div>

          <Field label={p.bio}>
            {editing ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder={p.bioPlaceholder}
                rows={4}
                className={cn(INPUT_CLASS, "resize-none min-h-[100px]")}
              />
            ) : (
              <p className={cn("text-[14px] leading-[22px]", portalSubtextAlt)}>{displayValue(form.bio)}</p>
            )}
          </Field>
        </SectionCard>

        {/* CV / Resume */}
        <SectionCard title={p.cv.title} icon={FileText}>
          <input
            ref={cvFileInputRef}
            type="file"
            accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
            className="hidden"
            onChange={handleCvFileChange}
          />

          {/* ── Drag-and-drop wrapper ── */}
          <div
            className="relative"
            onDragOver={(e) => { e.preventDefault(); if (!cvUploading && !cvDeleting) setCvDragOver(true); }}
            onDragEnter={(e) => { e.preventDefault(); if (!cvUploading && !cvDeleting) setCvDragOver(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setCvDragOver(false); }}
            onDrop={handleCvDrop}
          >
            {/* Drag overlay — renders on top of any CV state */}
            {cvDragOver && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-white/96 dark:bg-gray-900/96 pointer-events-none">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Upload size={26} className="text-primary" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-primary">Thả file vào đây</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PDF · DOCX · JPG · PNG</p>
              </div>
            )}

          {cvLoading ? (
            <div className="h-12 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          ) : cv ? (
            /* ── Single bordered container ── */
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">

              {/* File row */}
              <div className="flex items-center gap-3 px-4 py-3">
                <FileText size={16} className={cn("shrink-0", portalSubtextAlt)} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[13px] font-semibold truncate", portalHeadingAlt)}>{cv.fileName}</p>
                  <p className={cn("text-[11px]", portalSubtextAlt)}>
                    {p.cv.uploadedAt} {formatRelativeTime(cv.uploadedAt, lang)}
                  </p>
                </div>
                <a
                  href={cv.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 h-7 px-2.5 text-[12px] font-semibold text-primary hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-lg transition-colors shrink-0"
                >
                  <Eye size={13} />
                  {p.cv.viewBtn}
                </a>
                <a
                  href={cv.downloadUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  title={p.cv.downloadBtn}
                  className={cn("w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0 hover:text-primary", portalSubtextAlt)}
                >
                  <Download size={13} />
                </a>
              </div>

              {/* AI Insights */}
              {cv.parsedAt ? (
                cv.summary || cv.skills.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowCvInsights((v) => !v)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 text-left border-t border-gray-100 dark:border-gray-800",
                        "hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                      )}
                    >
                      <span className={cn("text-[12px] font-semibold flex items-center gap-1.5", portalHeadingAlt)}>
                        <Sparkles size={12} className="text-primary" />
                        {p.cv.aiInsightsToggle}
                      </span>
                      <ChevronDown
                        size={14}
                        className={cn("transition-transform duration-200 shrink-0", portalSubtextAlt, showCvInsights && "rotate-180")}
                      />
                    </button>

                    {showCvInsights && (
                      <div className="px-4 pb-4 flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                        {cv.summary && (
                          <div>
                            <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1.5", portalSubtextAlt)}>
                              {p.cv.aiSummary}
                            </p>
                            <p className={cn("text-[12px] leading-relaxed", portalSubtextAlt)}>{cv.summary}</p>
                          </div>
                        )}
                        {cv.skills.length > 0 && (
                          <div>
                            <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", portalSubtextAlt)}>
                              {p.cv.detectedSkills}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(showAllCvSkills ? cv.skills : cv.skills.slice(0, 10)).map((skill) => (
                                <span
                                  key={skill}
                                  className={cn("text-[11px] font-medium px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700", portalHeadingAlt)}
                                >
                                  {skill}
                                </span>
                              ))}
                              {!showAllCvSkills && cv.skills.length > 10 && (
                                <button type="button" onClick={() => setShowAllCvSkills(true)}
                                  className="text-[11px] font-semibold text-primary hover:underline px-2 py-1">
                                  +{cv.skills.length - 10}
                                </button>
                              )}
                              {showAllCvSkills && cv.skills.length > 10 && (
                                <button type="button" onClick={() => setShowAllCvSkills(false)}
                                  className={cn("text-[11px] font-semibold px-2 py-1 hover:underline", portalSubtextAlt)}>
                                  ↑
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className={cn("flex items-center gap-1.5 text-[12px] italic px-4 py-2.5 border-t border-gray-100 dark:border-gray-800", portalSubtextAlt)}>
                    <AlertCircle size={12} className="shrink-0" />
                    {p.cv.noSkillsDetected}
                  </p>
                )
              ) : (
                <p className={cn("flex items-center gap-1.5 text-[12px] italic px-4 py-2.5 border-t border-gray-100 dark:border-gray-800", portalSubtextAlt)}>
                  <AlertCircle size={12} className="shrink-0" />
                  {p.cv.analysisUnavailable}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 px-3 py-2.5 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => cvFileInputRef.current?.click()}
                  disabled={cvUploading || cvDeleting}
                  className={cn(
                    "flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50",
                    portalHeadingAlt,
                    "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  {cvUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {cvUploading ? p.cv.uploading : p.cv.replaceBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setCvDeleteConfirmOpen(true)}
                  disabled={cvUploading || cvDeleting}
                  className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  {p.cv.deleteBtn}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", portalIconWell)}>
                <FileText size={20} className="text-gray-400 dark:text-gray-500" />
              </div>
              <div>
                <p className={cn("text-[13px] max-w-xs", portalSubtextAlt)}>{p.cv.emptyState}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Kéo thả file vào đây hoặc
                </p>
              </div>
              <button
                type="button"
                onClick={() => cvFileInputRef.current?.click()}
                disabled={cvUploading}
                className="shimmer-button flex items-center gap-2 h-9 px-4 text-[13px] font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60"
              >
                {cvUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {cvUploading ? p.cv.uploading : p.cv.uploadBtn}
              </button>
              <p className="text-[10px] text-gray-400 dark:text-gray-600">PDF · DOCX · JPG · PNG</p>
            </div>
          )}
          </div>{/* end drag-and-drop wrapper */}
        </SectionCard>

        {/* Skills */}
        <SectionCard title={p.sectionSkills} icon={Sparkles}>
          {(() => {
            const MAX_VISIBLE = 8;
            const visibleSkills =
              editing || showAllSkills
                ? form.skills
                : form.skills.slice(0, MAX_VISIBLE);
            const hiddenCount = form.skills.length - MAX_VISIBLE;

            return (
              <>
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.skills.length === 0 && !editing ? (
                    <span className={cn("text-[14px] italic", portalSubtextAlt)}>
                      {p.emptyField}
                    </span>
                  ) : (
                    visibleSkills.map((skill) => (
                      <SkillBadge
                        key={skill}
                        skill={skill}
                        editing={editing}
                        onRemove={() =>
                          setForm((prev) => ({
                            ...prev,
                            skills: prev.skills.filter((s) => s !== skill),
                          }))
                        }
                      />
                    ))
                  )}
                </div>

                {/* Show more / collapse — only in view mode */}
                {!editing && hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSkills((v) => !v)}
                    className={cn(
                      "text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors",
                      "text-primary bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-950/50"
                    )}
                  >
                    {showAllSkills
                      ? "Thu gọn ↑"
                      : `+${hiddenCount} kỹ năng khác`}
                  </button>
                )}
              </>
            );
          })()}

          {editing && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder={p.skillPlaceholder}
                className={cn(INPUT_CLASS, "flex-1")}
              />
              <button
                type="button"
                onClick={addSkill}
                disabled={!skillInput.trim()}
                className="flex items-center gap-1.5 h-[38px] px-4 text-[12px] font-[600] text-white bg-primary hover:bg-primary-hover disabled:opacity-40 rounded-lg transition-colors shrink-0"
              >
                <Plus size={13} />
                {p.addSkill}
              </button>
            </div>
          )}
        </SectionCard>

        {/* Social links */}
        <SectionCard title={p.sectionLinks} icon={Link}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
            <Field label={p.linkedInUrl}>
              {editing ? (
                <div>
                  <div className="relative">
                    <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="url"
                      value={form.linkedInUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, linkedInUrl: e.target.value }))}
                      onBlur={() => setLinkedInTouched(true)}
                      className={cn(INPUT_CLASS, "pl-9", linkedInError && "border-red-400 dark:border-red-500 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.15)]")}
                    />
                  </div>
                  {linkedInError && <p className="text-xs text-red-500 mt-1">{p.invalidUrl}</p>}
                </div>
              ) : (
                displayUrl(form.linkedInUrl)
              )}
            </Field>

            <Field label={p.githubUrl}>
              {editing ? (
                <div>
                  <div className="relative">
                    <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="url"
                      value={form.githubUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, githubUrl: e.target.value }))}
                      onBlur={() => setGithubTouched(true)}
                      className={cn(INPUT_CLASS, "pl-9", githubError && "border-red-400 dark:border-red-500 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.15)]")}
                    />
                  </div>
                  {githubError && <p className="text-xs text-red-500 mt-1">{p.invalidUrl}</p>}
                </div>
              ) : (
                displayUrl(form.githubUrl)
              )}
            </Field>
          </div>
        </SectionCard>
      </motion.div>

      <ConfirmDialog
        open={cvDeleteConfirmOpen}
        title={p.cv.deleteConfirmTitle}
        message={p.cv.deleteConfirmMessage}
        confirmLabel={p.cv.deleteBtn}
        cancelLabel={p.cancelBtn}
        variant="danger"
        loading={cvDeleting}
        onConfirm={handleCvDelete}
        onCancel={() => setCvDeleteConfirmOpen(false)}
      />

      {cvLightbox && cv && (isImageCv(cv.fileName) || isPdfCv(cv.fileName)) && cv.downloadUrl && typeof document !== "undefined" && createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={() => setCvLightbox(false)}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 shrink-0">
            <p className="text-[13px] font-medium text-white/90 truncate">{cv.fileName}</p>
            <button
              type="button"
              onClick={() => setCvLightbox(false)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div
            className={cn(
              "flex-1",
              isPdfCv(cv.fileName) ? "p-0 min-h-0" : "overflow-auto flex items-start justify-center p-4 sm:p-8"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {isPdfCv(cv.fileName) ? (
              <iframe
                src={cv.downloadUrl}
                title={cv.fileName}
                className="w-full h-full bg-white"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={cv.downloadUrl}
                alt={cv.fileName}
                referrerPolicy="no-referrer"
                className="max-w-full h-auto rounded-lg shadow-2xl"
              />
            )}
          </div>
        </motion.div>,
        document.body
      )}
    </div>
  );
}
