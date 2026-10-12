import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 2,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // The browser must always check for a new service worker, or a fix to it could take days to reach people.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // The scanner, voice assistant and job locations need these on our own pages only.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
        ],
      },
    ];
  },
  env: {
    // Bridges the server-only ENABLE_DEMO_LOGIN into a client-readable value at build time,
    // so only one hosting env var needs to be set instead of two independently-named ones
    // that can drift out of sync (login/page.tsx used to read its own NEXT_PUBLIC_ copy).
    NEXT_PUBLIC_ENABLE_DEMO_LOGIN: process.env.ENABLE_DEMO_LOGIN,
  },
};

export default nextConfig;
