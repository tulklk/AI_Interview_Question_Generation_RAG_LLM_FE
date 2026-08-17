import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { ProfileSection } from "@/features/settings/components/profile-section";

// Grounded in src/features/settings/components/profile-section.tsx,
// src/shared/components/common/avatar-upload.tsx, src/shared/utils/cloudinary.ts,
// and src/core/i18n/en.ts (`settingsPage.profile`). Maps to Excel sheet
// AUTH007_UpdateProfile. Unit-test rewrite of hr-profile.spec.ts: renders
// ProfileSection directly (it fetches its own data via getCurrentUser, no
// parent/page dependency), mocking the service module boundary.

const HR_USER = {
  fullName: "Nguyen Van QA",
  email: "qa.hr@example.com",
  role: "HR_MANAGER",
  avatarUrl: null,
  hrProfile: {
    fullName: "Nguyen Van QA",
    companyName: "Tech ABC",
    jobTitle: "HR Manager",
    phoneNumber: "0901234567",
    linkedInUrl: "",
    githubUrl: "",
    avatarUrl: "",
    bio: "",
  },
};

vi.mock("@/features/auth/services/user.service", () => ({
  getCurrentUser: vi.fn(),
  updateHrProfile: vi.fn(),
}));

vi.mock("@/shared/utils/cloudinary", async () => {
  const actual = await vi.importActual<typeof import("@/shared/utils/cloudinary")>("@/shared/utils/cloudinary");
  return { ...actual, uploadAvatarToCloudinary: vi.fn(actual.uploadAvatarToCloudinary) };
});

import { getCurrentUser, updateHrProfile } from "@/features/auth/services/user.service";
import { uploadAvatarToCloudinary } from "@/shared/utils/cloudinary";

async function renderEditing() {
  vi.mocked(getCurrentUser).mockResolvedValue(HR_USER as never);
  const user = userEvent.setup();
  renderWithProviders(<ProfileSection />);
  expect(await screen.findByRole("heading", { name: "Profile Information" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Edit Profile" }));
  expect(await screen.findByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  return user;
}

beforeEach(() => {
  vi.mocked(getCurrentUser).mockReset();
  vi.mocked(updateHrProfile).mockReset();
  vi.mocked(uploadAvatarToCloudinary).mockClear();
});

describe("AUTH007 — HR profile", () => {
  test("AUTH007-1: blocks save when full name is cleared to empty", async () => {
    const user = await renderEditing();
    await user.clear(document.getElementById("full-name")!);
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Could not save profile. Please try again.")).toBeInTheDocument();
    expect(updateHrProfile).not.toHaveBeenCalled();
  });

  test("AUTH007-2: invalid LinkedIn URL shows an inline error and disables Save", async () => {
    const user = await renderEditing();
    const linkedin = document.getElementById("linkedin")!;
    await user.type(linkedin, "not-a-url");
    await user.tab();
    expect((await screen.findAllByText("Enter a valid URL (e.g. https://…)"))[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
  });

  test("AUTH007-3: valid edits save successfully", async () => {
    vi.mocked(updateHrProfile).mockResolvedValueOnce(undefined);
    const user = await renderEditing();
    const fullName = document.getElementById("full-name")! as HTMLInputElement;
    await user.clear(fullName);
    await user.type(fullName, "Nguyen Van QA Updated");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Profile saved successfully.")).toBeInTheDocument();
    expect(updateHrProfile).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Nguyen Van QA Updated" })
    );
  });

  test("AUTH007-4: Cancel discards unsaved edits", async () => {
    const user = await renderEditing();
    const fullName = document.getElementById("full-name")! as HTMLInputElement;
    await user.clear(fullName);
    await user.type(fullName, "Some Unsaved Name");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("button", { name: "Edit Profile" })).toBeInTheDocument();
    expect(screen.getByText("Nguyen Van QA", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("Some Unsaved Name")).not.toBeInTheDocument();
  });

  test("AUTH007-5: email field is always read-only", async () => {
    const user = await renderEditing();
    void user;
    const emailInput = document.getElementById("email")!;
    expect(emailInput).toBeDisabled();
    expect(screen.getByText("Email cannot be changed here")).toBeInTheDocument();
  });

  test("AUTH007-6: avatar upload rejects a non-image file type", async () => {
    await renderEditing();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["fake pdf content"], "resume.pdf", { type: "application/pdf" });
    // userEvent.upload() silently no-ops for a file whose type doesn't match
    // the input's `accept` attribute — fire the native change event directly
    // to reach handleFileChange() regardless (a real browser DOES let a user
    // pick a mismatched file via "All Files" in the OS picker).
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(await screen.findByText("Please choose a JPG, PNG, GIF, or WebP image.")).toBeInTheDocument();
  });

  test("AUTH007-7: avatar upload rejects a file over 2MB", async () => {
    const user = await renderEditing();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bigContent = new Uint8Array(3 * 1024 * 1024); // 3MB > the 2MB limit
    const file = new File([bigContent], "big-avatar.png", { type: "image/png" });
    await user.upload(fileInput, file);
    expect(await screen.findByText("Image must be 2MB or smaller.")).toBeInTheDocument();
  });

  test("AUTH007-8: a valid avatar uploads and updates the preview immediately", async () => {
    vi.mocked(uploadAvatarToCloudinary).mockResolvedValueOnce(
      "https://res.cloudinary.com/demo/image/upload/avatar123.png"
    );
    const user = await renderEditing();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "avatar.png", { type: "image/png" });
    await user.upload(fileInput, file);

    // AvatarCircle intentionally renders alt="" (decorative — the candidate's
    // name is always shown as adjacent text, so it'd otherwise be redundant
    // screen-reader noise) — per ARIA, alt="" gives the <img> an implicit
    // role of "presentation", removing it from the a11y tree entirely, so
    // getByRole("img", ...) can never find it. Query the element directly.
    await waitFor(() => {
      const img = document.querySelector("img");
      expect(img).toHaveAttribute("src", expect.stringContaining("avatar123.png"));
    });
  });
});
