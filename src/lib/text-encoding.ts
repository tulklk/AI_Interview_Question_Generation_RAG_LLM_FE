/** Detect UTF-8 text that was misread as Latin-1 (e.g. "ThÃ nh TÃº"). */
export function looksLikeUtf8Mojibake(value: string): boolean {
  return /Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]/.test(value);
}

/**
 * Repair UTF-8 mojibake caused by decoding UTF-8 bytes as Latin-1.
 * Safe to call on already-correct strings — returns them unchanged.
 */
export function fixUtf8Mojibake(value: string): string {
  if (!value || !looksLikeUtf8Mojibake(value)) return value;

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (decoded && !decoded.includes("\uFFFD") && decoded !== value) {
      return decoded;
    }
  } catch {
    // Not recoverable via Latin-1 → UTF-8 reinterpretation.
  }

  return value;
}

export function sanitizeDisplayName(value: string): string {
  return fixUtf8Mojibake(value.trim());
}
