import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // Static export only for production (Cloudflare Pages).
  // In dev mode, omit output so dynamic routes work without generateStaticParams constraints.
  ...(!isDev && { output: "export" }),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
