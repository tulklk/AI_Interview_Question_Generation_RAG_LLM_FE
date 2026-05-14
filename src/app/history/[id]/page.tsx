import { historySessions } from "@/data/history";
import { LegacyHistoryIdRedirect } from "./legacy-history-id-redirect";

export function generateStaticParams() {
  return historySessions.map((s) => ({ id: s.id }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LegacyHistoryIdRedirectPage({ params }: Props) {
  const { id } = await params;
  return <LegacyHistoryIdRedirect id={id} />;
}
