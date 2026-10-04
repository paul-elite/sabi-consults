// Turns a raw page request into a visit record: where the visitor came from,
// roughly where they are, and what they browse on. Runs inside src/proxy.ts.

export type Medium = 'search' | 'social' | 'messaging' | 'referral' | 'campaign' | 'direct' | 'internal'

// Hostname fragment → readable source name and medium
const KNOWN: [RegExp, string, Medium][] = [
  [/(^|\.)google\./, 'Google', 'search'],
  [/(^|\.)bing\.com$/, 'Bing', 'search'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo', 'search'],
  [/(^|\.)yahoo\./, 'Yahoo', 'search'],
  [/(^|\.)yandex\./, 'Yandex', 'search'],
  [/(^|\.)ecosia\.org$/, 'Ecosia', 'search'],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, 'ChatGPT', 'referral'],
  [/(^|\.)perplexity\.ai$/, 'Perplexity', 'referral'],
  [/(^|\.)claude\.ai$/, 'Claude', 'referral'],
  [/(^|\.)instagram\.com$|^l\.instagram\.com$/, 'Instagram', 'social'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$|^l\.facebook\.com$|^lm\.facebook\.com$|^m\.facebook\.com$/, 'Facebook', 'social'],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, 'X (Twitter)', 'social'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn', 'social'],
  [/(^|\.)tiktok\.com$/, 'TikTok', 'social'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube', 'social'],
  [/(^|\.)pinterest\./, 'Pinterest', 'social'],
  [/(^|\.)reddit\.com$/, 'Reddit', 'social'],
  [/(^|\.)nairaland\.com$/, 'Nairaland', 'social'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp', 'messaging'],
  [/(^|\.)(telegram\.org|t\.me)$/, 'Telegram', 'messaging'],
  [/(^|\.)(mail\.google\.com|outlook\.live\.com|outlook\.office\.com|mail\.yahoo\.com)$/, 'Email', 'messaging'],
]

// In-app browsers often send no Referer; their user agent still gives them away
const IN_APP: [RegExp, string, Medium][] = [
  [/Instagram/i, 'Instagram', 'social'],
  [/FBAN|FBAV|FB_IAB/i, 'Facebook', 'social'],
  [/WhatsApp/i, 'WhatsApp', 'messaging'],
  [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok', 'social'],
  [/LinkedInApp/i, 'LinkedIn', 'social'],
  [/Twitter/i, 'X (Twitter)', 'social'],
  [/Telegram/i, 'Telegram', 'messaging'],
]

const UTM_NAMES: Record<string, [string, Medium]> = {
  ig: ['Instagram', 'social'], instagram: ['Instagram', 'social'],
  fb: ['Facebook', 'social'], facebook: ['Facebook', 'social'],
  wa: ['WhatsApp', 'messaging'], whatsapp: ['WhatsApp', 'messaging'],
  google: ['Google', 'search'], tiktok: ['TikTok', 'social'],
  x: ['X (Twitter)', 'social'], twitter: ['X (Twitter)', 'social'],
  linkedin: ['LinkedIn', 'social'], email: ['Email', 'messaging'], newsletter: ['Email', 'messaging'],
}

export function classifySource(input: {
  referrerHost: string | null
  siteHost: string
  utmSource: string | null
  utmMedium: string | null
  userAgent: string
}): { source: string; medium: Medium } {
  const { referrerHost, siteHost, utmSource, utmMedium, userAgent } = input

  // Tagged links win: they say exactly which post or campaign brought someone in
  if (utmSource) {
    const known = UTM_NAMES[utmSource.toLowerCase()]
    if (known) return { source: known[0], medium: utmMedium ? 'campaign' : known[1] }
    return { source: utmSource.slice(0, 60), medium: 'campaign' }
  }

  if (referrerHost) {
    const host = referrerHost.toLowerCase()
    const bare = (h: string) => h.replace(/^www\./, '')
    if (bare(host) === bare(siteHost.toLowerCase())) return { source: 'Internal', medium: 'internal' }
    for (const [re, name, medium] of KNOWN) if (re.test(host)) return { source: name, medium }
    if (/(^|\.)android-app$/.test(host)) return { source: 'Android app', medium: 'referral' }
    return { source: bare(host).slice(0, 80), medium: 'referral' }
  }

  for (const [re, name, medium] of IN_APP) if (re.test(userAgent)) return { source: name, medium }
  return { source: 'Direct', medium: 'direct' }
}

export const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|whatsapp\/|telegrambot|discordbot|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http|java\/|httpclient|scrapy|ahrefs|semrush|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|ccbot|amazonbot|applebot/i

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)
    ? 'tablet'
    : /Mobi|iPhone|iPod|Android.*Mobile|Opera Mini|IEMobile/i.test(ua) ? 'mobile' : 'desktop'

  const browser =
    /Instagram/i.test(ua) ? 'Instagram app' :
    /FBAN|FBAV/i.test(ua) ? 'Facebook app' :
    /Edg\//.test(ua) ? 'Edge' :
    /OPR\/|Opera/.test(ua) ? 'Opera' :
    /SamsungBrowser/.test(ua) ? 'Samsung Internet' :
    /Firefox\/|FxiOS/.test(ua) ? 'Firefox' :
    /CriOS|Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) ? 'Safari' : 'Other'

  const os =
    /iPhone|iPad|iPod/.test(ua) ? 'iOS' :
    /Android/.test(ua) ? 'Android' :
    /Windows/.test(ua) ? 'Windows' :
    /Mac OS X|Macintosh/.test(ua) ? 'macOS' :
    /CrOS/.test(ua) ? 'ChromeOS' :
    /Linux/.test(ua) ? 'Linux' : 'Other'

  return { device, browser, os }
}

/** Vercel URL-encodes city names (e.g. "S%C3%A3o%20Paulo"). */
export function decodeHeader(value: string | null): string | null {
  if (!value) return null
  try { return decodeURIComponent(value).slice(0, 80) } catch { return value.slice(0, 80) }
}
