// Logs every page load to the site_visits table.
//
// Runs on the server for full page requests only (not client-side navigations,
// prefetches, API calls, assets or the admin area), so each row is someone
// opening the site. The write happens after the response is sent, so it never
// slows a page down, and a failed write is ignored.
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { BOT_UA, classifySource, decodeHeader, parseUserAgent } from '@/lib/visit'

const VISITOR_COOKIE = 'sabi_vid'
const ONE_YEAR = 60 * 60 * 24 * 365

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const h = request.headers
  const isPage =
    request.method === 'GET' &&
    !h.get('rsc') &&
    !h.get('next-router-prefetch') &&
    !/prefetch/i.test(h.get('purpose') || h.get('sec-purpose') || '') &&
    (h.get('sec-fetch-dest') === 'document' || (h.get('accept') || '').includes('text/html'))

  if (!isPage) return NextResponse.next()

  const response = NextResponse.next()

  // Random first-party id so repeat visits from the same browser can be counted once
  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value
  if (!visitorId || !/^[a-f0-9-]{36}$/.test(visitorId)) {
    visitorId = crypto.randomUUID()
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: ONE_YEAR,
      path: '/',
    })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && key) event.waitUntil(record(request, visitorId, url, key))

  return response
}

async function record(request: NextRequest, visitorId: string, url: string, key: string) {
  try {
    const h = request.headers
    const userAgent = (h.get('user-agent') || '').slice(0, 400)
    const referrer = h.get('referer')
    let referrerHost: string | null = null
    try { referrerHost = referrer ? new URL(referrer).hostname : null } catch { /* malformed */ }

    const params = request.nextUrl.searchParams
    const utm = (name: string) => params.get(name)?.slice(0, 120) || null
    const { source, medium } = classifySource({
      referrerHost,
      siteHost: request.nextUrl.hostname,
      utmSource: utm('utm_source'),
      utmMedium: utm('utm_medium'),
      userAgent,
    })

    const row = {
      visitor_id: visitorId,
      path: request.nextUrl.pathname.slice(0, 300),
      // Keep only the origin and path of the referring page, never its query string
      referrer: referrer && referrerHost ? `${referrerHost}${new URL(referrer).pathname}`.slice(0, 300) : null,
      referrer_host: referrerHost,
      source,
      medium,
      utm_source: utm('utm_source'),
      utm_medium: utm('utm_medium'),
      utm_campaign: utm('utm_campaign'),
      country: h.get('x-vercel-ip-country') || h.get('cf-ipcountry') || null,
      region: decodeHeader(h.get('x-vercel-ip-country-region')),
      city: decodeHeader(h.get('x-vercel-ip-city') || h.get('cf-ipcity')),
      ...parseUserAgent(userAgent),
      is_bot: !userAgent || BOT_UA.test(userAgent),
      user_agent: userAgent || null,
    }

    await fetch(`${url}/rest/v1/site_visits`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row),
      cache: 'no-store',
    })
  } catch {
    // Visit logging must never affect the page
  }
}

export const config = {
  // Skip API routes, the admin area, Next.js internals and any file with an extension
  matcher: ['/((?!api|admin|_next/|_vercel|.*\\.[\\w]+$).*)'],
}
