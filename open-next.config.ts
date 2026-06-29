import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No R2/D1/KV overrides — the app has no ISR/on-demand revalidation needs.
// Add an incrementalCache override here later if caching is required.
export default defineCloudflareConfig();
