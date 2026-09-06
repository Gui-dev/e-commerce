import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/storage/**",
      },
    ],
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
