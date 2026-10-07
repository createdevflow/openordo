import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["razorpay"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure docs/legal/*.md files are included in the standalone output trace.
  // Required because the legal pages read these files from disk at runtime.
  outputFileTracingIncludes: {
    "/legal/*": ["./docs/legal/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com https://browser.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src 'self' https://api.razorpay.com;" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/files/:path*",
      }
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organization and project — set these env vars or fill in here
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps to Sentry on production builds (readable stack traces)
  // Source maps are NEVER served to end-users via the browser
  silent: true,
  sourcemaps: {
    disable: true
  },



  // Disable telemetry back to Sentry's own tracking
  telemetry: false,
});
