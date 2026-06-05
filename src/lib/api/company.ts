import { apiClient } from "@/lib/api-client";

export interface CompanyOption {
  id: string;
  name: string;
}

export async function searchCompanies(keyword: string): Promise<CompanyOption[]> {
  const res = await apiClient.get("/api/companies", { params: { keyword } });
  const raw = res.data;
  const list: Record<string, string>[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : [];
  return list.map((c) => ({
    id: String(c.id ?? c.companyId ?? ""),
    name: String(c.name ?? c.companyName ?? ""),
  }));
}
