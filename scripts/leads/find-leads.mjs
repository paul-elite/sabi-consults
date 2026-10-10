#!/usr/bin/env node
// Finds real estate companies whose websites look outdated and who can likely afford a
// ~$2,000 redesign. Writes a ranked CSV (open it in Excel or Google Sheets) and JSON.
//
//   node scripts/leads/find-leads.mjs [--config path] [--out dir] [--only Abuja,London] [--limit 50]
//
// Env: GOOGLE_PLACES_API_KEY (recommended), PAGESPEED_API_KEY (optional).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discover, dedupeKey, isOwnSite } from './discover.mjs';
import { auditSite } from './audit.mjs';
import { redesignScore, budgetScore, leadScore, pitch } from './score.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = parseArgs(process.argv.slice(2));
const config = JSON.parse(await readFile(args.config ?? join(here, 'config.json'), 'utf8'));
const outDir = args.out ?? 'leads-output';

if (args.only) {
  const wanted = args.only.toLowerCase().split(',');
  config.locations = config.locations.filter((l) => wanted.includes(l.name.toLowerCase()));
}
if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error('[leads] GOOGLE_PLACES_API_KEY not set: using OpenStreetMap (free, fewer results, no review counts).');
}

await mkdir(outDir, { recursive: true });
const history = await loadHistory(join(outDir, 'history.json'));
const today = new Date().toISOString().slice(0, 10);

let places = await discover(config);
if (args.limit) places = places.slice(0, Number(args.limit));
console.error(`[leads] auditing ${places.length} companies…`);

const leads = await mapLimit(places, config.concurrency, async (place, i) => {
  // A social page or portal profile in the website field means they have no site of their own.
  if (place.website && !isOwnSite(place.website)) place = { ...place, profileUrl: place.website, website: '' };
  const audit = place.website
    ? await auditSite(place.website, { timeoutMs: config.timeoutMs })
    : { reachable: false, issues: [], emails: [], socials: 0, listingLinks: 0 };
  const lead = { ...place, ...audit };
  lead.redesign = redesignScore(lead);
  lead.budget = budgetScore(lead);
  lead.score = leadScore(lead);
  lead.pitch = pitch(lead);
  const key = dedupeKey(place);
  lead.firstSeen = history[key] ?? today;
  lead.isNew = !history[key];
  history[key] = lead.firstSeen;
  if ((i + 1) % 10 === 0) console.error(`[leads] audited ${i + 1}/${places.length}`);
  return lead;
});

const qualified = leads
  .filter((l) => (l.website || config.includeNoWebsite) && l.redesign >= config.minRedesignScore && l.budget >= config.minBudgetScore)
  .sort((a, b) => b.score - a.score);

await writeFile(join(outDir, 'leads.json'), JSON.stringify(qualified, null, 2));
await writeFile(join(outDir, 'leads.csv'), toCsv(qualified));
await writeFile(join(outDir, 'all-checked.csv'), toCsv([...leads].sort((a, b) => b.score - a.score)));
await writeFile(join(outDir, 'history.json'), JSON.stringify(history, null, 2));

const fresh = qualified.filter((l) => l.isNew).length;
console.error(`[leads] ${qualified.length} qualified leads (${fresh} new) out of ${leads.length} checked → ${join(outDir, 'leads.csv')}`);
// Run summaries are public on public repos, so the workflow turns this off there.
if (process.env.GITHUB_STEP_SUMMARY && process.env.LEADS_SUMMARY !== 'off') await writeFile(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown(qualified, leads.length, fresh));

function toCsv(rows) {
  const cols = [
    ['score', (l) => l.score],
    ['new', (l) => (l.isNew ? 'yes' : '')],
    ['name', (l) => l.name],
    ['city', (l) => l.city],
    ['website', (l) => l.finalUrl || l.website],
    ['social_or_profile', (l) => l.profileUrl ?? ''],
    ['phone', (l) => l.phone],
    ['email', (l) => (l.emails ?? []).join(' ')],
    ['redesign_score', (l) => l.redesign],
    ['budget_score', (l) => l.budget],
    ['google_rating', (l) => l.rating ?? ''],
    ['google_reviews', (l) => l.reviews ?? ''],
    ['pitch', (l) => l.pitch],
    ['issues', (l) => l.issues.map((i) => i.label).join('; ')],
    ['address', (l) => l.address],
    ['maps', (l) => l.mapsUrl],
    ['first_seen', (l) => l.firstSeen],
  ];
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map(([h]) => h).join(','), ...rows.map((r) => cols.map(([, f]) => esc(f(r))).join(','))].join('\n') + '\n';
}

function summaryMarkdown(rows, checked, fresh) {
  const top = rows.slice(0, 25).map((l) => `| ${l.score} | ${l.isNew ? '🆕 ' : ''}${l.name} | ${l.city} | ${l.website || '—'} | ${l.pitch.replace(/\|/g, '/')} |`);
  return [`### ${rows.length} qualified leads (${fresh} new) from ${checked} companies`, '', '| Score | Company | City | Website | Pitch |', '|---|---|---|---|---|', ...top, '', 'Full list: download the **leads** artifact below.', ''].join('\n');
}

async function loadHistory(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return {};
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, limit) }, worker));
  return out;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') ? true : argv[++i];
  }
  return out;
}
