"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit2, Save, X } from "lucide-react";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { cn } from "@/lib/cn";
import { FormField } from "@/shared/components/ui/form-field";
import { useLanguage } from "@/shared/providers/language-context";
import { useUser } from "@/features/auth/context/user-context";
import { useToast } from "@/shared/providers/toast-context";
import { getCurrentUser, updateHrProfile } from "@/features/auth/services/user.service";
import { AvatarUpload } from "@/shared/components/common/avatar-upload";
import { LinkedGoogleAccount } from "@/shared/components/common/linked-google-account";
import { uploadAvatarToCloudinary } from "@/shared/utils/cloudinary";
import { mapAvatarUploadError } from "@/shared/utils/avatar-upload-messages";
import { isValidUrl } from "@/shared/utils/url-validation";
import { portalDivider, portalHeading, portalInput, portalMutedBg, portalSubtext } from "@/shared/utils/portal-ui";
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
};

function ViewField({ label, value }: { label: string; value: string }) {
  const { t } = useLanguage();
  const empty = t.settingsPage.profile.emptyField;
  return (
    <div className={cn("border-b pb-4 last:border-0 last:pb-0", portalDivider)}>
      <p className={cn("text-xs font-medium mb-1", portalSubtext)}>{label}</p>
      <p className={cn("text-sm break-words", portalHeading)}>
        {value.trim() ? value : <span className="text-gray-400 dark:text-gray-500 italic">{empty}</span>}
      </p>
    </div>
  );
}

function ViewUrlField({ label, url }: { label: string; url: string }) {
  const { t } = useLanguage();
  const empty = t.settingsPage.profile.emptyField;
  const trimmed = url.trim();
  return (
    <div className={cn("border-b pb-4 last:border-0 last:pb-0", portalDivider)}>
      <p className={cn("text-xs font-medium mb-1", portalSubtext)}>{label}</p>
      {trimmed ? (
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#6c47ff] hover:underline break-all"
        >
          {trimmed}
        </a>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">{empty}</p>
      )}
    </div>
  );
}

export function ProfileSection() {
  const { t } = useLanguage();
  const sp = t.settingsPage.profile;
  const { refreshUser } = useUser();
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

  return (
    <div>
      <div className={cn("flex items-center justify-between mb-5", editing && "flex-col sm:flex-row items-start sm:items-center gap-3")}>
        <h3 className={cn("text-base font-semibold", portalHeading)}>{sp.title}</h3>
        {editing ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving || uploadingAvatar}
              className={cn("flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-semibold border rounded-lg disabled:opacity-50", portalInput, "hover:bg-gray-50 dark:hover:bg-gray-800")}
            >
              <X size={14} />
              {sp.cancelBtn}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || uploadingAvatar || linkedInError || githubError}
              className="shimmer-button flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-semibold text-white hr-cta-btn rounded-lg disabled:opacity-60"
            >
              {saving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {sp.save}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn("flex items-center gap-1.5 h-8 px-3 text-xs font-semibold border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800", portalInput, portalHeading)}
          >
            <Edit2 size={13} />
            {sp.editBtn}
          </button>
        )}
      </div>

      <AvatarUpload
        avatarUrl={form.avatarUrl.trim() || null}
        fullName={form.fullName || "?"}
        size="md"
        editing={true}
        uploading={uploadingAvatar}
        disabled={saving}
        layout="inline"
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
        className="mb-6"
      />

      {!editing ? (
        <div className={cn("space-y-4 border rounded-xl p-5", portalMutedBg, portalDivider)}>
          <ViewField label={sp.fullName} value={form.fullName} />
          <ViewField label={sp.email} value={form.email} />
          <LinkedGoogleAccount
            linked={googleLinked}
            email={form.email}
            labels={{
              title: sp.googleAccount,
              linkedBadge: sp.googleLinkedBadge,
              hint: sp.googleLinkedHint,
            }}
            className={cn("border-b pb-4 last:border-0 last:pb-0", portalDivider)}
          />
          <ViewField label={sp.company} value={form.companyName} />
          <ViewField label={sp.jobTitle} value={form.jobTitle} />
          <ViewField label={sp.phoneNumber} value={form.phoneNumber} />
          <ViewUrlField label={sp.linkedInUrl} url={form.linkedInUrl} />
          <ViewUrlField label={sp.githubUrl} url={form.githubUrl} />
          <ViewField label={sp.bio} value={form.bio} />
          <ViewField label={sp.inviteTemplate} value={form.inviteMessageTemplate} />
        </div>
      ) : (
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

          <LinkedGoogleAccount
            linked={googleLinked}
            email={form.email}
            labels={{
              title: sp.googleAccount,
              linkedBadge: sp.googleLinkedBadge,
              hint: sp.googleLinkedHint,
            }}
          />

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
        </div>
      )}
    </div>
  );
}
