"use client";

import { useState } from "react";
import { Eye, EyeOff, Save } from "lucide-react";
import type { AxiosError } from "axios";
import { FormField } from "@/components/ui/form-field";
import { useLanguage } from "@/context/language-context";
import { useToast } from "@/context/toast-context";
import { changePassword } from "@/lib/api/user";
import type { ApiErrorResponse } from "@/types/auth";

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField label={label} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pr-10 px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </FormField>
  );
}

export function SecuritySection() {
  const { t } = useLanguage();
  const sec = t.settingsPage.security;
  const { addToast } = useToast();

  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!current || !newPass || !confirm) {
      addToast("error", sec.saveFailed);
      return;
    }
    if (newPass.length < 8) {
      addToast("error", sec.passwordTooShort);
      return;
    }
    if (newPass !== confirm) {
      addToast("error", sec.passwordMismatch);
      return;
    }

    setSaving(true);
    try {
      await changePassword({
        currentPassword: current,
        newPassword: newPass,
        confirmPassword: confirm,
      });
      setCurrent("");
      setNewPass("");
      setConfirm("");
      addToast("success", sec.saveSuccess);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      addToast("error", axiosErr.response?.data?.message || sec.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-5">{sec.title}</h3>

      <div className="space-y-4">
        <PasswordInput
          id="current-password"
          label={sec.currentPassword}
          value={current}
          onChange={setCurrent}
          placeholder={sec.currentPlaceholder}
          disabled={saving}
        />
        <PasswordInput
          id="new-password"
          label={sec.newPassword}
          value={newPass}
          onChange={setNewPass}
          placeholder={sec.newPlaceholder}
          disabled={saving}
        />
        <PasswordInput
          id="confirm-password"
          label={sec.confirmPassword}
          value={confirm}
          onChange={setConfirm}
          placeholder={sec.confirmPlaceholder}
          disabled={saving}
        />
      </div>

      <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
        <p className="text-xs font-semibold text-indigo-700 mb-1.5">{sec.requirements}</p>
        <ul className="space-y-0.5">
          {[sec.req1, sec.req2, sec.req3].map((req) => (
            <li key={req} className="text-xs text-indigo-600 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
              {req}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
      >
        {saving ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Save size={14} />
        )}
        {sec.save}
      </button>
    </div>
  );
}
