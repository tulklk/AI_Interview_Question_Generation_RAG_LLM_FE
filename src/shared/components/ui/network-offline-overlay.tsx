"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";

type Phase = "online" | "offline" | "reconnecting";

export function NetworkOfflineOverlay() {
  const [phase, setPhase] = useState<Phase>("online");

  useEffect(() => {
    if (!navigator.onLine) setPhase("offline");

    function handleOffline() {
      setPhase("offline");
    }

    function handleOnline() {
      setPhase("reconnecting");
      // Short delay so the "reconnecting" state is visible, then hard-reload
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (phase === "online") return null;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/95 dark:bg-gray-950/95 backdrop-blur-md">
      {phase === "offline" ? (
        <>
          {/* Pulsing ring */}
          <div className="relative mb-6">
            <span className="absolute inset-0 rounded-full bg-red-400/20 dark:bg-red-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/60 flex items-center justify-center">
              <WifiOff size={34} className="text-red-500 dark:text-red-400" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Mất kết nối internet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs leading-relaxed mb-6">
            Vui lòng kiểm tra kết nối Wi-Fi hoặc dữ liệu di động của bạn. Trang
            sẽ tự động tải lại khi có kết nối.
          </p>

          <button
            type="button"
            onClick={() => {
              if (navigator.onLine) {
                setPhase("reconnecting");
                setTimeout(() => window.location.reload(), 1500);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={14} />
            Thử lại
          </button>
        </>
      ) : (
        <AiLoadingSpinner
          text="Đang kết nối lại..."
          subtext="Kết nối đã được khôi phục. Đang tải lại trang..."
        />
      )}
    </div>
  );
}
