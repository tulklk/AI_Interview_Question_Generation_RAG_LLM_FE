"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Database } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { getAdminRagStatus, type RagStatus } from "@/features/knowledge/services/knowledge.service";

function formatCheckedAt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  return d.toLocaleString("vi-VN");
}

export function AdminRagStatus() {
  const [ragStatus, setRagStatus] = useState<RagStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const result = await getAdminRagStatus();
    setRagStatus(result);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const healthy = ragStatus?.isHealthy ?? false;

  const borderCls = ragStatus === null
    ? "border-gray-200 dark:border-gray-700"
    : healthy
    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10"
    : "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10";

  return (
    <div className={cn("hr-glass-card p-5 transition-colors", borderCls)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Database size={14} className="text-primary" />
          </div>
          <span className={cn("text-sm font-bold", portalHeading)}>RAG System Status</span>
        </div>
        <button
          type="button"
          onClick={() => loadStatus(true)}
          disabled={refreshing || loading}
          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          title="Làm mới trạng thái"
        >
          <RefreshCw size={13} className={cn(refreshing && "animate-spin")} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 py-2">
          <RefreshCw size={13} className="text-gray-400 animate-spin" />
          <span className={cn("text-xs", portalSubtext)}>Đang tải trạng thái...</span>
        </div>
      )}

      {/* Error */}
      {!loading && ragStatus === null && (
        <div className="flex items-center gap-2 py-2">
          <XCircle size={14} className="text-red-400" />
          <span className={cn("text-xs", portalSubtext)}>Không thể kết nối tới RAG service.</span>
        </div>
      )}

      {/* Content */}
      {!loading && ragStatus !== null && (
        <div className="space-y-3">
          {/* Overall status */}
          <div className="flex items-center gap-2">
            {healthy
              ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              : <XCircle size={16} className="text-red-500 shrink-0" />}
            <span className={cn("w-2 h-2 rounded-full shrink-0",
              healthy ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            )} />
            <span className={cn("text-sm font-semibold",
              healthy ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {healthy ? "Hoạt động bình thường" : "Có sự cố"}
            </span>
            {ragStatus.responseTimeMs !== undefined && (
              <span className={cn(
                "ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
                "bg-white/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700",
                portalSubtext
              )}>
                {ragStatus.responseTimeMs} ms
              </span>
            )}
          </div>

          {/* Summary */}
          {ragStatus.summary && (
            <p className={cn("text-xs leading-relaxed", portalSubtext)}>{ragStatus.summary}</p>
          )}

          {/* Checks */}
          {ragStatus.checks && ragStatus.checks.length > 0 && (
            <div className="space-y-1.5">
              {ragStatus.checks.map((check, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-white/60 dark:bg-gray-900/50 px-3 py-2 border border-gray-100 dark:border-gray-800">
                  {check.status === "pass"
                    ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                    : check.status === "warn"
                    ? <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    : <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-semibold", portalHeading)}>{check.name}</p>
                    {check.message && (
                      <p className={cn("text-[11px] mt-0.5", portalSubtext)}>{check.message}</p>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                    check.status === "pass"
                      ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                      : check.status === "warn"
                      ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                      : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                  )}>
                    {check.status === "pass" ? "OK" : check.status === "warn" ? "WARN" : "FAIL"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Technical tags + timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-2">
              {ragStatus.technical && Object.entries(ragStatus.technical).map(([k, v]) => (
                <span key={k} className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                  "bg-white/60 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700",
                  portalSubtext
                )}>
                  {k}: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{String(v)}</span>
                </span>
              ))}
            </div>
            <p className={cn("text-[10px]", portalSubtext)}>
              Kiểm tra: {formatCheckedAt(ragStatus.checkedAt)}
            </p>
          </div>

          {/* Service URL */}
          {ragStatus.serviceUrl && (
            <p className={cn("text-[10px] truncate", portalSubtext)}>
              Service: <span className="font-mono">{ragStatus.serviceUrl}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
