import { notFound } from "next/navigation";
import { JobseekerAppShell } from "@/components/jobseeker/layout/jobseeker-app-shell";
import { SetDetail } from "@/components/jobseeker/sets/set-detail";
import { questionSets } from "@/data/jobseeker";

export function generateStaticParams() {
  return questionSets.map((s) => ({ id: s.id }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SetDetailPage({ params }: Props) {
  const { id } = await params;
  const set = questionSets.find((s) => s.id === id);
  if (!set) notFound();

  return (
    <JobseekerAppShell
      pageTitle={set.title}
      breadcrumb={[
        { label: "Jobseeker", href: "/jobseeker" },
        { label: "Sets", href: "/jobseeker" },
        { label: set.title },
      ]}
    >
      <SetDetail set={set} />
    </JobseekerAppShell>
  );
}
