"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminDashboardStats,
  type AdminDashboardStats,
} from "@/features/admin/services/admin-dashboard.service";

export interface AdminDashboardState {
  data: AdminDashboardStats | null;
  loading: boolean;
  error: boolean;
  lastFetched: Date | null;
  reload: () => void;
}

export function useAdminDashboard(): AdminDashboardState {
  const [data, setData] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchAdminDashboardStats()
      .then((stats) => {
        if (cancelled) return;
        setData(stats);
        setLastFetched(new Date());
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { data, loading, error, lastFetched, reload };
}
