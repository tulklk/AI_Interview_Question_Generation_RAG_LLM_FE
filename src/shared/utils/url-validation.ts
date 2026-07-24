export function isValidUrl(val: string): boolean {
  if (!val.trim()) return true;
  try {
    const url = new URL(val);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
