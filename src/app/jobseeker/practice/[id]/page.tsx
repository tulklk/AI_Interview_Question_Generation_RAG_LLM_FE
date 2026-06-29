import { notFound } from "next/navigation";
import { PracticeSession } from "@/features/candidate/components/practice/practice-session";
import { questionSets } from "@/features/candidate/data/jobseeker";

export function generateStaticParams() {
  return questionSets.map((s) => ({ id: s.id }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PracticeSessionPage({ params }: Props) {
  const { id } = await params;
  const set = questionSets.find((s) => s.id === id);
  if (!set) notFound();

  // Full-screen layout — no sidebar
  return <PracticeSession set={set} />;
}
