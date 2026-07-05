"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, Building2, Loader2, AlertCircle, X, RefreshCw, Globe, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt, portalInput } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { listCompanies, createCompany } from "@/features/admin/services/admin-company.service";
import type { Company } from "@/features/admin/services/admin-company.service";

const PAGE_SIZE = 10;

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function CompanyManagement() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const c = t.adminPages.companies;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [creating, setCreating] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rowOffset = (page - 1) * PAGE_SIZE;

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listCompanies({
        keyword: appliedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setCompanies(result.items);
      setTotalCount(result.totalCount);
    } catch {
      setCompanies([]);
      setTotalCount(0);
      setError(c.loadError);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, c.loadError]);

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies]);

  function handleSearch() {
    setAppliedSearch(searchInput.trim());
    setPage(1);
  }

  function openCreate() {
    setNewName("");
    setNameTouched(false);
    setShowCreate(true);
  }

  function closeCreate() {
    setShowCreate(false);
  }

  async function handleCreate() {
    setNameTouched(true);
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCompany(newName.trim());
      addToast("success", c.createSuccess);
      closeCreate();
      setPage(1);
      setAppliedSearch("");
      setSearchInput("");
      await fetchCompanies();
    } catch {
      addToast("error", c.createError);
    } finally {
      setCreating(false);
    }
  }

  const nameError = nameTouched && !newName.trim();

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder={c.filters.searchPlaceholder}
              className={cn(
                "w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
                portalInput
              )}
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            <Search size={14} />
            <span className="hidden sm:inline">Tìm kiếm</span>
          </button>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus size={15} />
          {c.addCompany}
        </button>
      </div>

      {/* Table */}
      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          {/* Scrollable wrapper for wide table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {c.table.no}
                  </th>
                  <th className="w-16 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {c.table.logo}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {c.table.name}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {c.table.website}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 max-w-xs">
                    {c.table.description}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {c.table.createdAt}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Loader2 size={22} className="animate-spin text-primary mx-auto" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle size={22} className="text-red-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                        <button
                          type="button"
                          onClick={() => void fetchCompanies()}
                          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                          <RefreshCw size={12} />
                          Thử lại
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Building2 size={28} className="text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-gray-400 dark:text-gray-500">{c.emptyState}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  companies.map((company, i) => (
                    <tr
                      key={company.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                    >
                      {/* # */}
                      <td className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500 tabular-nums font-medium">
                        {rowOffset + i + 1}
                      </td>

                      {/* Logo */}
                      <td className="px-4 py-4">
                        {company.logoUrl ? (
                          <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="w-9 h-9 rounded-lg object-contain bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
                            <Building2 size={15} className="text-violet-500 dark:text-violet-400" />
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-4">
                        <span className="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                          {company.name}
                        </span>
                      </td>

                      {/* Website */}
                      <td className="px-4 py-4">
                        {company.websiteUrl ? (
                          <a
                            href={company.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Globe size={12} className="shrink-0" />
                            <span className="truncate max-w-35">
                              {company.websiteUrl.replace(/^https?:\/\//, "")}
                            </span>
                            <ExternalLink size={10} className="shrink-0 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-4 py-4 max-w-xs">
                        {company.description ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {company.description}
                          </p>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>

                      {/* Created at */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(company.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!error && totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {totalCount} công ty · Trang {page}/{totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      {showCreate && createPortal(
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeCreate} />
          <div className="relative z-10 w-full max-w-sm animate-fade-up">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
              <div className="h-0.5 bg-linear-to-r from-violet-500 via-purple-500 to-cyan-500" />
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
                      <Building2 size={16} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <h3 className={cn("text-base font-semibold", portalHeadingAlt)}>
                      {c.modal.addTitle}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeCreate}
                    disabled={creating}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-40"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-1.5 mb-6">
                  <label className={cn("text-sm font-medium", portalHeadingAlt)}>
                    {c.modal.nameLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => setNameTouched(true)}
                    placeholder={c.modal.namePlaceholder}
                    className={cn(
                      "w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors",
                      nameError
                        ? "border-red-400 dark:border-red-600 focus:ring-red-200 dark:focus:ring-red-900"
                        : "focus:ring-primary/20 focus:border-primary",
                      portalInput
                    )}
                    onKeyDown={(e) => { if (e.key === "Enter" && !creating) void handleCreate(); }}
                    autoFocus
                  />
                  {nameError && (
                    <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
                      <AlertCircle size={11} />
                      {c.modal.nameRequired}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeCreate}
                    disabled={creating}
                    className={cn(
                      "flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 transition-colors disabled:opacity-50",
                      portalHeadingAlt,
                      "hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    {c.modal.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={creating}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {creating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {c.modal.creating}
                      </>
                    ) : (
                      c.modal.create
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
