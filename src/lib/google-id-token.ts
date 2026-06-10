export interface GoogleIdTokenClaims {
  name?: string;
  email?: string;
  picture?: string;
}

/** Decode Google ID token payload for UI prefill only (backend verifies the token). */
export function parseGoogleIdToken(idToken: string): GoogleIdTokenClaims {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return {};
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = atob(padded);
    const claims = JSON.parse(json) as Record<string, unknown>;
    return {
      name: typeof claims.name === "string" ? claims.name : undefined,
      email: typeof claims.email === "string" ? claims.email : undefined,
      picture: typeof claims.picture === "string" ? claims.picture : undefined,
    };
  } catch {
    return {};
  }
}
