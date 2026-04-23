"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import type { AdminUser } from "@/types/admin";

interface UserModalProps {
  open: boolean;
  user?: AdminUser | null;
  onClose: () => void;
}

const inputCls =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors bg-white";

const selectCls =
  "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors bg-white appearance-none";

export function UserModal({ open, user, onClose }: UserModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md mx-4 animate-scale-in">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? "Edit User" : "Add New User"}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <FormField label="Full Name" required htmlFor="modal-name">
            <input
              id="modal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Kim"
              className={inputCls}
            />
          </FormField>

          <FormField label="Email Address" required htmlFor="modal-email">
            <input
              id="modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className={inputCls}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role" required htmlFor="modal-role">
              <select
                id="modal-role"
                value={role}
                onChange={(e) => setRole(e.target.value as AdminUser["role"])}
                className={selectCls}
              >
                <option value="Admin">Admin</option>
                <option value="Recruiter">Recruiter</option>
                <option value="Guest">Guest</option>
              </select>
            </FormField>

            <FormField label="Status" required htmlFor="modal-status">
              <select
                id="modal-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as AdminUser["status"])}
                className={selectCls}
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Suspended">Suspended</option>
              </select>
            </FormField>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#6c47ff] hover:bg-[#5535dd] rounded-xl transition-colors"
          >
            <Save size={14} />
            {isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}
