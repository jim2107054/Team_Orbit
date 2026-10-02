import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ─── API Proxy Rewrites ────────────────────────────────
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/:path*`,
      },
      {
        source: '/health',
        destination: 'http://localhost:4000/health',
      },
    ];
  },

  // ─── Security Headers ──────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // ─── Image Optimization ────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,  // Cache optimized images for 1 hour
  },

  // ─── Build Optimizations ───────────────────────────────
  poweredByHeader: false,     // Remove X-Powered-By header
  compress: true,             // Enable gzip compression
};

export default nextConfig;

