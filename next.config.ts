import type { NextConfig } from "next";

// Deployed to Cloudflare Workers via @opennextjs/cloudflare (server mode).
// No static export — dynamic routes like /hr/history/[id] render on demand,
// so no _redirects placeholder hack is required.
const nextConfig: NextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
