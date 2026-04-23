import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

interface ResultsHeaderProps {
  jobTitle: string;
  totalQuestions: number;
  totalCategories: number;
}

export function ResultsHeader({
  jobTitle,
  totalQuestions,
  totalCategories,
}: ResultsHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Back to History
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Interview Questions</h2>
        <p className="text-sm mt-1">
          Generated for:{" "}
          <span className="text-[#6c47ff] font-semibold">{jobTitle}</span>
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-gray-500">
            {totalQuestions} total questions
          </span>
          <span className="text-gray-200">|</span>
          <span className="text-xs text-gray-500">{totalCategories} categories</span>
          <span className="text-gray-200">|</span>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Ready to use
          </span>
        </div>
      </div>
      <button className="flex items-center gap-2 text-sm font-semibold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 px-4 py-2 rounded-xl transition-colors">
        <Download size={14} />
        Export to PDF
      </button>
    </div>
  );
}
