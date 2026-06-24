import { HrReviewPageClient } from "./review-client";

// Static export: pre-render a placeholder shell.
// Cloudflare _redirects rewrites /hr/history/<uuid> → /hr/history/placeholder/
// so the client hydrates against the real browser URL and useParams() returns the correct ID.
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function HrReviewPage() {
  return <HrReviewPageClient />;
}
