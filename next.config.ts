import type { NextConfig } from 'next'

const supabaseHost = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname } catch { return '' }
})()

const isDev = process.env.NODE_ENV !== 'production'
// Pin storage to this project's host; fall back to the wildcard only when the URL isn't configured
const storage = supabaseHost ? `https://${supabaseHost}` : 'https://*.supabase.co'

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  `img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com ${storage} https://images.unsplash.com https://framerusercontent.com https://*.cdninstagram.com https://*.fbcdn.net`,
  `media-src 'self' ${storage}`,
  `connect-src 'self' ${storage}${isDev ? ' ws: wss:' : ''}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // Next.js needs inline bootstrap scripts; eval is only needed by the dev server's hot reload
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  { key: 'Origin-Agent-Cluster', value: '?1' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), display-capture=(), browsing-topics=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Only optimise images from places we actually use, so the image service
    // can't be used as an open proxy for any website.
    remotePatterns: [
      // Only this project's storage, so the optimiser can't fetch from any other Supabase project
      supabaseHost
        ? { protocol: 'https' as const, hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }
        : { protocol: 'https' as const, hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'framerusercontent.com' },
      { protocol: 'https', hostname: '*.cdninstagram.com' },
      { protocol: 'https', hostname: '*.fbcdn.net' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Cache-Control', value: 'no-store' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }, { key: 'X-Robots-Tag', value: 'noindex' }] },
    ]
  },
}

export default nextConfig
