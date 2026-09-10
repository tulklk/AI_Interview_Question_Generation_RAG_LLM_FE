"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, Link2, Pencil, Save, SlidersHorizontal, User, X } from "lucide-react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { cn } from "@/lib/cn";
import { FormField } from "@/shared/components/ui/form-field";
import { useLanguage } from "@/shared/providers/language-context";
import { useUser } from "@/features/auth/context/user-context";
import { useHrSubscription } from "@/features/hr/context/hr-subscription-context";
import { useToast } from "@/shared/providers/toast-context";
import { getCurrentUser, updateHrProfile } from "@/features/auth/services/user.service";
import { AvatarUpload } from "@/shared/components/common/avatar-upload";
import { LinkedGoogleAccount } from "@/shared/components/common/linked-google-account";
import { ProfileField, SectionCard } from "@/features/settings/components/profile/profile-field";
import { ProfileHeaderCard } from "@/features/settings/components/profile/profile-header-card";
import { uploadAvatarToCloudinary } from "@/shared/utils/cloudinary";
import { mapAvatarUploadError } from "@/shared/utils/avatar-upload-messages";
import { isValidUrl } from "@/shared/utils/url-validation";
import { portalDivider, portalHeading, portalInput, portalSubtext } from "@/shared/utils/portal-ui";

interface HrProfileForm {
  fullName: string;
  email: string;
  companyName: string;
  jobTitle: string;
  phoneNumber: string;
  linkedInUrl: string;
  githubUrl: string;
  avatarUrl: string;
  bio: string;
  inviteMessageTemplate: string;
  companyId?: string;
  recDefaultMinScore: string;
  recDefaultSortBy: string;
  recDefaultSortDir: string;
  recHideDismissed: boolean;
}

const EMPTY: HrProfileForm = {
  fullName: "",
  email: "",
  companyName: "",
  jobTitle: "",
  phoneNumber: "",
  linkedInUrl: "",
  githubUrl: "",
  avatarUrl: "",
  bio: "",
  inviteMessageTemplate: "",
  recDefaultMinScore: "",
  recDefaultSortBy: "score",
  recDefaultSortDir: "desc",
  recHideDismissed: false,
};

/** Fields the HR can actually fill in — drives the completeness bar. */
const COMPLETENESS_FIELDS: (keyof HrProfileForm)[] = [
  "fullName",
  "avatarUrl",
  "companyName",
  "jobTitle",
  "phoneNumber",
  "linkedInUrl",
  "githubUrl",
  "bio",
];

export function ProfileSection() {
  const { t } = useLanguage();
  const sp = t.settingsPage.profile;
  const { refreshUser } = useUser();
  const { isPremium } = useHrSubscription();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<HrProfileForm>(EMPTY);
  const [snapshot, setSnapshot] = useState<HrProfileForm>(EMPTY);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [linkedInTouched, setLinkedInTouched] = useState(false);
  const [githubTouched, setGithubTouched] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      const hp = user.hrProfile;
      const next: HrProfileForm = {
        fullName: hp?.fullName || user.fullName,
        email: user.email,
        companyName: hp?.companyName ?? "",
        jobTitle: hp?.jobTitle ?? "",
        phoneNumber: hp?.phoneNumber ?? "",
        linkedInUrl: hp?.linkedInUrl ?? "",
        githubUrl: hp?.githubUrl ?? "",
        avatarUrl: typeof hp?.avatarUrl === "string" ? hp.avatarUrl : user.avatarUrl ?? "",
        bio: hp?.bio ?? "",
        inviteMessageTemplate: hp?.inviteMessageTemplate ?? "",
        companyId: hp?.companyId,
        recDefaultMinScore:
          hp?.recDefaultMinScore != null && !Number.isNaN(hp.recDefaultMinScore)
            ? String(hp.recDefaultMinScore)
            : "",
        recDefaultSortBy: hp?.recDefaultSortBy === "date" ? "date" : "score",
        recDefaultSortDir: hp?.recDefaultSortDir === "asc" ? "asc" : "desc",
        recHideDismissed: Boolean(hp?.recHideDismissed),
      };
      setForm(next);
      setSnapshot(next);
      setGoogleLinked(Boolean(user.isGoogleLinked));
    } catch {
      addToast("error", sp.saveFailed);
    } finally {
      setLoading(false);
    }
  }, [addToast, sp.saveFailed]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleCancel() {
    setForm(snapshot);
    setEditing(false);
    setUploadingAvatar(false);
    setLinkedInTouched(false);
    setGithubTouched(false);
  }

  function handleAvatarUploadError(code: string) {
    addToast("error", mapAvatarUploadError(code, sp));
  }

  const linkedInInvalid = editing && !isValidUrl(form.linkedInUrl);
  const githubInvalid = editing && !isValidUrl(form.githubUrl);
  const linkedInError = linkedInInvalid && linkedInTouched;
  const githubError = githubInvalid && githubTouched;

  async function handleSave() {
    if (!form.fullName.trim() || linkedInInvalid || githubInvalid) {
      setLinkedInTouched(true);
      setGithubTouched(true);
      addToast("error", linkedInInvalid || githubInvalid ? sp.invalidUrl : sp.saveFailed);
      return;
    }
    setSaving(true);
    try {
      await updateHrProfile({
        fullName: form.fullName.trim(),
        companyId: form.companyId,
        companyName: form.companyName.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        linkedInUrl: form.linkedInUrl.trim() || undefined,
        githubUrl: form.githubUrl.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        bio: form.bio.trim() || undefined,
        inviteMessageTemplate: form.inviteMessageTemplate.trim() || null,
        recDefaultMinScore: form.recDefaultMinScore.trim()
          ? Number(form.recDefaultMinScore)
          : null,
        recDefaultSortBy: form.recDefaultSortBy,
        recDefaultSortDir: form.recDefaultSortDir,
        recHideDismissed: form.recHideDismissed,
      });
      await refreshUser();
      await loadProfile();
      setEditing(false);
      addToast("success", sp.saveSuccess);
    } catch {
      addToast("error", sp.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const completeness = useMemo(() => {
    const filled = COMPLETENESS_FIELDS.filter((key) => String(form[key] ?? "").trim()).length;
    return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
  }, [form]);

  const inputCls = cn(
    "w-full px-3.5 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors disabled:cursor-not-allowed",
    portalInput,
    "disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
        <AiLoadingSpinner text={sp.loading} />
      </div>
    );
  }

  const avatarSlot = (
    <AvatarUpload
      avatarUrl={form.avatarUrl.trim() || null}
      fullName={form.fullName || "?"}
      size="lg"
      editing={true}
      uploading={uploadingAvatar}
      disabled={saving}
      layout="inline"
      avatarClassName="hr-avatar-ring"
      uploadFile={uploadAvatarToCloudinary}
      onUpload={async (url) => {
        // Chỉ lưu avatarUrl mới trên nền dữ liệu đã lưu gần nhất (snapshot),
        // không dùng form hiện tại — tránh lộ các field đang sửa dở chưa bấm Save.
        setForm((prev) => ({ ...prev, avatarUrl: url }));
        try {
          await updateHrProfile({
            fullName: snapshot.fullName.trim() || "User",
            companyId: snapshot.companyId,
            companyName: snapshot.companyName.trim() || undefined,
            jobTitle: snapshot.jobTitle.trim() || undefined,
            phoneNumber: snapshot.phoneNumber.trim() || undefined,
            linkedInUrl: snapshot.linkedInUrl.trim() || undefined,
            githubUrl: snapshot.githubUrl.trim() || undefined,
            avatarUrl: url,
            bio: snapshot.bio.trim() || undefined,
            inviteMessageTemplate: snapshot.inviteMessageTemplate.trim() || null,
            recDefaultMinScore: snapshot.recDefaultMinScore.trim()
              ? Number(snapshot.recDefaultMinScore)
              : null,
            recDefaultSortBy: snapshot.recDefaultSortBy,
            recDefaultSortDir: snapshot.recDefaultSortDir,
            recHideDismissed: snapshot.recHideDismissed,
          });
          setSnapshot((prev) => ({ ...prev, avatarUrl: url }));
          await refreshUser();
        } catch {
          addToast("error", sp.saveFailed);
        }
      }}
      onError={handleAvatarUploadError}
      onUploadStart={() => setUploadingAvatar(true)}
      onUploadEnd={() => setUploadingAvatar(false)}
      labels={{
        uploadPhoto: sp.uploadPhoto,
        photoFormats: sp.photoFormats,
        uploadingPhoto: sp.uploadingPhoto,
        photo: sp.photo,
      }}
      className="shrink-0"
    />
  );

  const headerAction = editing ? (
    <div className="flex w-full sm:w-auto items-center gap-2">
      <button
        type="button"
        onClick={handleCancel}
        disabled={saving || uploadingAvatar}
        className={cn("flex flex-1 sm:flex-none items-center justify-center gap-1.5 h-9 px-4 text-sm font-semibold border rounded-lg disabled:opacity-50", portalInput, "hover:bg-gray-50 dark:hover:bg-gray-800")}
      >
        <X size={14} aria-hidden />
        {sp.cancelBtn}
      </button>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || uploadingAvatar || linkedInError || githubError}
        className="shimmer-button flex flex-1 sm:flex-none items-center justify-center gap-1.5 h-9 px-4 text-sm font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60"
      >
        {saving ? (
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Save size={14} aria-hidden />
        )}
        {sp.save}
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex w-full sm:w-auto items-center justify-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-lg border border-[#6c47ff]/30 text-[#6c47ff] hover:bg-[#6c47ff]/5 transition-colors"
    >
      <Pencil size={14} aria-hidden />
      {sp.editProfileBtn}
    </button>
  );

  const sortValue = `${form.recDefaultSortBy === "date" ? sp.recSortDate : sp.recSortScore} (${form.recDefaultSortDir === "asc" ? sp.recSortAsc : sp.recSortDesc})`;

  return (
    <div className="space-y-4 xl:space-y-5">
      <ProfileHeaderCard
        avatarSlot={avatarSlot}
        fullName={form.fullName}
        email={form.email}
        jobTitle={form.jobTitle}
        companyName={form.companyName}
        googleLinked={googleLinked}
        isPremium={isPremium}
        completeness={completeness}
        action={headerAction}
      />

      {!editing ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)] xl:gap-5">
          <div className="min-w-0 space-y-4 xl:space-y-5">
            <SectionCard icon={User} title={sp.sectionPersonal}>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <ProfileField label={sp.fullName} value={form.fullName} />
                <ProfileField label={sp.email} value={form.email} />
                <ProfileField label={sp.phoneNumber} value={form.phoneNumber} />
                <ProfileField label={sp.bio} value={form.bio} className="sm:col-span-2" />
              </div>
            </SectionCard>

            <SectionCard icon={Briefcase} title={sp.sectionProfessional}>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <ProfileField label={sp.company} value={form.companyName} />
                <ProfileField label={sp.jobTitle} value={form.jobTitle} />
                <ProfileField
                  label={sp.linkedInUrl}
                  value={form.linkedInUrl}
                  href={form.linkedInUrl.trim() || undefined}
                  icon={FaLinkedinIn}
                />
                <ProfileField
                  label={sp.githubUrl}
                  value={form.githubUrl}
                  href={form.githubUrl.trim() || undefined}
                  icon={FaGithub}
                />
              </div>
            </SectionCard>
          </div>

          <div className="min-w-0 space-y-4 xl:space-y-5">
            <SectionCard icon={Link2} title={sp.sectionConnected}>
              {googleLinked ? (
                <LinkedGoogleAccount
                  linked={googleLinked}
                  email={form.email}
                  labels={{ linkedBadge: sp.googleLinkedBadge }}
                  className="min-w-0"
                />
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">{sp.googleNotLinked}</p>
              )}
            </SectionCard>

            <SectionCard icon={SlidersHorizontal} title={sp.sectionRecruitment}>
              <div className="space-y-4">
                <ProfileField
                  label={sp.recDefaultMinScore}
                  value={form.recDefaultMinScore ? `≥ ${form.recDefaultMinScore}` : sp.recNoMinScore}
                />
                <ProfileField label={sp.recDefaultSort} value={sortValue} />
                <div className="flex items-start justify-between gap-3">
                  <p className={cn("text-xs font-medium", portalSubtext)}>{sp.recHideDismissed}</p>
                  <span className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold",
                    portalDivider,
                    "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  )}>
                    {form.recHideDismissed ? sp.recYes : sp.recNo}
                  </span>
                </div>
                <div className={cn("border-t pt-4", portalDivider)}>
                  <p className={cn("text-xs font-medium", portalSubtext)}>{sp.inviteTemplate}</p>
                  {form.inviteMessageTemplate.trim() ? (
                    <p className={cn("mt-1 line-clamp-3 text-sm whitespace-pre-line break-words", portalHeading)}>
                      {form.inviteMessageTemplate}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">{sp.emptyField}</p>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="space-y-4 xl:space-y-5">
          <SectionCard icon={User} title={sp.sectionPersonal}>
            <div className="space-y-4">
              <FormField label={sp.fullName} htmlFor="full-name">
                <input
                  id="full-name"
                  value={form.fullName}
                  onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  disabled={saving || uploadingAvatar}
                  className={inputCls}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={sp.email} htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    readOnly
                    disabled
                    className={inputCls}
                  />
                  <p className={cn("text-xs mt-1", portalSubtext)}>{sp.emailReadOnly}</p>
                </FormField>
                <FormField label={sp.phoneNumber} htmlFor="phone">
                  <input
                    id="phone"
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    disabled={saving || uploadingAvatar}
                    className={inputCls}
                  />
                </FormField>
              </div>

              <FormField label={sp.bio} htmlFor="bio">
                <textarea
                  id="bio"
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  disabled={saving || uploadingAvatar}
                  className={`${inputCls} resize-none`}
                />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard icon={Briefcase} title={sp.sectionProfessional}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={sp.company} htmlFor="company">
                  <input
                    id="company"
                    value={form.companyName}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    disabled={saving || uploadingAvatar}
                    className={inputCls}
                  />
                </FormField>
                <FormField label={sp.jobTitle} htmlFor="job-title">
                  <input
                    id="job-title"
                    value={form.jobTitle}
                    onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
                    disabled={saving || uploadingAvatar}
                    className={inputCls}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={sp.linkedInUrl} htmlFor="linkedin">
                  <input
                    id="linkedin"
                    type="url"
                    value={form.linkedInUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, linkedInUrl: e.target.value }))}
                    onBlur={() => setLinkedInTouched(true)}
                    disabled={saving || uploadingAvatar}
                    className={cn(inputCls, linkedInError && "border-red-400 dark:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/40")}
                  />
                  {linkedInError && <p className="text-xs text-red-500 mt-1">{sp.invalidUrl}</p>}
                </FormField>
                <FormField label={sp.githubUrl} htmlFor="github">
                  <input
                    id="github"
                    type="url"
                    value={form.githubUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, githubUrl: e.target.value }))}
                    onBlur={() => setGithubTouched(true)}
                    disabled={saving || uploadingAvatar}
                    className={cn(inputCls, githubError && "border-red-400 dark:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/40")}
                  />
                  {githubError && <p className="text-xs text-red-500 mt-1">{sp.invalidUrl}</p>}
                </FormField>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={SlidersHorizontal} title={sp.recPrefsTitle} desc={sp.recPrefsHint}>
            <div className="space-y-4">
              <FormField label={sp.inviteTemplate} htmlFor="invite-template">
                <textarea
                  id="invite-template"
                  value={form.inviteMessageTemplate}
                  onChange={(e) => setForm((prev) => ({ ...prev, inviteMessageTemplate: e.target.value }))}
                  rows={6}
                  maxLength={4000}
                  disabled={saving || uploadingAvatar}
                  className={`${inputCls} resize-none`}
                />
                <p className={cn("text-xs mt-1", portalSubtext)}>{sp.inviteTemplateHint}</p>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={sp.recDefaultMinScore} htmlFor="rec-min-score">
                  <select
                    id="rec-min-score"
                    value={form.recDefaultMinScore}
                    onChange={(e) => setForm((prev) => ({ ...prev, recDefaultMinScore: e.target.value }))}
                    disabled={saving || uploadingAvatar}
                    className={inputCls}
                  >
                    <option value="">{sp.recNoMinScore}</option>
                    <option value="70">≥ 70</option>
                    <option value="80">≥ 80</option>
                    <option value="90">≥ 90</option>
                  </select>
                </FormField>
                <FormField label={sp.recDefaultSort} htmlFor="rec-sort-by">
                  <select
                    id="rec-sort-by"
                    value={form.recDefaultSortBy}
                    onChange={(e) => setForm((prev) => ({ ...prev, recDefaultSortBy: e.target.value }))}
                    disabled={saving || uploadingAvatar}
                    className={inputCls}
                  >
                    <option value="score">{sp.recSortScore}</option>
                    <option value="date">{sp.recSortDate}</option>
                  </select>
                </FormField>
                <FormField label={sp.recDefaultSortDir} htmlFor="rec-sort-dir">
                  <select
                    id="rec-sort-dir"
                    value={form.recDefaultSortDir}
                    onChange={(e) => setForm((prev) => ({ ...prev, recDefaultSortDir: e.target.value }))}
                    disabled={saving || uploadingAvatar}
                    className={inputCls}
                  >
                    <option value="desc">{sp.recSortDesc}</option>
                    <option value="asc">{sp.recSortAsc}</option>
                  </select>
                </FormField>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.recHideDismissed}
                  onChange={(e) => setForm((prev) => ({ ...prev, recHideDismissed: e.target.checked }))}
                  disabled={saving || uploadingAvatar}
                  className="rounded border-gray-300"
                />
                <span className={portalHeading}>{sp.recHideDismissed}</span>
              </label>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
