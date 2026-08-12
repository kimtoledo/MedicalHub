/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep production builds separate from the live development cache. Running
  // `next build` must never replace assets referenced by `next dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

module.exports = nextConfig;
