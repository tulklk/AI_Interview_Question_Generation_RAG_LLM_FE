"use client";

import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { portalCard, portalHeading, portalMutedBg, portalSubtext } from "@/lib/portal-ui";

interface KeywordsCardProps {
  keywords: string[];
}

export function KeywordsCard({ keywords }: KeywordsCardProps) {
  const { t } = useLanguage();
  const kw = t.resultsPage.keywords;

  return (
    <div className={cn(portalCard, "shadow-sm p-5 mb-5 animate-fade-up")} style={{ animationDelay: "80ms" }}>
      <div className="flex items-center gap-2 mb-3">
        <Tag size={15} className="text-[#6c47ff]" />
        <h3 className={cn("text-sm font-semibold", portalHeading)}>{kw.title}</h3>
        <span className={cn("text-xs ml-1", portalSubtext)}>{keywords.length} {kw.found}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, i) => (
          <span
            key={keyword}
            className={cn(
              "text-xs font-medium px-3 py-1 rounded-full transition-colors cursor-default animate-fade-up hover:bg-[#6c47ff]/10 hover:text-[#6c47ff]",
              portalMutedBg,
              portalHeading
            )}
            style={{ animationDelay: `${80 + i * 30}ms` }}
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}
