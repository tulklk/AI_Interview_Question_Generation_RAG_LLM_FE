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

function extractTotal(raw: unknown, fallback: number): number {
  const root = asRecord(raw);
  if (!root) return fallback;

  const sources = [root, asRecord(root.data)].filter(Boolean) as Record<string, unknown>[];
  for (const src of sources) {
    for (const k of ["totalCount", "TotalCount", "total", "Total", "count", "Count"]) {
      const v = src[k];
      if (typeof v === "number" && v >= 0) return v;
    }
  }
  return fallback;
}

export async function listCompanies(params: ListCompaniesParams = {}): Promise<PaginatedCompanies> {
  const query: Record<string, string | number> = {};
  if (params.keyword?.trim()) query.keyword = params.keyword.trim();
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;

  const res = await apiClient.get("/api/companies", { params: query });
  const rawItems = extractItems(res.data);
  const items = rawItems.map(normalizeCompany).filter((c): c is Company => c !== null);

  return { items, totalCount: extractTotal(res.data, items.length) };
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
