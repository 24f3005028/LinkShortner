import type { NextConfig } from "next";

const backendOrigin = process.env.LINK_SHORTENER_API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${backendOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
