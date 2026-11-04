import { imageHosts } from './image-hosts.config.mjs';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  distDir: process.env.DIST_DIR || (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
  outputFileTracingRoot: projectRoot,
  async rewrites() {
    const apiProxyUrl = process.env.API_PROXY_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyUrl}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 60,
    qualities: [75, 85, 100],
  },
};

export default nextConfig;
