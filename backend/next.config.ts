import type { NextConfig } from "next";

const frontendOrigin =
  process.env.FRONTEND_INTERNAL_URL ?? "http://127.0.0.1:3000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return {
      fallback: [
        {
          source: "/:path*",
          destination: `${frontendOrigin}/:path*`,
        },
      ],
    };
  },
  experimental: {
    proxyClientMaxBodySize: "10mb",
  },
};

export default nextConfig;
