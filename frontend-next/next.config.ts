import type { NextConfig } from 'next';

// `standalone` emits .next/standalone + .next/static: a self-contained server
// bundle that the multi-stage Dockerfile copies into the minimal runner image.
const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
