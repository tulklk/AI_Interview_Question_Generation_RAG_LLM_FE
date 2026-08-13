import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { adminCompanyServiceMockFactory } from "./candidate-service-mocks";
import { renderWithProviders } from "./test-utils";
import CompanyManagementPage from "@/app/admin/companies/page";

// Grounded in src/app/admin/companies/page.tsx and
// src/features/admin/components/companies/company-management.tsx — Admin's
// Company Management page (list/search, create — single & bulk —, edit,
// delete). No prior automated coverage existed. AdminRouteGuard/AdminAppShell
// are stubbed to pass-through (already covered by admin-access-control.test.tsx),
// mirroring admin-manage-users.test.tsx's established pattern. Mocks
// admin-company.service at the module boundary.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/admin/components/guards/admin-route-guard", () => ({
  AdminRouteGuard: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/features/admin/components/layout/admin-app-shell", () => ({
  AdminAppShell: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/shared/utils/cloudinary", () => ({
  uploadLogoToCloudinary: vi.fn(),
  uploadAvatarToCloudinary: vi.fn(),
  AvatarUploadError: class AvatarUploadError extends Error {},
}));

vi.mock("@/features/admin/services/admin-company.service", async () => {
  const mod = await import("./candidate-service-mocks");
  return mod.adminCompanyServiceMockFactory();
});

import * as companyApiTyped from "@/features/admin/services/admin-company.service";
const companyApi = companyApiTyped as unknown as ReturnType<typeof adminCompanyServiceMockFactory>;

function company(overrides: Record<string, unknown> = {}) {
  return {
    id: "co-1",
    name: "Acme Corp",
    logoUrl: null,
    websiteUrl: "https://acme.example.com",
    description: "A widget company",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  companyApi.listCompanies.mockReset();
  companyApi.createCompany.mockReset();
  companyApi.createCompaniesBulk.mockReset();
  companyApi.updateCompany.mockReset();
  companyApi.deleteCompany.mockReset();
});

describe("Admin Companies — listing", () => {
  test("ACOMP-1: lists companies from listCompanies", async () => {
    companyApi.listCompanies.mockResolvedValue({ items: [company()], totalCount: 1 } as never);
    renderWithProviders(<CompanyManagementPage />);

    expect(await screen.findByText("Acme Corp", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  test("ACOMP-2: pressing Enter in the search box re-fetches with that keyword", async () => {
    companyApi.listCompanies.mockResolvedValue({ items: [company()], totalCount: 1 } as never);
    const user = userEvent.setup();
    renderWithProviders(<CompanyManagementPage />);
    await screen.findByText("Acme Corp", {}, { timeout: 10000 });

    await user.type(screen.getByPlaceholderText("Search by company name..."), "Acme{Enter}");

    await vi.waitFor(() =>
      expect(companyApi.listCompanies).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "Acme" }))
    );
  });

  test("ACOMP-3: no companies shows the empty state", async () => {
    companyApi.listCompanies.mockResolvedValue({ items: [], totalCount: 0 } as never);
    renderWithProviders(<CompanyManagementPage />);

    expect(await screen.findByText("No companies found.", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  test("ACOMP-4: a load failure shows Retry, and Retry re-fetches", async () => {
    companyApi.listCompanies.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    renderWithProviders(<CompanyManagementPage />);

    const retryBtn = await screen.findByRole("button", { name: /Thử lại/ }, { timeout: 10000 });
    companyApi.listCompanies.mockResolvedValue({ items: [company()], totalCount: 1 } as never);
    await user.click(retryBtn);

    expect(await screen.findByText("Acme Corp", {}, { timeout: 10000 })).toBeInTheDocument();
  });
});

describe("Admin Companies — create, edit, delete", () => {
  test("ACOMP-5: creating a single company calls createCompany with the trimmed payload", async () => {
    companyApi.listCompanies.mockResolvedValue({ items: [], totalCount: 0 } as never);
    companyApi.createCompany.mockResolvedValue(company() as never);
    const user = userEvent.setup();
    renderWithProviders(<CompanyManagementPage />);
    await screen.findByText("No companies found.", {}, { timeout: 10000 });

    await user.click(screen.getByRole("button", { name: "Add Company" }));
    const dialog = await screen.findByText("Add New Company");
    const form = dialog.closest("div.p-6") as HTMLElement;
    await user.type(within(form).getByPlaceholderText("e.g. Acme Corporation"), "  New Co  ");

    companyApi.listCompanies.mockResolvedValue({ items: [company({ name: "New Co" })], totalCount: 1 } as never);
    await user.click(within(form).getByRole("button", { name: "Create Company" }));

    await vi.waitFor(() =>
      expect(companyApi.createCompany).toHaveBeenCalledWith(expect.objectContaining({ name: "New Co" }))
    );
    expect(await screen.findByText("Company created successfully.")).toBeInTheDocument();
  });

  test("ACOMP-6: editing a company's name calls updateCompany", async () => {
    companyApi.listCompanies.mockResolvedValue({ items: [company()], totalCount: 1 } as never);
    companyApi.updateCompany.mockResolvedValue(company({ name: "Acme Corp Renamed" }) as never);
    const user = userEvent.setup();
    renderWithProviders(<CompanyManagementPage />);
    await screen.findByText("Acme Corp", {}, { timeout: 10000 });

    await user.click(screen.getByTitle("Edit Company"));
    const nameInput = await screen.findByDisplayValue("Acme Corp");
    await user.clear(nameInput);
    await user.type(nameInput, "Acme Corp Renamed");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await vi.waitFor(() =>
      expect(companyApi.updateCompany).toHaveBeenCalledWith("co-1", expect.objectContaining({ name: "Acme Corp Renamed" }))
    );
    expect(await screen.findByText("Company updated successfully.")).toBeInTheDocument();
  });

  test("ACOMP-7: deleting a company asks for confirmation before calling deleteCompany", async () => {
    companyApi.listCompanies.mockResolvedValue({ items: [company()], totalCount: 1 } as never);
    companyApi.deleteCompany.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderWithProviders(<CompanyManagementPage />);
    await screen.findByText("Acme Corp", {}, { timeout: 10000 });

    await user.click(screen.getByTitle("Delete Company"));
    expect(await screen.findByText("Are you sure you want to delete", { exact: false })).toBeInTheDocument();
    expect(companyApi.deleteCompany).not.toHaveBeenCalled();

    const deleteButtons = await screen.findAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[deleteButtons.length - 1]);

    await vi.waitFor(() => expect(companyApi.deleteCompany).toHaveBeenCalledWith("co-1"));
    expect(await screen.findByText("Company deleted successfully.")).toBeInTheDocument();
  });
});
