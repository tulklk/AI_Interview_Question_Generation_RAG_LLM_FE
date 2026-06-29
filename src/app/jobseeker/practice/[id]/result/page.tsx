import { notFound } from "next/navigation";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { FeedbackPage } from "@/features/candidate/components/feedback/feedback-page";
import { practiceSessions, questionSets } from "@/features/candidate/data/jobseeker";

export function generateStaticParams() {
  return questionSets.map((s) => ({ id: s.id }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FeedbackResultPage({ params }: Props) {
  const { id } = await params;
  // Find the most recent session for this set, or fall back to the first session
  const session =
    practiceSessions.find((s) => s.setId === id && s.answers.length > 0) ??
    practiceSessions.find((s) => s.setId === id) ??
    practiceSessions[0];

  const set = questionSets.find((s) => s.id === id);
  if (!set) notFound();

  return (
    <JobseekerAppShell
      pageTitle="AI Feedback"
      breadcrumb={[
        { label: "Jobseeker", href: "/jobseeker/dashboard" },
        { label: "History", href: "/jobseeker/history" },
        { label: "Feedback" },
      ]}
    >
      <FeedbackPage session={session} />
    </JobseekerAppShell>
  );
}
