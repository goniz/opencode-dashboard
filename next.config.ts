import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure allowed development origins for Tailscale network
  ...(process.env.NODE_ENV === "development" && {
      allowedDevOrigins: [
        "gzahavy-mac.tail7ffba.ts.net",
        "*.tail7ffba.ts.net",
        "192.168.1.252"
      ]
  }),
  
  // Handle ESM compatibility for testing
  experimental: {
    esmExternals: true,
  },
  
  // Webpack configuration for better ESM handling
  webpack: (config, { isServer }) => {
    // Handle ESM modules properly
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    
    // Fix CSS handling in test environment
    if (process.env.NODE_ENV === 'test') {
      config.resolve.alias = {
        ...config.resolve.alias,
        '\\.(css|less|scss|sass)$': require.resolve('./__mocks__/next-css.js'),
      };
    }
    
    return config;
  },
};

export default nextConfig;
