import { apiClient } from "@/core/api/http-client";

export interface CompanyOption {
  id: string;
  name: string;
  /** Company website URL or domain — used to derive a Clearbit logo */
  website?: string;
  /** Direct logo URL when provided by the API */
  logoUrl?: string;
}

export async function searchCompanies(keyword: string): Promise<CompanyOption[]> {
  const res = await apiClient.get("/api/companies", { params: { keyword } });
  const raw = res.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  return list.map((c) => ({
    id: String(c.id ?? c.companyId ?? ""),
    name: String(c.name ?? c.companyName ?? ""),
    website: c.website ?? c.domain ?? c.websiteUrl ?? undefined,
    logoUrl: c.logoUrl ?? c.logo ?? c.avatarUrl ?? c.imageUrl ?? undefined,
  }));
}
