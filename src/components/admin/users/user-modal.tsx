"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import type { AdminUser } from "@/types/admin";
import { useLanguage } from "@/context/language-context";

interface UserModalProps {
  open: boolean;
  user?: AdminUser | null;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    name: string;
    email: string;
    role: AdminUser["role"];
    status: AdminUser["status"];
  }) => void;
}

const inputCls =
  "w-full px-3 py-2.5 text-xs font-normal text-[#111827] border border-[#e5e7eb] rounded-lg bg-white min-h-[38px] focus:outline-none focus:border-[#6c47ff] focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)] transition-colors placeholder:text-[#9ca3af]";

const selectCls =
  "w-full px-3 py-2.5 text-xs font-normal text-[#111827] border border-[#e5e7eb] rounded-lg bg-white min-h-[38px] focus:outline-none focus:border-[#6c47ff] focus:ring-[3px] focus:ring-[rgba(108,71,255,0.1)] transition-colors appearance-none";

export function UserModal({ open, user, onClose, onSave }: UserModalProps) {
  const { t } = useLanguage();
  const m = t.adminPages.users.modal;
  const roles = t.adminPages.users.roles;
  const statusLabels = t.adminPages.users.statusLabels;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminUser["role"]>("Recruiter");
  const [status, setStatus] = useState<AdminUser["status"]>("Active");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setStatus(user.status);
    } else {
      setName("");
      setEmail("");
      setRole("Recruiter");
      setStatus("Active");
    }
  }, [user, open]);

  if (!open) return null;

  const isEdit = !!user;

  function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;
    onSave({
      id: user?.id,
      name: trimmedName,
      email: trimmedEmail,
      role,
      status,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative mx-4 w-full max-w-md rounded-xl border border-[#e5e7eb] bg-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] animate-scale-in"
        role="dialog"
        aria-modal
        aria-labelledby="user-modal-title"
      >
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 pb-4 pt-5">
          <h2 id="user-modal-title" className="text-base font-bold text-[#111827]">
            {isEdit ? m.editTitle : m.addTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-[#f5f7fb] hover:text-gray-600"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <FormField label={m.fullName} required htmlFor="modal-name">
            <input
              id="modal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={m.namePlaceholder}
              className={inputCls}
            />
          </FormField>

          <FormField label={m.emailLabel} required htmlFor="modal-email">
            <input
              id="modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={m.emailPlaceholder}
              className={inputCls}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={m.role} required htmlFor="modal-role">
              <select
                id="modal-role"
                value={role}
                onChange={(e) => setRole(e.target.value as AdminUser["role"])}
                className={selectCls}
              >
                <option value="Admin">{roles.Admin}</option>
                <option value="Recruiter">{roles.Recruiter}</option>
                <option value="Guest">{roles.Guest}</option>
              </select>
            </FormField>

            <FormField label={m.status} required htmlFor="modal-status">
              <select
                id="modal-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as AdminUser["status"])}
                className={selectCls}
              >
                <option value="Active">{statusLabels.Active}</option>
                <option value="Pending">{statusLabels.Pending}</option>
                <option value="Suspended">{statusLabels.Suspended}</option>
              </select>
            </FormField>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#f5f7fb]"
          >
            {m.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex h-9 min-h-9 items-center gap-2 rounded-lg bg-[#6c47ff] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a3dd9] active:bg-[#4b2fbf]"
          >
            <Save size={14} />
            {isEdit ? m.save : m.create}
          </button>
        </div>
      </div>
    </div>
  );
}
