import { HrReviewPageClient } from "./review-client";

// Server mode (Cloudflare Workers via OpenNext): dynamic route renders on demand,
// so no generateStaticParams placeholder or _redirects rewrite is needed.
export default function HrReviewPage() {
  return <HrReviewPageClient />;
}
