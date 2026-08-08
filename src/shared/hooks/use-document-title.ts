"use client";

import { useEffect } from "react";

const BRAND = "HireGen AI";

/**
 * Đồng bộ tiêu đề tab trình duyệt với trang đang mở.
 * Các page đều là client component nên không export được `metadata` của Next.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const trimmed = title.trim();
    document.title = trimmed ? `${trimmed} · ${BRAND}` : BRAND;
  }, [title]);
}
