"use client";

/**
 * ScrollReset — mỗi lần load trang bắt đầu ở đầu trang.
 *
 * Next.js 16 / React 19: không render thẻ <script> trong cây component
 * (gây console error và script không chạy lúc hydrate).
 * Dùng useServerInsertedHTML để nhúng script vào HTML SSR ngoài cây client,
 * rồi lặp lại trên client trong useEffect (HMR / navigation).
 */
import { useEffect, useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";

const EARLY_SCRIPT =
  "(function(){try{history.scrollRestoration='manual';}catch(e){}try{window.scrollTo(0,0);}catch(e){}})();";

export function ScrollReset() {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <script
        id="hiregen-scroll-restore"
        dangerouslySetInnerHTML={{ __html: EARLY_SCRIPT }}
      />
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return null;
}
