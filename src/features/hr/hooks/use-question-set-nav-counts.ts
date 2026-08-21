"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { listHistoryQuestionSets } from "@/features/hr/services/hr-history.service";

export interface QuestionSetNavCounts {
  all: number;
  draft: number;
  published: number;
  bookmarked: number;
}

const EMPTY: QuestionSetNavCounts = {
  all: 0,
  draft: 0,
  published: 0,
  bookmarked: 0,
};

/** Client-side counts for Bộ câu hỏi sidebar submenu. */
export function useQuestionSetNavCounts(enabled: boolean): QuestionSetNavCounts {
  const pathname = usePathname();
  const [counts, setCounts] = useState<QuestionSetNavCounts>(EMPTY);

  const reload = useCallback(async () => {
    try {
      const items = await listHistoryQuestionSets();
      setCounts({
        all: items.length,
        draft: items.filter((x) => x.status === "DRAFT").length,
        published: items.filter((x) => x.status === "PUBLISHED").length,
        bookmarked: items.filter((x) => x.isBookmarked).length,
      });
    } catch {
      /* keep last known counts */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload, pathname]);

  useEffect(() => {
    if (!enabled) return;
    function onFocus() {
      void reload();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, reload]);

  return counts;
}
