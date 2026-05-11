import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "filesystem.site",
        pathname: "/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
