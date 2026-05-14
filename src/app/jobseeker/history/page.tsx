import { JobseekerAppShell } from "@/components/jobseeker/layout/jobseeker-app-shell";
import { HistoryBoard } from "@/components/jobseeker/history/history-board";

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
