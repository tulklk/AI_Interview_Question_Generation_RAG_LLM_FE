import { AppShell } from "@/components/layout/app-shell";
import { ResultsHeader } from "@/components/results/results-header";
import { KeywordsCard } from "@/components/results/keywords-card";
import { QuestionsTabs } from "@/components/results/questions-tabs";
import { mockResultSession } from "@/data/results";

export default function ResultsPage() {
  const session = mockResultSession;
  const categories = [...new Set(session.questions.map((q) => q.category))];

  return (
    <AppShell
      breadcrumb={[
        { label: "Home", href: "/dashboard" },
        { label: "History", href: "/history" },
        { label: "Results" },
      ]}
      pageTitle="Results"
    >
      <div className="max-w-4xl mx-auto">
        <ResultsHeader
          jobTitle={session.jobTitle}
          totalQuestions={session.questions.length}
          totalCategories={categories.length}
        />
        <KeywordsCard keywords={session.keywords} />
        <QuestionsTabs questions={session.questions} />
      </div>
    </AppShell>
  );
}
