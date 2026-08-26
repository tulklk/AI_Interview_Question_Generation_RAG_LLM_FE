import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { CandidateLeaderboardPage } from "@/features/candidate/components/leaderboard/candidate-leaderboard-page";

export default function LeaderboardPage() {
  return (
    <JobseekerAppShell
      pageTitle="Bảng xếp hạng"
      breadcrumb={[{ label: "Jobseeker" }, { label: "Leaderboard" }]}
    >
      <CandidateLeaderboardPage />
    </JobseekerAppShell>
  );
}
