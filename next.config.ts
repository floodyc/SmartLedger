import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // External packages for server-side document parsing (Next.js 16+ location)
  serverExternalPackages: ['pdf-parse', 'mammoth', 'xlsx'],

  // Acknowledge Turbopack (Next.js 16 default) - no webpack config needed
  turbopack: {},
};

export default nextConfig;
