import Link from "next/link";
import { Sparkles } from "lucide-react";

export function QuickGenerateCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#6c47ff] to-[#8b65ff] p-6 flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/5 translate-x-8 -translate-y-8" />
      <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 -translate-x-6 translate-y-6" />

      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center relative z-10">
        <Sparkles size={18} className="text-white" />
      </div>

      <div className="relative z-10">
        <h3 className="text-base font-bold text-white leading-snug">
          Generate New Questions
        </h3>
        <p className="text-sm text-white/70 mt-1 leading-relaxed">
          Upload or paste a job description to get AI-powered interview questions
          in seconds.
        </p>
      </div>

      <Link
        href="/generate"
        className="relative z-10 self-start flex items-center gap-2 bg-white text-[#6c47ff] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-white/90 transition-colors"
      >
        Get Started →
      </Link>
    </div>
  );
}
