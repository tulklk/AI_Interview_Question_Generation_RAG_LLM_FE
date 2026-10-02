import { apiClient } from "@/core/api/http-client";

export interface Company {
  id: string;
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string;
  description?: string;
  createdAt?: string;
  userCount?: number;
}

export interface ListCompaniesParams {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedCompanies {
  items: Company[];
  totalCount: number;
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickOptional(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
  }
  return undefined;
}

function normalizeCompany(raw: unknown): Company | null {
  const root = asRecord(raw);
  if (!root) return null;
  const src = asRecord(root.data) ?? root;

  const id = pickString(src, "id", "Id", "companyId", "CompanyId");
  const name = pickString(src, "name", "Name", "companyName", "CompanyName");
  if (!id && !name) return null;

  const logoRaw = src.logoUrl ?? src.LogoUrl ?? src.logo_url;
  return {
    id: id || name,
    name: name || id,
    logoUrl: typeof logoRaw === "string" ? logoRaw : logoRaw === null ? null : undefined,
    websiteUrl: pickOptional(src, "websiteUrl", "WebsiteUrl", "website_url", "website"),
    description: pickOptional(src, "description", "Description"),
    createdAt: pickOptional(src, "createdAt", "CreatedAt", "createdDate", "CreatedDate"),
    userCount: pickNumber(src, "userCount", "UserCount", "memberCount", "MemberCount"),
  };
}

function extractItems(raw: unknown): unknown[] {
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

export async function listCompanies(params: ListCompaniesParams = {}): Promise<PaginatedCompanies> {
  const keyword = params.keyword?.trim() || undefined;
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);

  // Ưu tiên admin endpoint (SCRUM-480). Azure hiện chưa deploy → 404 thì fallback public /api/companies.
  try {
    const query: Record<string, string | number> = { page, pageSize };
    if (keyword) query.keyword = keyword;
    const res = await apiClient.get("/api/admin/companies", { params: query });
    const rawItems = extractItems(res.data);
    const items = rawItems.map(normalizeCompany).filter((c): c is Company => c !== null);
    const root = asRecord(res.data);
    const nested = asRecord(root?.data);
    const sources = [root, nested].filter(Boolean) as Record<string, unknown>[];
    let totalCount = items.length;
    for (const src of sources) {
      for (const k of ["totalCount", "TotalCount", "total", "Total"]) {
        const v = src[k];
        if (typeof v === "number" && v >= 0) {
          totalCount = v;
          break;
        }
      }
    }
    return { items, totalCount };
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status !== 404) throw err;
  }

  const res = await apiClient.get("/api/companies", {
    params: keyword ? { keyword } : undefined,
  });
  const all = extractItems(res.data)
    .map(normalizeCompany)
    .filter((c): c is Company => c !== null);
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), totalCount: all.length };
}

export interface CreateCompanyPayload {
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
}

export async function createCompany(payload: CreateCompanyPayload): Promise<Company> {
  const res = await apiClient.post("/api/companies", payload);
  const company = normalizeCompany(res.data);
  if (!company) throw new Error("Invalid response from create company");
  return company;
}

/** All-or-nothing: if any entry fails validation (incl. duplicate names within the list), the BE creates none of them. Max 50 per call. */
export async function createCompaniesBulk(companies: CreateCompanyPayload[]): Promise<Company[]> {
  const res = await apiClient.post("/api/companies/bulk", { companies });
  const items = extractItems(res.data);
  return items.map(normalizeCompany).filter((c): c is Company => c !== null);
}

export async function getCompanyById(id: string): Promise<Company> {
  const res = await apiClient.get(`/api/companies/${id}`);
  const company = normalizeCompany(res.data);
  if (!company) throw new Error("Invalid response from get company");
  return company;
}

export interface UpdateCompanyPayload {
  name?: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
}

export async function updateCompany(id: string, payload: UpdateCompanyPayload): Promise<Company> {
  const res = await apiClient.put(`/api/companies/${id}`, payload);
  const company = normalizeCompany(res.data);
  if (!company) throw new Error("Invalid response from update company");
  return company;
}

export async function deleteCompany(id: string): Promise<void> {
  await apiClient.delete(`/api/companies/${id}`);
}
