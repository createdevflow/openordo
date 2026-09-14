import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Extract country from standard headers (Vercel, Cloudflare, etc.)
  let country = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry')
  
  // If not present in CDN headers (e.g. localhost/dev), check browser accept-language for India
  if (!country) {
    const acceptLang = request.headers.get('accept-language') || ''
    if (/en-IN|hi-IN|\bhi\b|\bmr\b|\bta\b|\bte\b|\bbn\b|\bgu\b|\bkn\b|\bpa\b/i.test(acceptLang)) {
      country = 'IN'
    } else {
      country = 'US'
    }
  }
  
  // Clone request headers and add our normalized header
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-country', country)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

// Only run on specific paths if desired, but for global pricing it's best to run on public paths.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
