/**
 * SCRUM-482: chuẩn hóa URL http(s) absolute.
 * Thiếu scheme → prepend https:// (tránh <a href> relative bị browser chèn origin).
 */
export function toAbsoluteHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;

  return `https://${trimmed.replace(/^\/+/, "")}`;
}
