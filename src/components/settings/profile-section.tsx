"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit2, Save, X } from "lucide-react";
import type { AxiosError } from "axios";
import { FormField } from "@/components/ui/form-field";
import { useLanguage } from "@/context/language-context";
import { useUser } from "@/context/user-context";
import { useToast } from "@/context/toast-context";
import { getCurrentUser, updateHrProfile } from "@/lib/api/user";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { uploadAvatarToCloudinary } from "@/lib/cloudinary";
import { mapAvatarUploadError } from "@/lib/avatar-upload-messages";
import type { ApiErrorResponse } from "@/types/auth";

interface HrProfileForm {
  fullName: string;
  email: string;
  companyName: string;
  jobTitle: string;
  phoneNumber: string;
  linkedInUrl: string;
  avatarUrl: string;
  bio: string;
  companyId?: string;
}

const EMPTY: HrProfileForm = {
  fullName: "",
  email: "",
  companyName: "",
  jobTitle: "",
  phoneNumber: "",
  linkedInUrl: "",
  avatarUrl: "",
  bio: "",
};

function ViewField({ label, value }: { label: string; value: string }) {
  const { t } = useLanguage();
  const empty = t.settingsPage.profile.emptyField;
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-900 break-words">
        {value.trim() ? value : <span className="text-gray-400 italic">{empty}</span>}
      </p>
    </div>
  );
}

function ViewUrlField({ label, url }: { label: string; url: string }) {
  const { t } = useLanguage();
  const empty = t.settingsPage.profile.emptyField;
  const trimmed = url.trim();
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
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
        <p className="text-sm text-gray-400 italic">{empty}</p>
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
        avatarUrl: typeof hp?.avatarUrl === "string" ? hp.avatarUrl : user.avatarUrl ?? "",
        bio: hp?.bio ?? "",
        companyId: hp?.companyId,
      };
      setForm(next);
      setSnapshot(next);
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
  }

  function handleAvatarUploadError(code: string) {
    addToast("error", mapAvatarUploadError(code, sp));
  }

  async function handleSave() {
    if (!form.fullName.trim()) {
      addToast("error", sp.saveFailed);
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
        avatarUrl: form.avatarUrl.trim() || undefined,
        bio: form.bio.trim() || undefined,
      });
      await refreshUser();
      await loadProfile();
      setEditing(false);
      addToast("success", sp.saveSuccess);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      addToast("error", axiosErr.response?.data?.message || sp.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors bg-white disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] gap-4">
        <span className="w-14 h-14 border-[3px] border-[#6c47ff]/25 border-t-[#6c47ff] rounded-full animate-spin" />
        <span className="text-sm font-medium text-gray-500">{sp.loading}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">{sp.title}</h3>
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving || uploadingAvatar}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <X size={13} />
              {sp.cancelBtn}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || uploadingAvatar}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-[#6c47ff] hover:bg-[#5535dd] rounded-lg disabled:opacity-60"
            >
              {saving ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={13} />
              )}
              {sp.save}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
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
        editing={editing}
        uploading={uploadingAvatar}
        disabled={saving}
        layout="inline"
        uploadFile={uploadAvatarToCloudinary}
        onUpload={(url) => setForm((prev) => ({ ...prev, avatarUrl: url }))}
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
        <div className="space-y-4 bg-gray-50/80 border border-gray-100 rounded-xl p-5">
          <ViewField label={sp.fullName} value={form.fullName} />
          <ViewField label={sp.email} value={form.email} />
          <ViewField label={sp.company} value={form.companyName} />
          <ViewField label={sp.jobTitle} value={form.jobTitle} />
          <ViewField label={sp.phoneNumber} value={form.phoneNumber} />
          <ViewUrlField label={sp.linkedInUrl} url={form.linkedInUrl} />
          <ViewField label={sp.bio} value={form.bio} />
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
            <p className="text-xs text-gray-400 mt-1">{sp.emailReadOnly}</p>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
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
              disabled={saving || uploadingAvatar}
              className={inputCls}
            />
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
        </div>
      )}
    </div>
  );
}
