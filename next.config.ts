import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/apple-touch-icon.png',
        destination: '/apple-touch-icon.png',
      },
      {
        source: '/apple-touch-icon-precomposed.png',
        destination: '/apple-touch-icon.png',
      },
    ];
  },
};


export default nextConfig;