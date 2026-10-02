/**
 * proxy.ts — Combined Middleware & Proxy
 *
 * Route protection (authentication) + Maintenance Mode enforcement + Country Proxy.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { NEVER_INDEX_PREFIXES } from "./lib/seo/routes"

// ─── Routes exempt from maintenance mode ─────────────────────────────────────

function isMaintenanceExempt(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/razorpay/webhook") ||
    pathname.startsWith("/api/cron") || // cron jobs should still run
    pathname === "/api/maintenance-status" // our own flag check endpoint
  )
}

// ─── Maintenance mode cache (module-level, bounded staleness) ─────────────────

let maintenanceCache: {
  enabled: boolean
  message: string
  etaText: string
  fetchedAt: number
} | null = null

const CACHE_TTL_MS = 5_000 // 5 seconds — toggle takes effect within 5s

async function checkMaintenanceMode(baseUrl: string): Promise<{
  enabled: boolean
  message: string
  etaText: string
}> {
  const now = Date.now()
  if (maintenanceCache && now - maintenanceCache.fetchedAt < CACHE_TTL_MS) {
    return maintenanceCache
  }

  try {
    const res = await fetch(`${baseUrl}/api/maintenance-status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    })
    if (res.ok) {
      const data = await res.json()
      maintenanceCache = { ...data, fetchedAt: now }
      return data
    }
  } catch {
    // If the check itself fails, don't block traffic — fail open
  }
  return { enabled: false, message: "", etaText: "" }
}

// ─── Maintenance page HTML ────────────────────────────────────────────────────

function maintenancePage(message: string, etaText: string): string {
  const body = message || "We're making improvements. Be right back."
  const eta = etaText ? `<p class="eta">${etaText}</p>` : ""
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Maintenance — OpenORDO</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --forest: #1E4638;
      --paper: #F7F5F0;
      --amber: #C8862B;
      --ink: #1A1A1A;
      --ink-soft: #5C5C5C;
    }
    body {
      font-family: -apple-system, "Inter", "Segoe UI", sans-serif;
      background: var(--paper);
      color: var(--ink);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 24px rgba(0,0,0,0.08);
      padding: 52px 48px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      background: var(--forest);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
    }
    .icon svg { width: 32px; height: 32px; stroke: white; fill: none; }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 12px;
      color: var(--forest);
      font-family: Georgia, "Times New Roman", serif;
    }
    p {
      font-size: 15px;
      color: var(--ink-soft);
      line-height: 1.6;
    }
    .eta {
      margin-top: 16px;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--amber);
    }
    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: #9e9e9e;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    </div>
    <h1>Scheduled Maintenance</h1>
    <p>${body}</p>
    ${eta}
    <div class="footer">OpenORDO — Clinic Management Platform</div>
  </div>
</body>
</html>`
}

// ─── Main middleware / proxy ───────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`

  // 0. Enforce canonical host and trailing slash (Single-hop 308)
  const isWww = request.nextUrl.hostname.startsWith("www.")
  const hasTrailingSlash = pathname !== "/" && pathname.endsWith("/")
  if (isWww || hasTrailingSlash) {
    const newHost = isWww ? request.nextUrl.host.replace("www.", "") : request.nextUrl.host
    const newPath = hasTrailingSlash ? pathname.slice(0, -1) : pathname
    request.nextUrl.host = newHost
    request.nextUrl.pathname = newPath
    return NextResponse.redirect(request.nextUrl, 308)
  }

  // 1. Maintenance mode check — runs before proxy/auth
  if (!isMaintenanceExempt(pathname)) {
    const { enabled, message, etaText } = await checkMaintenanceMode(baseUrl)
    if (enabled) {
      return new NextResponse(maintenancePage(message, etaText), {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": "300",
          "X-Robots-Tag": "noindex, nofollow",
        },
      })
    }
  }

  // 2. Proxy Logic (Country Headers)
  const country = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry')
  
  const requestHeaders = new Headers(request.headers)
  if (country) {
    requestHeaders.set('x-user-country', country)
  }
  
  const simGeo = request.nextUrl.searchParams.get("_geo")
  if (simGeo) {
    requestHeaders.set('x-admin-geo-sim', simGeo)
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // 3. Apply X-Robots-Tag for private routes and non-production environments
  const isNonProd = 
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") || 
    (process.env.APP_ENV && process.env.APP_ENV !== "production")
  
  const isPrivate = NEVER_INDEX_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
  
  // also noindex if there are search/filter query variants (ignore API)
  const hasSearchVariants = searchParams.size > 0 && !pathname.startsWith("/api")

  if (isNonProd || isPrivate || hasSearchVariants) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|eot|mp4|webm)).*)",
  ],
}
