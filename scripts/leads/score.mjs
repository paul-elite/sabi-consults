// Turns discovery + audit data into two 0–100 scores:
//   redesign: how clearly the current site needs replacing
//   budget:   how likely the business can pay ~$2,000 for a new one

const ISSUE_WEIGHTS = {
  site_down: 45,
  not_mobile: 30,
  free_builder: 20,
  no_https: 15,
  old_copyright: 15,
  flash: 15,
  obsolete_html: 15,
  table_layout: 15,
  poor_pagespeed: 15,
  old_jquery: 10,
  old_bootstrap: 10,
  old_wordpress: 10,
  slow: 10,
  heavy: 5,
  no_title: 5,
  no_meta_description: 5,
  no_form: 5,
  no_whatsapp: 5,
  no_og_image: 3,
};

// Markets where a $2,000 site is a routine expense for an operating agency.
const HIGH_INCOME_COUNTRIES = new Set(['US', 'GB', 'IE', 'NL', 'DE', 'FR', 'BE', 'SE', 'NO', 'DK', 'CH', 'AT', 'CA', 'AU']);

export function redesignScore(lead) {
  if (!lead.website) return 70; // no site at all: they need one built
  let score = 0;
  for (const { code } of lead.issues) {
    let weight = ISSUE_WEIGHTS[code] ?? 0;
    // In Nigeria buyers expect to WhatsApp the agent, so a missing button matters more.
    if (code === 'no_whatsapp' && lead.country === 'NG') weight = 10;
    score += weight;
  }
  return Math.min(100, score);
}

export function budgetScore(lead) {
  let score = 0;
  const reviews = lead.reviews ?? 0;
  score += reviews >= 100 ? 40 : reviews >= 30 ? 30 : reviews >= 10 ? 20 : reviews >= 3 ? 10 : 0;
  if (lead.rating >= 4) score += 10;
  if (lead.website && !lead.issues.some((i) => i.code === 'free_builder')) score += 15; // pays for its own domain
  score += lead.listingLinks >= 20 ? 20 : lead.listingLinks >= 5 ? 10 : 0;
  score += lead.socials >= 2 ? 10 : lead.socials >= 1 ? 5 : 0;
  if (lead.emails?.length) score += 5;
  if (HIGH_INCOME_COUNTRIES.has(lead.country)) score += 20;
  return Math.min(100, score);
}

export function leadScore(lead) {
  return Math.round((lead.redesign * 0.55 + lead.budget * 0.45) * (lead.priority ?? 1));
}

export function pitch(lead) {
  if (!lead.website) return 'No website found: offer a full site with listings and WhatsApp enquiries.';
  if (lead.issues.some((i) => i.code === 'site_down')) return 'Their website is down or broken: offer a fast rebuild.';
  const top = [...lead.issues].sort((a, b) => (ISSUE_WEIGHTS[b.code] ?? 0) - (ISSUE_WEIGHTS[a.code] ?? 0)).slice(0, 3);
  return `Lead with: ${top.map((i) => i.label).join('; ')}.`;
}
