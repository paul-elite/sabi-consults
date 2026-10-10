# Lead finder

Finds real estate companies whose websites look outdated and that can probably afford a ~$2,000 redesign.
It runs every Monday on GitHub Actions and adds the results to **your own Google Sheet**.
Nothing is saved to the Sabi Consults website or its database.

## How it works

1. **Find companies** in each city in [`config.json`](config.json) (Abuja first, plus London, Manchester, Dublin, Houston and Atlanta by default).
   It uses the Google Places API if a key is set, and the free but sparser OpenStreetMap data if not.
2. **Check each website**: mobile-friendly, HTTPS, old copyright year, outdated code (old jQuery, Bootstrap or WordPress, Flash, table layouts), slow loading, free website-builder address, no WhatsApp button, no enquiry form, missing Google/social-sharing tags. It also picks up the public contact email.
   Companies whose "website" is only an Instagram/Facebook page or a portal profile are treated as having **no website**.
3. **Score them** from 0 to 100:
   - **redesign_score**: how clearly the site needs replacing (no site at all scores 70).
   - **budget_score**: Google review count and rating, own domain, number of listings, social accounts, and the market (US/UK/EU agencies get a boost).
   - **score**: the two combined, weighted by each city's `priority`.
4. **Send to Google Sheets**: qualified leads go to a **Leads** tab, each with a suggested pitch line. New companies are added at the bottom with status **New**. Companies already in the sheet get updated scores, and your **status** and **notes** columns are never overwritten, so you can track outreach right in the sheet (status dropdown: New, Contacted, Replied, Meeting, Won, Not interested).
   Each run also writes `leads.csv`, `all-checked.csv` and `leads.json` to the output folder.

## Set up (once)

1. In Google Cloud, create an API key with **Places API (New)** enabled (billing must be on; the default settings make about 70 searches a week).
   Optional: enable **PageSpeed Insights API** on the same key to add Google's mobile speed score.
2. In GitHub, go to **Settings > Secrets and variables > Actions** and add `GOOGLE_PLACES_API_KEY` (and optionally `PAGESPEED_API_KEY`).
3. Connect your Google Sheet (below).
4. Go to **Actions > Find redesign leads > Run workflow** to try it now, then open your sheet.

## Connect your Google Sheet

1. Create a new Google Sheet, for example "Redesign leads".
2. Open **Extensions > Apps Script**. Delete what's there, paste in everything from [`google-sheet.gs`](google-sheet.gs), and change `SECRET` on line 9 to a long random phrase. Click **Save**.
3. Click **Deploy > New deployment**, choose type **Web app**, set **Execute as: Me** and **Who has access: Anyone**, then click **Deploy**. Allow the permissions Google asks for (it may say the app is unverified: choose **Advanced > Go to … (unsafe)**; it's your own script).
4. Copy the **Web app URL** (it ends in `/exec`).
5. In GitHub, add two more Actions secrets: `LEADS_SHEET_URL` (that URL) and `LEADS_SHEET_SECRET` (the phrase from step 2).

"Anyone" only means the script's URL can be called without a Google sign-in. The sheet itself stays private, and the script rejects any request without your secret.
If you edit the script later, use **Deploy > Manage deployments > Edit > New version** so the URL stays the same.

Without a sheet set up, the leads are attached to each GitHub run as a downloadable **leads** file instead.

## Run it on your computer

```bash
GOOGLE_PLACES_API_KEY=... LEADS_SHEET_URL=... LEADS_SHEET_SECRET=... npm run leads -- --only Abuja
```
Leave out the two sheet variables to only write files. Files go to `leads-output/`. Options: `--only Abuja,London`, `--limit 30` (check fewer companies), `--config my-config.json`, `--out folder`.

## Tuning

Edit `config.json`:
- `locations`: add or remove cities (name, country code, centre lat/lon, radius, priority 0–1).
- `queries`: the search phrases.
- `minRedesignScore` / `minBudgetScore`: raise them for fewer, stronger leads.
- `includeNoWebsite`: whether companies without a site count as leads.

Issue weights and budget signals live in [`score.mjs`](score.mjs).

## Before you reach out

- Check each lead by hand: the scores are a shortlist, not a verdict.
- UK and EU businesses are covered by GDPR/PECR. Cold-emailing a company's generic address (info@…) about a relevant service is generally fine; keep it short, say how you found them, and honour opt-outs. US emails need a working unsubscribe line (CAN-SPAM).
- With the Google Sheet connected, your lead list never appears on GitHub. Run logs show only counts.
