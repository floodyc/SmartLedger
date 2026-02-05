import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure webpack to handle Node.js modules used by document parsing libraries
  webpack: (config, { isServer }) => {
    if (isServer) {
      // These packages need to be bundled for server-side use
      config.externals = config.externals || [];
    }

    // Handle canvas dependency from pdf-parse (optional dependency, can be ignored)
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    return config;
  },

  // Optimize for serverless deployment
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'xlsx'],
  },
};

export default nextConfig;
