import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { HistoryBoard } from "@/features/candidate/components/history/history-board";

export default function HistoryPage() {
  return (
    <JobseekerAppShell
      pageTitle="Practice History"
      breadcrumb={[{ label: "Jobseeker", href: "/jobseeker/dashboard" }, { label: "History" }]}
    >
      <div className="animate-fade-up">
        <HistoryBoard />
      </div>
    </JobseekerAppShell>
  );
}
