import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the development badge from covering the mobile navigation.
  devIndicators: false,
  allowedDevOrigins: ["local-origin.dev", "*.local-origin.dev"]
};

export default nextConfig;
