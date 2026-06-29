"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/cn";
import { achievements, practiceSessions } from "@/features/candidate/data/jobseeker";
import { SENIORITY_LEVELS } from "@/shared/constants/seniority-levels";
import { useLanguage } from "@/shared/providers/language-context";
import { useUser } from "@/features/auth/context/user-context";
import { useToast } from "@/shared/providers/toast-context";
import { getCurrentUser, updateCandidateProfile } from "@/features/auth/services/user.service";
import { AvatarUpload } from "@/shared/components/common/avatar-upload";
import { uploadAvatarToCloudinary } from "@/shared/utils/cloudinary";
import { mapAvatarUploadError } from "@/shared/utils/avatar-upload-messages";
import { SectionCard, Field } from "@/features/candidate/components/ui/section-card";
import {
  portalCard,
  portalHeadingAlt,
  portalIconWell,
  portalInput,
  portalMutedBg,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

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
  const { t } = useLanguage();
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

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      const next = formFromUser(user);
      setForm(next);
      setSnapshot(next);
    } catch {
      addToast("error", p.saveFailed);
    } finally {
      setLoading(false);
    }
  }, [addToast, p.saveFailed]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const avgScore = Math.round(
    practiceSessions.reduce((a, s) => a + s.score, 0) / practiceSessions.length
  );
  const bestScore = Math.max(...practiceSessions.map((s) => s.score));

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
  }

  function handleAvatarUploadError(code: string) {
    addToast("error", mapAvatarUploadError(code, p));
  }

  async function handleSave() {
    if (!form.fullName.trim()) {
      addToast("error", p.saveFailed);
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
      value: practiceSessions.length.toString(),
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      icon: TrendingUp,
      label: p.stats.avgScore,
      value: `${avgScore}%`,
      color: "text-violet-500 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
      icon: Trophy,
      label: p.stats.bestScore,
      value: `${bestScore}%`,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      icon: Flame,
      label: p.stats.streak,
      value: "7 days",
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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] gap-4">
        <span className="w-14 h-14 border-[3px] border-primary/25 border-t-primary rounded-full animate-spin" />
        <span className={cn("text-sm font-medium", portalSubtextAlt)}>{p.loading}</span>
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
            editing={editing}
            uploading={uploadingAvatar}
            disabled={saving}
            uploadFile={uploadAvatarToCloudinary}
            onUpload={(url) => setForm((prev) => ({ ...prev, avatarUrl: url }))}
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

          {form.targetRole ? (
            <div className={cn("flex items-center gap-1.5 mt-3 rounded-full px-3 py-1.5", TARGET_ROLE_CLS)}>
              <Target size={12} className="text-primary" />
              <span className="text-[12px] font-[600] text-primary">{form.targetRole}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 w-full mt-5">
            {profileStats.map((s) => (
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
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="hr-glass-card p-5"
        >
          <h3 className={cn("text-[14px] font-[700] mb-4", portalHeadingAlt)}>{p.achievements}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                title={ach.description}
                className={cn(
                  "flex flex-col items-center text-center p-2 rounded-lg transition-all",
                  ach.earned ? cn(EARNED_BADGE_CLS, "cursor-default") : cn(portalIconWell, "opacity-40 grayscale")
                )}
              >
                <span className="text-2xl leading-none mb-1">{ach.icon}</span>
                <p className={cn("text-[10px] font-[600] leading-tight", portalHeadingAlt)}>{ach.title}</p>
              </div>
            ))}
          </div>
          <p className={cn("text-[11px] mt-3 text-center", portalSubtextAlt)}>
            {achievements.filter((a) => a.earned).length}/{achievements.length} {p.earned}
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col gap-5"
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
                disabled={saving || uploadingAvatar}
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
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-primary" />
                  <span className={cn("text-[14px] font-[600]", portalHeadingAlt)}>
                    {displayValue(form.targetRole)}
                  </span>
                </div>
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

        {/* Skills */}
        <SectionCard title={p.sectionSkills} icon={Sparkles}>
          <div className="flex flex-wrap gap-2 mb-4">
            {form.skills.length === 0 && !editing ? (
              <span className={cn("text-[14px] italic", portalSubtextAlt)}>{p.emptyField}</span>
            ) : (
              form.skills.map((skill) => (
                <span
                  key={skill}
                  className={cn("flex items-center gap-1.5 text-[12px] font-[500] px-3 py-1.5 rounded-[6px]", portalMutedBg, portalHeadingAlt)}
                >
                  {skill}
                  {editing && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          skills: prev.skills.filter((s) => s !== skill),
                        }))
                      }
                      className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
          {editing && (
            <div className="flex gap-2">
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
                <div className="relative">
                  <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={form.linkedInUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, linkedInUrl: e.target.value }))}
                    className={cn(INPUT_CLASS, "pl-9")}
                  />
                </div>
              ) : (
                displayUrl(form.linkedInUrl)
              )}
            </Field>

            <Field label={p.githubUrl}>
              {editing ? (
                <div className="relative">
                  <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={form.githubUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, githubUrl: e.target.value }))}
                    className={cn(INPUT_CLASS, "pl-9")}
                  />
                </div>
              ) : (
                displayUrl(form.githubUrl)
              )}
            </Field>
          </div>
        </SectionCard>
      </motion.div>
    </div>
  );
}
