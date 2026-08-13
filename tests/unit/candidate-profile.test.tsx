import { describe, test, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { renderCandidate } from "./candidate-test-utils";
import { CandidateProfile } from "@/features/candidate/components/profile/candidate-profile";
import type { CurrentUser } from "@/shared/types/user";
import type { CvInfo } from "@/features/candidate/services/candidate-cv.service";

// Grounded in src/features/candidate/components/profile/candidate-profile.tsx —
// the Candidate "My Profile" page (view/edit form, stats, CV management). No
// prior automated coverage existed. Renders <CandidateProfile> via
// renderCandidate, mocking the real service calls it makes directly
// (getCurrentUser/updateCandidateProfile, getCv/uploadCv/deleteCv,
// getPracticeStats/listCompletedSessions) plus getDailyActivity (the
// gamification activity feed behind the contribution heatmap). The
// Gamification-specific sub-widgets (AchievementGrid, GamificationProgressCard)
// are mocked to lightweight placeholders — they belong to the separate
// Gamification testing task, not this one.
//
// NOTE: the CV card renders TWICE — a preview panel in the left column and a
// full management panel in the right column — both showing the same "Resume
// / CV" title and (when empty) the same "Upload CV" button, and BOTH wired to
// the exact same hidden file input ref, so clicking either upload trigger is
// equivalent. Queries below use getAllByText/getAllByRole()[0] for those.

vi.mock("@/features/auth/services/user.service", () => ({
  getCurrentUser: vi.fn(),
  updateCandidateProfile: vi.fn(),
}));

vi.mock("@/features/candidate/services/candidate-cv.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/candidate/services/candidate-cv.service")>();
  return { ...actual, getCv: vi.fn(), uploadCv: vi.fn(), deleteCv: vi.fn() };
});

vi.mock("@/features/candidate/services/practice-session.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/candidate/services/practice-session.service")>();
  return { ...actual, getPracticeStats: vi.fn(), listCompletedSessions: vi.fn() };
});

vi.mock("@/features/gamification/api/gamification-api", () => ({
  getDailyActivity: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/gamification/components/achievement-grid", () => ({
  AchievementGrid: () => <div>[AchievementGrid]</div>,
}));

vi.mock("@/features/gamification/components/gamification-progress-card", () => ({
  GamificationProgressCard: () => <div>[GamificationProgressCard]</div>,
}));

vi.mock("@/shared/utils/cloudinary", () => ({
  uploadAvatarToCloudinary: vi.fn(),
}));

import * as userApiTyped from "@/features/auth/services/user.service";
import * as cvApiTyped from "@/features/candidate/services/candidate-cv.service";
import * as practiceApiTyped from "@/features/candidate/services/practice-session.service";

const userApi = userApiTyped as unknown as {
  getCurrentUser: ReturnType<typeof vi.fn>;
  updateCandidateProfile: ReturnType<typeof vi.fn>;
};
const cvApi = cvApiTyped as unknown as {
  getCv: ReturnType<typeof vi.fn>;
  uploadCv: ReturnType<typeof vi.fn>;
  deleteCv: ReturnType<typeof vi.fn>;
};
const practiceApi = practiceApiTyped as unknown as {
  getPracticeStats: ReturnType<typeof vi.fn>;
  listCompletedSessions: ReturnType<typeof vi.fn>;
};

function currentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    fullName: "Nguyen Van A",
    email: "a@example.com",
    candidateProfile: {
      fullName: "Nguyen Van A",
      targetRole: "Backend Developer",
      seniorityLevel: "Mid",
      techStack: ["Node.js", "SQL"],
      phoneNumber: "0900000000",
      linkedInUrl: "",
      githubUrl: "",
      bio: "",
      avatarUrl: null,
    },
    ...overrides,
  };
}

function cvInfo(overrides: Partial<CvInfo> = {}): CvInfo {
  return {
    fileName: "resume.pdf",
    skills: [],
    summary: null,
    techStack: [],
    parsedAt: null,
    uploadedAt: new Date().toISOString(),
    downloadUrl: "https://files.example.com/resume.pdf",
    ...overrides,
  };
}

async function findFirstText(text: string) {
  return (await screen.findAllByText(text, {}, { timeout: 10000 }))[0];
}

beforeEach(() => {
  userApi.getCurrentUser.mockReset();
  userApi.updateCandidateProfile.mockReset();
  cvApi.getCv.mockReset();
  cvApi.uploadCv.mockReset();
  cvApi.deleteCv.mockReset();
  practiceApi.getPracticeStats.mockReset();
  practiceApi.listCompletedSessions.mockReset();

  userApi.getCurrentUser.mockResolvedValue(currentUser());
  cvApi.getCv.mockResolvedValue(null);
  practiceApi.getPracticeStats.mockResolvedValue({
    totalSessions: 4,
    averageScore: 81,
    bestScore: 95,
    latestScore: 81,
    totalDurationMinutes: 90,
  });
  practiceApi.listCompletedSessions.mockResolvedValue({ items: [], totalCount: 0 });
});

describe("Candidate Profile — view mode", () => {
  test(
    "PROF-1: shows the loaded profile info and practice stats",
    async () => {
      renderCandidate(<CandidateProfile />);

      expect(await findFirstText("Backend Developer")).toBeInTheDocument();
      expect(await findFirstText("4")).toBeInTheDocument(); // Sessions stat
      expect(await findFirstText("81%")).toBeInTheDocument(); // Avg Score stat
    },
    15000
  );

  test(
    "PROF-2: clicking Edit Profile switches to edit mode with the current values in inputs",
    async () => {
      const user = userEvent.setup();
      renderCandidate(<CandidateProfile />);
      await findFirstText("Backend Developer");

      await user.click(screen.getByRole("button", { name: "Edit Profile" }));

      expect(screen.getByDisplayValue("Nguyen Van A")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Backend Developer")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    },
    15000
  );
});

describe("Candidate Profile — editing and saving", () => {
  test(
    "PROF-3: saving valid changes calls updateCandidateProfile with the trimmed form and exits edit mode",
    async () => {
      userApi.updateCandidateProfile.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderCandidate(<CandidateProfile />);
      await findFirstText("Backend Developer");

      await user.click(screen.getByRole("button", { name: "Edit Profile" }));
      const targetRoleInput = screen.getByDisplayValue("Backend Developer");
      await user.clear(targetRoleInput);
      await user.type(targetRoleInput, "  Staff Backend Engineer  ");
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await vi.waitFor(() =>
        expect(userApi.updateCandidateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ targetRole: "Staff Backend Engineer" })
        )
      );
      expect(await screen.findByText("Profile saved successfully.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
    },
    15000
  );

  test(
    "PROF-4: an invalid LinkedIn URL blocks saving client-side and never calls the API",
    async () => {
      const user = userEvent.setup();
      renderCandidate(<CandidateProfile />);
      await findFirstText("Backend Developer");

      await user.click(screen.getByRole("button", { name: "Edit Profile" }));
      // LinkedIn/GitHub Field labels aren't wired to their inputs via
      // htmlFor/id (no accessible label association) — LinkedIn is the first
      // of the two url-type inputs in document order.
      const linkedInInput = document.querySelectorAll('input[type="url"]')[0] as HTMLInputElement;
      await user.type(linkedInInput, "not-a-url");
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      expect(await screen.findByText("Enter a valid URL (e.g. https://…)")).toBeInTheDocument();
      expect(userApi.updateCandidateProfile).not.toHaveBeenCalled();
    },
    15000
  );

  test(
    "PROF-5: adding a skill via Enter updates the skills list, and it's included on save",
    async () => {
      userApi.updateCandidateProfile.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderCandidate(<CandidateProfile />);
      await findFirstText("Backend Developer");

      await user.click(screen.getByRole("button", { name: "Edit Profile" }));
      await user.type(screen.getByPlaceholderText("e.g. React, Python"), "Kubernetes{Enter}");

      expect(screen.getByText("Kubernetes")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Save Changes" }));
      await vi.waitFor(() =>
        expect(userApi.updateCandidateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ techStack: ["Node.js", "SQL", "Kubernetes"] })
        )
      );
    },
    15000
  );
});

describe("Candidate Profile — CV management", () => {
  test(
    "PROF-6: uploading a CV from the empty state calls uploadCv and the new file appears",
    async () => {
      cvApi.getCv.mockResolvedValue(null);
      cvApi.uploadCv.mockResolvedValue({ cv: cvInfo({ fileName: "new-resume.pdf" }), analysisFailed: false });
      renderCandidate(<CandidateProfile />);
      await findFirstText("Backend Developer");
      await screen.findAllByText("Upload CV", {}, { timeout: 10000 });

      const fileInputs = document.querySelectorAll('input[type="file"]');
      const file = new File(["%PDF-1.4"], "new-resume.pdf", { type: "application/pdf" });
      const user = userEvent.setup();
      await user.upload(fileInputs[fileInputs.length - 1] as HTMLInputElement, file);

      await vi.waitFor(() => expect(cvApi.uploadCv).toHaveBeenCalledWith(file));
      expect(await findFirstText("new-resume.pdf")).toBeInTheDocument();
    },
    15000
  );

  test(
    "PROF-7: deleting an existing CV asks for confirmation before calling deleteCv",
    async () => {
      cvApi.getCv.mockResolvedValue(cvInfo({ fileName: "handbook-cv.pdf" }));
      cvApi.deleteCv.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderCandidate(<CandidateProfile />);
      await findFirstText("handbook-cv.pdf");

      await user.click(screen.getByRole("button", { name: "Delete" }));
      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText("Delete your CV?")).toBeInTheDocument();
      expect(cvApi.deleteCv).not.toHaveBeenCalled();

      await user.click(within(dialog).getByRole("button", { name: "Delete" }));

      await vi.waitFor(() => expect(cvApi.deleteCv).toHaveBeenCalled());
      expect(await screen.findByText("CV deleted.")).toBeInTheDocument();
    },
    15000
  );
});
