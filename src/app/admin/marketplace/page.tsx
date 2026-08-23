"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { AdminAppShell } from "@/features/admin/components/layout/admin-app-shell";
import { AdminRouteGuard } from "@/features/admin/components/guards/admin-route-guard";
import { MarketplaceStats } from "@/features/admin/components/marketplace/marketplace-stats";
import { AdminMarketplaceCardGrid } from "@/features/admin/components/marketplace/marketplace-card-grid";
import { MarketplaceDetailPanel } from "@/features/admin/components/marketplace/marketplace-detail-panel";
import {
  getMarketplaceQuestionSetById,
  getMarketplaceStats,
  listMarketplaceQuestionSets,
  pinMarketplaceQuestionSet,
  unpinMarketplaceQuestionSet,
  unpublishMarketplaceQuestionSet,
  type AdminMarketplaceDetail,
  type AdminMarketplaceListItem,
  type AdminMarketplaceStats,
  type MarketplaceSortBy,
} from "@/features/admin/services/admin-marketplace.service";
import { withAbandonedToast } from "@/features/interview/services/interview.service";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalInput, portalSubtextAlt, portalHeadingAlt } from "@/shared/utils/portal-ui";
import { AdminPageHeader } from "@/features/admin/components/layout/admin-page-header";

const PAGE_SIZE = 9;
const SEARCH_DEBOUNCE_MS = 300;

export default function AdminMarketplacePage() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const m = t.adminPages.marketplace;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<MarketplaceSortBy>("featured");

  const [items, setItems] = useState<AdminMarketplaceListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminMarketplaceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AdminMarketplaceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<AdminMarketplaceListItem | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getMarketplaceStats());
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listMarketplaceQuestionSets({
        page,
        pageSize: PAGE_SIZE,
        keyword: debouncedSearch || undefined,
        sortBy,
      });
      setItems(result.items);
      setTotalCount(result.totalCount);
    } catch {
      setItems([]);
      setTotalCount(0);
      addToast("error", m.loadError);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, sortBy, addToast, m.loadError]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      setDetail(await getMarketplaceQuestionSetById(id));
    } catch {
      setDetail(null);
      setDetailError(m.detailLoadError);
    } finally {
      setDetailLoading(false);
    }
  }, [m.detailLoadError]);

  function handleSelect(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
    void loadDetail(id);
  }

  async function handleTogglePin(item: AdminMarketplaceListItem) {
    setPinningId(item.id);
    try {
      if (item.isPinned) await unpinMarketplaceQuestionSet(item.id);
      else await pinMarketplaceQuestionSet(item.id);
      addToast("success", item.isPinned ? m.unpinSuccess : m.pinSuccess);
      await Promise.all([fetchList(), fetchStats()]);
      if (detailOpen && selectedId === item.id) await loadDetail(item.id);
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : m.pinError);
    } finally {
      setPinningId(null);
    }
  }

  function handleUnpublish(item: AdminMarketplaceListItem) {
    setConfirmItem(item);
  }

  async function confirmUnpublish() {
    if (!confirmItem) return;
    const item = confirmItem;
    setUnpublishingId(item.id);
    try {
      const abandoned = await unpublishMarketplaceQuestionSet(item.id);
      addToast("success", withAbandonedToast(m.unpublishSuccess, abandoned));
      await Promise.all([fetchList(), fetchStats()]);
      if (selectedId === item.id) {
        setDetailOpen(false);
        setSelectedId(null);
        setDetail(null);
        setDetailError(null);
      }
      setConfirmItem(null);
    } catch (err) {
      addToast("error", err instanceof Error && err.message ? err.message : m.unpublishFailed);
    } finally {
      setUnpublishingId(null);
    }
  }

  async function handleDetailTogglePin() {
    if (!detail) return;
    await handleTogglePin(detail);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <AdminRouteGuard>
      <AdminAppShell pageTitle={m.heading}>
        <div className="space-y-5">
          <AdminPageHeader
            heading={m.heading}
            subtext={m.subtext}
            icon={ShoppingBag}
            iconGradient="bg-linear-to-br from-pink-500 to-rose-500"
            accentGradient="bg-linear-to-r from-pink-500 via-rose-400 to-primary"
            cardGradient="bg-linear-to-r from-pink-50 via-white to-violet-50 dark:from-pink-950/10 dark:via-gray-900 dark:to-violet-950/10"
            cardBorder="border-pink-100 dark:border-pink-900/30"
            iconShadow="shadow-pink-200 dark:shadow-pink-900/30"
          />

          <MarketplaceStats
            stats={stats}
            loading={statsLoading}
            labels={{
              totalPublished: m.stats.totalPublished,
              practicesLast7Days: m.stats.practicesLast7Days,
              pinnedCount: m.stats.pinnedCount,
              topHrs: m.stats.topHrs,
              topSkills: m.stats.topSkills,
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={m.filters.searchPlaceholder}
                className={cn(portalInput, "w-full rounded-lg py-2.5 pl-9 pr-3 text-sm")}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as MarketplaceSortBy)}
              className={cn(portalInput, "rounded-lg px-3 py-2.5 text-sm")}
            >
              <option value="featured">{m.filters.sortFeatured}</option>
              <option value="newest">{m.filters.sortNewest}</option>
              <option value="most_practiced">{m.filters.sortMostPracticed}</option>
              <option value="highest_rated">{m.filters.sortHighestRated}</option>
            </select>
          </div>

          <AdminMarketplaceCardGrid
            items={items}
            loading={loading}
            selectedId={selectedId}
            pinningId={pinningId}
            unpublishingId={unpublishingId}
            emptyLabel={m.emptyState}
            setsFoundLabel={m.setsFound}
            totalCount={totalCount}
            onView={handleSelect}
            onTogglePin={handleTogglePin}
            onUnpublish={handleUnpublish}
            cardLabels={{
              badgePinned: m.badgePinned,
              badgeTrending: m.badgeTrending,
              questions: m.questionsUnit,
              estimatedTimePrefix: m.estimatedTimePrefix,
              attempts: m.attemptsUnit,
              ratingTooltip: m.ratingTooltip,
              viewDetail: m.view,
              pin: m.pin,
              unpin: m.unpin,
              unpublish: m.unpublish,
              hrPrefix: m.hrPrefix,
            }}
          />

          <div className="flex items-center justify-between gap-3 text-sm">
            <p className={portalSubtextAlt}>
              {m.pagination.showing
                .replace("{{from}}", String(totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1))
                .replace("{{to}}", String(Math.min(page * PAGE_SIZE, totalCount)))
                .replace("{{total}}", String(totalCount))}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                {m.pagination.prev}
              </button>
              <span className={cn("tabular-nums text-xs", portalSubtextAlt)}>
                {page}/{totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                {m.pagination.next}
              </button>
            </div>
          </div>
        </div>

        <MarketplaceDetailPanel
          open={detailOpen}
          detail={detail}
          loading={detailLoading}
          error={detailError}
          pinning={pinningId === selectedId}
          unpublishing={unpublishingId === selectedId}
          onClose={() => setDetailOpen(false)}
          onTogglePin={handleDetailTogglePin}
          onUnpublish={() => {
            if (detail) handleUnpublish(detail);
          }}
          onRetry={() => selectedId && void loadDetail(selectedId)}
          labels={{
            title: m.detailTitle,
            close: m.close,
            hr: m.table.hr,
            company: m.table.company,
            attempts: m.table.attempts,
            unique: m.table.unique,
            rating: m.table.rating,
            questions: m.detail.questions,
            practitioners: m.detail.practitioners,
            pin: m.pin,
            unpin: m.unpin,
            unpublish: m.unpublish,
            emptyPractitioners: m.detail.emptyPractitioners,
            retry: m.retry,
          }}
        />

        <ConfirmDialog
          open={confirmItem !== null}
          title={m.unpublishConfirmTitle}
          message={m.unpublishConfirmMessage}
          confirmLabel={m.unpublishConfirmLabel}
          cancelLabel={m.cancel}
          variant="danger"
          loading={unpublishingId !== null}
          onConfirm={() => void confirmUnpublish()}
          onCancel={() => {
            if (unpublishingId !== null) return;
            setConfirmItem(null);
          }}
        />
      </AdminAppShell>
    </AdminRouteGuard>
  );
}
