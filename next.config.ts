import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure allowed development origins for Tailscale network
  ...(process.env.NODE_ENV === "development" && {
      allowedDevOrigins: [
        "gzahavy-mac.tail7ffba.ts.net",
        "*.tail7ffba.ts.net"
      ]
  })
};

export default nextConfig;
