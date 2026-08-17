const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_OAUTH_MESSAGE_SOURCE = "github-oauth-callback";

export interface GithubOAuthCallbackMessage {
  source: typeof GITHUB_OAUTH_MESSAGE_SOURCE;
  code?: string;
  state?: string;
  error?: string;
}

export function getGithubCallbackPath(): string {
  return "/auth/github/callback";
}

function randomState(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Opens the GitHub OAuth authorize page in a popup and resolves with the
 * authorization `code` once the callback page posts it back via `postMessage`.
 */
export function openGithubOAuthPopup(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? "";
  if (!clientId) return Promise.reject(new Error("missing_github_client_id"));

  const state = randomState();
  const redirectUri = `${window.location.origin}${getGithubCallbackPath()}`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
    allow_signup: "true",
  });

  const width = 520;
  const height = 640;
  const left = window.screenX + Math.max((window.outerWidth - width) / 2, 0);
  const top = window.screenY + Math.max((window.outerHeight - height) / 2, 0);
  const popup = window.open(
    `${GITHUB_AUTHORIZE_URL}?${params.toString()}`,
    "github-oauth",
    `width=${width},height=${height},left=${left},top=${top}`
  );

  if (!popup) return Promise.reject(new Error("popup_blocked"));

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    function cleanup() {
      window.removeEventListener("message", handleMessage);
      window.clearInterval(pollTimer);
    }

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as GithubOAuthCallbackMessage | undefined;
      if (data?.source !== GITHUB_OAUTH_MESSAGE_SOURCE || data.state !== state) return;

      settled = true;
      cleanup();
      popup?.close();
      if (data.error || !data.code) {
        reject(new Error(data.error || "oauth_failed"));
      } else {
        resolve(data.code);
      }
    }

    window.addEventListener("message", handleMessage);

    const pollTimer = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        if (!settled) reject(new Error("popup_closed"));
      }
    }, 500);
  });
}
