import { sanitizeDisplayName } from "@/lib/text-encoding";

export interface GoogleIdTokenClaims {
  name?: string;
  email?: string;
  picture?: string;
}

/** atob() only handles Latin-1; JWT payloads use UTF-8 (e.g. Vietnamese names). */
function decodeBase64UrlUtf8(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

/** Decode Google ID token payload for UI prefill only (backend verifies the token). */
export function parseGoogleIdToken(idToken: string): GoogleIdTokenClaims {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return {};
    const json = decodeBase64UrlUtf8(parts[1]);
    const claims = JSON.parse(json) as Record<string, unknown>;
    return {
      name: typeof claims.name === "string" ? sanitizeDisplayName(claims.name) : undefined,
      email: typeof claims.email === "string" ? claims.email : undefined,
      picture: typeof claims.picture === "string" ? claims.picture : undefined,
    };
  } catch {
    return {};
  }
}
