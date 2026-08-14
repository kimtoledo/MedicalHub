/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep production builds separate from the live development cache. Running
  // `next build` must never replace assets referenced by `next dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // @dentra/shared ships raw TypeScript (no build step) and its internal
  // imports use `.js` extensions resolving to sibling `.ts` files (standard
  // for NodeNext-style ESM TS). transpilePackages alone doesn't teach
  // webpack that extension mapping for node_modules-resolved packages, so
  // extensionAlias is added explicitly.
  transpilePackages: ['@dentra/shared'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

module.exports = nextConfig;
