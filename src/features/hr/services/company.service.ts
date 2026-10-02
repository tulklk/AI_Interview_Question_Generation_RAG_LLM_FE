import { apiClient } from "@/core/api/http-client";

export interface CompanyOption {
  id: string;
  name: string;
  /** Company website URL or domain — used to derive a Clearbit logo */
  website?: string;
  /** Direct logo URL when provided by the API */
  logoUrl?: string;
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
}

/** Lấy mảng company từ nhiều dạng envelope BE (data / items / raw array). */
function extractCompanyList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const root = asRecord(raw);
  if (!root) return [];

  const data = root.data;
  if (Array.isArray(data)) return data;

  const nested = asRecord(data);
  if (nested) {
    for (const key of ["items", "Items", "companies", "Companies", "results", "Results"]) {
      if (Array.isArray(nested[key])) return nested[key] as unknown[];
    }
  }

  for (const key of ["items", "Items", "companies", "Companies", "results", "Results"]) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }

  return [];
}

function mapCompany(c: unknown): CompanyOption | null {
  const src = asRecord(c);
  if (!src) return null;
  const id = String(src.id ?? src.companyId ?? src.Id ?? src.CompanyId ?? "").trim();
  const name = String(src.name ?? src.companyName ?? src.Name ?? src.CompanyName ?? "").trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    website:
      (src.website as string | undefined) ??
      (src.domain as string | undefined) ??
      (src.websiteUrl as string | undefined) ??
      (src.WebsiteUrl as string | undefined),
    logoUrl:
      (src.logoUrl as string | undefined) ??
      (src.LogoUrl as string | undefined) ??
      (src.logo as string | undefined) ??
      (src.avatarUrl as string | undefined) ??
      (src.imageUrl as string | undefined),
  };
}

/**
 * Tìm / liệt kê công ty từ GET /api/companies.
 * keyword rỗng hoặc bỏ qua → BE trả danh sách active (giới hạn 50).
 */
export async function searchCompanies(keyword?: string): Promise<CompanyOption[]> {
  const trimmed = keyword?.trim() ?? "";
  // Không gửi keyword rỗng — một số proxy/config bỏ qua param trống gây response lệch
  const res = await apiClient.get("/api/companies", {
    params: trimmed ? { keyword: trimmed } : undefined,
  });
  return extractCompanyList(res.data)
    .map(mapCompany)
    .filter((c): c is CompanyOption => c !== null);
}
