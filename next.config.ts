import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure allowed development origins for Tailscale network
  ...(process.env.NODE_ENV === "development" && {
    experimental: {
      // @ts-ignore - allowedDevOrigins may not be in types yet but is supported
      allowedDevOrigins: [
        "gzahavy-mac.tail7ffba.ts.net",
        "*.tail7ffba.ts.net"
      ]
    }
  })
};

export default nextConfig;
