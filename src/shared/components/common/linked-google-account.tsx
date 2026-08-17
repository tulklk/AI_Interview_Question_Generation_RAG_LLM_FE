import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalDivider, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export interface LinkedGoogleAccountLabels {
  title?: string;
  linkedBadge: string;
  hint: string;
}

interface LinkedGoogleAccountProps {
  linked: boolean;
  email: string;
  labels: LinkedGoogleAccountLabels;
  className?: string;
}

/** Khối read-only: chỉ render khi tài khoản đã liên kết Google. */
export function LinkedGoogleAccount({ linked, email, labels, className }: LinkedGoogleAccountProps) {
  if (!linked) return null;

  return (
    <div className={className}>
      {labels.title ? (
        <p className={cn("text-xs font-medium mb-1.5", portalSubtext)}>{labels.title}</p>
      ) : null}
      <div className={cn("flex items-center gap-3 rounded-xl border px-3.5 py-3", portalDivider)}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <GoogleIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold", portalHeading)}>Google</p>
          <p className={cn("text-xs mt-0.5 truncate", portalSubtext)}>{email}</p>
          <p className={cn("text-[11px] mt-0.5", portalSubtext)}>{labels.hint}</p>
        </div>
        {/* Badge — large, pinned to the right, vertically centred by parent items-center */}
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
          <Check size={15} strokeWidth={2.5} />
          {labels.linkedBadge}
        </span>
      </div>
    </div>
  );
}
