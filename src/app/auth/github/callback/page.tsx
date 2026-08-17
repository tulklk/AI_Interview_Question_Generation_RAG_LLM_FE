"use client";

import { useEffect } from "react";
import type { GithubOAuthCallbackMessage } from "@/features/auth/utils/github-oauth-popup";

/**
 * GitHub redirects here after the user authorizes/denies the app. This page
 * only relays `code`/`state`/`error` back to the opener window (the popup
 * launched by openGithubOAuthPopup) and then closes itself.
 */
export default function GithubOAuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message: GithubOAuthCallbackMessage = {
      source: "github-oauth-callback",
      code: params.get("code") ?? undefined,
      state: params.get("state") ?? undefined,
      error: params.get("error_description") ?? params.get("error") ?? undefined,
    };

    if (window.opener) {
      window.opener.postMessage(message, window.location.origin);
    }
    window.close();
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-gray-950">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
    </div>
  );
}
