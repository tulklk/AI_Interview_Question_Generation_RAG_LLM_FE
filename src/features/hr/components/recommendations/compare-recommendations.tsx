"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  compareRecommendations,
  type RecommendationCompareResponse,
} from "@/features/hr/services/recommendation.service";
import { useEffect } from "react";

export function CompareRecommendationsPage() {
  const { t } = useLanguage();
  const p = t.hrRecommendationsPage;
  const params = useSearchParams();
  const ids = useMemo(
    () => (params.get("ids") ?? "").split(",").map((x) => x.trim()).filter(Boolean),
    [params]
  );

  const [data, setData] = useState<RecommendationCompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    compareRecommendations(ids)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className={cn("text-[14px]", portalSubtext)}>{p.loading}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <AlertCircle size={28} className="text-red-500" />
        <p className={cn("text-[14px]", portalSubtext)}>{p.compareFailed}</p>
        <Link href="/hr/candidate-recommendations" className="text-[13px] font-semibold text-primary hover:underline">
          {p.backToList}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/hr/candidate-recommendations"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary mb-4"
      >
        <ArrowLeft size={14} /> {p.backToList}
      </Link>
      <h2 className={cn("text-2xl font-bold mb-1", portalHeading)}>{p.compareTitle}</h2>
      <p className={cn("text-sm mb-6", portalSubtext)}>{data.questionSetTitle}</p>
      <div className="overflow-x-auto hr-glass-card">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 font-semibold">{p.compare.metric}</th>
              {data.items.map((item) => (
                <th key={item.id} className="px-4 py-3 font-semibold">
                  <Link href={`/hr/candidate-recommendations/${item.id}`} className="hover:text-primary">
                    {item.candidateName}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <CompareRow label={p.card.score} values={data.items.map((i) => String(i.overallScore))} />
            <CompareRow label={p.fit.title} values={data.items.map((i) => `${i.fitPercent}%`)} />
            <CompareRow label={p.card.status} values={data.items.map((i) => i.status)} />
            <CompareRow
              label={p.fit.matched}
              values={data.items.map((i) => i.matchedSkills.join(", ") || "—")}
            />
            <CompareRow
              label={p.fit.missing}
              values={data.items.map((i) => i.missingOnCv.join(", ") || "—")}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-b border-gray-50 dark:border-gray-800/60">
      <td className="px-4 py-2.5 font-medium text-gray-500">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="px-4 py-2.5 align-top">
          {v}
        </td>
      ))}
    </tr>
  );
}
