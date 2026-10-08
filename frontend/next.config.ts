import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev-mode badge (it overlaps the meeting toolbar).
  devIndicators: false,
};

export default nextConfig;
