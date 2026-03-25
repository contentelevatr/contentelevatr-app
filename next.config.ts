import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.linkedin.com" },
      { protocol: "https", hostname: "**.licdn.com" },
      { protocol: "https", hostname: "**.redd.it" },
      { protocol: "https", hostname: "**.redditstatic.com" },
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "abs.twimg.com" },
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default nextConfig;
