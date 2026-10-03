import path from 'node:path';
import type { NextConfig } from 'next';

// next-intl request config, wired by alias (equivalent to createNextIntlPlugin, but without
// loading the plugin's optional @swc/core native addon at config time).
const intlConfig = './src/i18n/request.ts';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Lets a verification build run next to a dev server without sharing .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve('.'),
  turbopack: { resolveAlias: { 'next-intl/config': intlConfig } },
  webpack(config) {
    config.resolve.alias['next-intl/config'] = path.resolve(intlConfig);
    return config;
  },
};

export default nextConfig;
