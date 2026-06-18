import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed "output: export" — static export blocks dynamic routes (e.g. /hr/history/[id])
  // and is incompatible with server-side data fetching needed for real session IDs.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
