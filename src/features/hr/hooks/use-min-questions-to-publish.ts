"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_MIN_QUESTIONS_TO_PUBLISH,
  getHrPlatformFlags,
} from "@/features/hr/services/hr-platform-flags.service";

/** Module cache — tránh N request khi nhiều component mount cùng lúc. */
let cachedMin: number | null = null;
let inflight: Promise<number> | null = null;

async function loadMinQuestionsToPublish(): Promise<number> {
  if (cachedMin != null) return cachedMin;
  if (!inflight) {
    inflight = getHrPlatformFlags()
      .then((f) => {
        cachedMin = f.minQuestionsToPublish;
        return cachedMin;
      })
      .catch(() => DEFAULT_MIN_QUESTIONS_TO_PUBLISH)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Số câu tối thiểu để HR publish — lấy từ Admin platform-settings qua /api/hr/platform-flags.
 * Fallback 10 nếu chưa load / lỗi mạng.
 */
export function useMinQuestionsToPublish(): number {
  const [min, setMin] = useState(
    () => cachedMin ?? DEFAULT_MIN_QUESTIONS_TO_PUBLISH
  );

  useEffect(() => {
    let cancelled = false;
    void loadMinQuestionsToPublish().then((n) => {
      if (!cancelled) setMin(n);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return min;
}
