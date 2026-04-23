import Link from "next/link";
import { Sparkles } from "lucide-react";

export function WelcomeSection() {
  return (
    <div className="flex items-start justify-between mb-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Good morning, HR Manager 👋
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Here&apos;s what&apos;s happening with your recruitment toolkit today.
        </p>
      </div>
      <Link
        href="/generate"
        className="flex items-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0"
      >
        <Sparkles size={15} />
        Generate Questions
      </Link>
    </div>
  );
}
