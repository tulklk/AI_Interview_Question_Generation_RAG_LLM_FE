/**
 * Map detectedLanguage từ RAG/BE (vietnamese|english|…) sang nhãn hiển thị UI.
 */
export function formatDetectedLanguage(
  raw: string | null | undefined,
  labels: { vietnamese: string; english: string; unknown: string }
): string {
  const key = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!key) return labels.unknown;
  if (key.includes("viet") || key === "vi" || key === "vn") return labels.vietnamese;
  if (key.includes("eng") || key === "en") return labels.english;
  return raw!.trim();
}

/** Alias — dùng chung sources / job profile panel */
export const formatDetectedLanguageLabel = formatDetectedLanguage;
