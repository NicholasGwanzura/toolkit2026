import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Next.js injects inline bootstrap scripts, so 'unsafe-inline' is required without a
// nonce pipeline. Everything else is locked to the app's own origin (plus remote images).
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https:${isDev ? " ws: wss:" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

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
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
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
