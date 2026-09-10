"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/cn";
import { CameraOff, Loader2 } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";

export type PracticeCameraPanelHandle = {
  getVideoElement: () => HTMLVideoElement | null;
  getStream: () => MediaStream | null;
  restart: () => Promise<boolean>;
};

type Props = {
  className?: string;
  onReady?: (ok: boolean, error?: string) => void;
  /** Compact preview during monitoring */
  compact?: boolean;
};

type CameraErrorCode = "permission" | "unavailable" | "generic";

/**
 * Single getUserMedia owner for practice integrity monitoring.
 * AntiCheatManager reuses this video element — no second stream.
 */
export const PracticeCameraPanel = forwardRef<PracticeCameraPanelHandle, Props>(
  function PracticeCameraPanel({ className, onReady, compact }, ref) {
    const { t } = useLanguage();
    const a = t.antiCheat;
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [errorCode, setErrorCode] = useState<CameraErrorCode | null>(null);
    const [rawError, setRawError] = useState<string | null>(null);

    const startCamera = async (): Promise<boolean> => {
      setStatus("loading");
      setErrorCode(null);
      setRawError(null);
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setStatus("ready");
        onReady?.(true);
        return true;
      } catch (err) {
        let code: CameraErrorCode = "unavailable";
        let msg = a.cameraUnavailable;
        if (err instanceof Error) {
          if (err.name === "NotAllowedError") {
            code = "permission";
            msg = a.cameraPermissionDenied;
          } else {
            code = "generic";
            msg = err.message || a.cameraUnavailable;
            setRawError(err.message || null);
          }
        }
        setErrorCode(code);
        setStatus("error");
        onReady?.(false, msg);
        return false;
      }
    };

    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current,
      getStream: () => streamRef.current,
      restart: startCamera,
    }));

    useEffect(() => {
      void startCamera();
      return () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
    }, []);

    const errorLabel =
      errorCode === "permission"
        ? a.cameraPermissionDenied
        : errorCode === "generic" && rawError
          ? rawError
          : errorCode
            ? a.cameraUnavailable
            : a.cameraError;

    return (
      <div className={cn("min-w-0", !compact && "w-full", className)}>
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-gray-200 bg-gray-950 dark:border-gray-700",
            compact ? "h-28 w-40" : "aspect-video w-full"
          )}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className="h-full w-full object-cover scale-x-[-1]"
          />

          {/* Visual-only face guide — does not affect detection */}
          {!compact && status === "ready" && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <div className="h-[54%] w-[36%] max-w-[190px] rounded-[50%] border border-white/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.06)]" />
            </div>
          )}

          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 text-xs text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              {a.startingCamera}
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70 px-3 text-center text-white">
              <CameraOff className="h-5 w-5 text-red-400" />
              <p className="text-[11px] font-medium">{errorLabel}</p>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="mt-1 rounded-md bg-white/15 px-2 py-1 text-[10px] hover:bg-white/25"
              >
                {a.retry}
              </button>
            </div>
          )}
          {status === "ready" && !compact && (
            <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              {a.cameraActive}
            </div>
          )}
          {!compact && status === "ready" && (
            <p className="pointer-events-none absolute bottom-2.5 left-0 right-0 text-center text-[11px] font-medium text-white/85">
              {a.faceGuideHint}
            </p>
          )}
        </div>
      </div>
    );
  }
);
