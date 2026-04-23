import { Tag } from "lucide-react";

interface KeywordsCardProps {
  keywords: string[];
}

export function KeywordsCard({ keywords }: KeywordsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 animate-fade-up" style={{ animationDelay: "80ms" }}>
      <div className="flex items-center gap-2 mb-3">
        <Tag size={15} className="text-[#6c47ff]" />
        <h3 className="text-sm font-semibold text-gray-800">
          Extracted Keywords from JD
        </h3>
        <span className="text-xs text-gray-400 ml-1">{keywords.length} found</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, i) => (
          <span
            key={keyword}
            className="text-xs font-medium text-gray-700 bg-gray-100 hover:bg-[#6c47ff]/10 hover:text-[#6c47ff] px-3 py-1 rounded-full transition-colors cursor-default animate-fade-up"
            style={{ animationDelay: `${80 + i * 30}ms` }}
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}
