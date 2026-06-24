import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export only for production (Cloudflare Pages).
  // In dev mode, omit output so dynamic routes work without generateStaticParams constraints.
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
