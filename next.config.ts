import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,

  // Google Sign-In (GSI) uses a popup that itself has COOP: same-origin set by
  // Google's servers. When BOTH sides have a COOP header, the browser severs
  // window.opener on the popup, blocking postMessage in both directions.
  // "unsafe-none" restores the pre-COOP browser default so the OAuth popup can
  // communicate back to the opener window normally.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ];
  },

  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons", "recharts", "framer-motion"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
