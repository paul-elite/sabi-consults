// Fetches a company's homepage (and contact page) and records signs that the site is
// outdated, plus public contact details and signs that the business is established.

const USER_AGENT = 'Mozilla/5.0 (compatible; SabiConsultsSiteCheck/1.0)';
const FREE_BUILDER_HOSTS = /(wixsite\.com|blogspot\.|weebly\.com|wordpress\.com|business\.site|godaddysites\.com|jimdosite\.com|site123\.me)$/i;
const SOCIAL_HOSTS = /facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com/i;

export async function auditSite(url, { timeoutMs = 15000, fetchImpl = fetch, pagespeedKey = process.env.PAGESPEED_API_KEY } = {}) {
  const result = { reachable: false, issues: [], emails: [], socials: 0, listingLinks: 0, finalUrl: '', loadMs: null, pagespeed: null };
  const target = url.startsWith('http') ? url : `https://${url}`;

  const home = await fetchPage(target, timeoutMs, fetchImpl);
  if (!home.ok) {
    // An https failure on a site that works over http is itself a finding.
    const http = target.startsWith('https://') ? await fetchPage(target.replace(/^https:/, 'http:'), timeoutMs, fetchImpl) : home;
    if (!http.ok) {
      result.issues.push({ code: 'site_down', label: `site down or broken (${home.error ?? home.status})` });
      return result;
    }
    Object.assign(home, http);
  }
  result.reachable = true;
  result.finalUrl = home.url;
  result.loadMs = home.ms;

  const html = home.html;
  const lower = html.toLowerCase();
  const issue = (cond, code, label) => cond && result.issues.push({ code, label });

  issue(!home.url.startsWith('https://'), 'no_https', 'no HTTPS');
  issue(!/<meta[^>]+name=["']?viewport/i.test(html), 'not_mobile', 'not mobile-friendly (no viewport tag)');
  issue(home.ms > 4000, 'slow', `slow to load (${(home.ms / 1000).toFixed(1)}s)`);
  issue(html.length > 2_500_000, 'heavy', 'very heavy homepage');
  issue(!/<title>[^<]{3,}<\/title>/i.test(html), 'no_title', 'missing page title');
  issue(!/<meta[^>]+name=["']?description/i.test(html), 'no_meta_description', 'no meta description (weak on Google)');
  issue(!/<meta[^>]+property=["']?og:image/i.test(html), 'no_og_image', 'no social share image');
  issue(FREE_BUILDER_HOSTS.test(new URL(home.url).hostname), 'free_builder', 'on a free website-builder address');
  issue(/\.swf\b|<embed[^>]+flash/i.test(html), 'flash', 'uses Flash');
  issue(/<(font|marquee|center|frameset)\b/i.test(html), 'obsolete_html', 'uses obsolete HTML tags');
  issue((lower.match(/<table/g) ?? []).length > 8, 'table_layout', 'table-based layout');
  issue(!/wa\.me\/|api\.whatsapp\.com|whatsapp:/i.test(html), 'no_whatsapp', 'no WhatsApp button');
  issue(!/<form\b/i.test(html), 'no_form', 'no enquiry form on homepage');

  const year = latestCopyrightYear(html);
  const thisYear = new Date().getFullYear();
  issue(year && year <= thisYear - 2, 'old_copyright', `copyright says ${year}`);

  const jquery = html.match(/jquery[.-]?(\d)\.(\d+)(?:\.\d+)?(?:\.min)?\.js/i);
  issue(jquery && Number(jquery[1]) < 3, 'old_jquery', `old jQuery ${jquery?.[1]}.${jquery?.[2]}`);
  const bootstrap = html.match(/bootstrap[/@-]?(\d)\.\d+(?:\.\d+)?/i);
  issue(bootstrap && Number(bootstrap[1]) < 4, 'old_bootstrap', `old Bootstrap ${bootstrap?.[1]}`);
  const wp = html.match(/<meta[^>]+generator[^>]+WordPress (\d+)\.(\d+)/i);
  issue(wp && Number(wp[1]) < 6, 'old_wordpress', `old WordPress ${wp?.[1]}.${wp?.[2]}`);

  result.emails = extractEmails(html);
  result.socials = new Set((html.match(/https?:\/\/(?:www\.)?[a-z.]+\.com\/[^"'\s>]+/gi) ?? []).filter((l) => SOCIAL_HOSTS.test(l)).map((l) => new URL(l).hostname.replace(/^www\./, ''))).size;
  result.listingLinks = new Set(html.match(/href=["'][^"']*\/(propert(y|ies)|listings?|for-sale|for-rent|lands?|houses?)\/[^"']+/gi) ?? []).size;

  if (result.emails.length === 0) {
    const contactPath = html.match(/href=["']([^"']*contact[^"']*)["']/i)?.[1];
    if (contactPath) {
      try {
        const contact = await fetchPage(new URL(contactPath, home.url).href, timeoutMs, fetchImpl);
        if (contact.ok) result.emails = extractEmails(contact.html);
      } catch {}
    }
  }

  if (pagespeedKey) result.pagespeed = await pagespeedScore(home.url, pagespeedKey, fetchImpl);
  issue(result.pagespeed != null && result.pagespeed < 50, 'poor_pagespeed', `poor Google mobile score (${result.pagespeed}/100)`);

  return result;
}

async function fetchPage(url, timeoutMs, fetchImpl) {
  const started = Date.now();
  try {
    const res = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const html = await res.text();
    return { ok: res.ok, status: res.status, url: res.url || url, html, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, error: err.cause?.code ?? err.name ?? 'error' };
  }
}

async function pagespeedScore(url, key, fetchImpl) {
  try {
    const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=mobile&category=performance&url=${encodeURIComponent(url)}&key=${key}`;
    const res = await fetchImpl(api, { signal: AbortSignal.timeout(90000) });
    if (!res.ok) return null;
    const score = (await res.json()).lighthouseResult?.categories?.performance?.score;
    return score == null ? null : Math.round(score * 100);
  } catch {
    return null;
  }
}

export function latestCopyrightYear(html) {
  const text = html.replace(/<[^>]+>/g, ' ');
  const years = [...text.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi)].map((m) => Number(m[1]));
  // A script that prints the current year makes the footer look fresh even when the site isn't.
  if (/new Date\(\)\.getFullYear\(\)|date\(['"]Y['"]\)/.test(html)) return null;
  return years.length ? Math.max(...years) : null;
}

export function extractEmails(html) {
  const found = html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
  return [...new Set(found.map((e) => e.toLowerCase()))]
    .filter((e) => !/\.(png|jpe?g|gif|svg|webp)$/.test(e) && !/example\.|sentry|wixpress|domain\.com|yourdomain/.test(e))
    .slice(0, 3);
}
