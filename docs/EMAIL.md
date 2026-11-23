# Email, CRM and automation

Email is connected to every step of the customer journey: enquiry, follow-up,
inspection, transaction, retention and referral. This document explains how it
works and how to set it up.

## Architecture

```
 Website forms / admin actions
        │  (store the enquiry, booking, sale…)
        ▼
  app_events  ──►  worker  ──►  automations (trigger → conditions → steps)
  (event bus)        │                  │
                     │                  ▼
                     └──────────►  email_messages (queue, one row per email)
                                        │  batched, rate-limited, idempotent
                                        ▼
                                     Resend  ──► webhook ──► email_events
```

* **One provider: Resend** for transactional and marketing email. Audiences,
  consent, campaigns and workflows live in our own Supabase database, so there
  is one source of truth and no second marketing platform to keep in sync.
* **Event-driven.** Business code only records what happened
  (`inquiry.created`, `inspection.booked`, `property.price_changed`…). The worker
  decides what to send. New channels (SMS, WhatsApp) can subscribe to the same
  events later without touching business logic.
* **Never blocks a page.** Forms store their record and return. A short worker
  pass runs right after the response (`after()`), and the scheduled worker runs
  every minute, so confirmations go out within seconds.
* **No duplicates.** Every email has a unique `idempotency_key` (enforced by the
  database) which is also sent to Resend as its `Idempotency-Key`. Events have a
  unique `dedupe_key`; workflow steps are logged per `(run, step)`. Queues are
  claimed with `FOR UPDATE SKIP LOCKED`, so parallel workers never take the same
  item, and stuck items are released after a timeout.
* **Live data.** Emails are rendered at send time from the database: current
  price, availability, inspection time and agent. A reminder for an inspection
  that moved, or a promotion for a property that sold, is skipped automatically.

### Email categories and consent

| Category | Examples | Sent when |
|---|---|---|
| Transactional | Enquiry confirmation, inspection booking, payment receipt | Always, unless the address bounced or reported spam |
| Follow-up (service) | Post-enquiry follow-ups, price change on a watched property | Unless the person opted out of follow-ups or unsubscribed |
| Marketing | Newsletters, new listings, birthday, re-engagement | Only with explicit, recorded consent (double opt-in by default) |
| Internal | New lead alerts, inspection updates | To staff only |

Enquiring never subscribes anyone to marketing: the consent box on every form
is optional and unticked. Every consent change is stored in `consent_records`
with time, source and wording (NDPA accountability). Marketing and follow-up
emails carry a working unsubscribe link and RFC 8058 one-click unsubscribe headers.

### Attribution

Clicks go through `/api/email/c/<message>` (signed, so it can't be used as an
open redirect), which adds UTM tags and sets a 7-day first-party cookie.
* **Direct:** an enquiry, inspection or lead within 7 days of a click.
* **Assisted:** the person clicked an email in the previous 30 days (90 for sales)
  but came back another way.
Receiving an email is never counted. Opens are reported as an estimate only.

## Where things are

| Path | What |
|---|---|
| `supabase/migration-email.sql` | All tables, queues, scoring and analytics functions |
| `src/lib/email/` | Engine: `events`, `automations`, `send`, `render`, `context`, `handlers`, `worker`, `attribution` |
| `src/lib/email/defaults.ts` | Built-in templates and workflows (seeded into the DB on first use) |
| `src/app/api/email/` | Admin and public email APIs, worker, webhook, tracking |
| `src/app/admin/email/` | Email & marketing module |
| `src/app/admin/inspections`, `/admin/transactions` | Sales operations |
| `/newsletter`, `/guides`, `/email/*` | Public sign-up, guides, preferences, unsubscribe |

## Setup checklist

1. **Database:** run `supabase/migration-email.sql` (safe to re-run).
2. **Resend:** create an account, add and verify the sending domain
   (`sabiconsults.com.ng`). Resend gives the SPF and DKIM records; add them at
   the DNS host. Add DMARC too: `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:you@…`.
3. **Vercel environment variables** (Production), then redeploy:
   * `RESEND_API_KEY`
   * `RESEND_WEBHOOK_SECRET` (after step 4)
   * `CRON_SECRET` (`openssl rand -hex 32`)
   * `NEXT_PUBLIC_SITE_URL=https://sabiconsults.com.ng`
4. **Resend webhook:** add `https://sabiconsults.com.ng/api/email/webhooks/resend`
   for all email events; copy the signing secret into `RESEND_WEBHOOK_SECRET`.
5. **Admin → Email & marketing → Settings:** set the sender address (on the
   verified domain), reply-to (e.g. the Google Workspace inbox) and who receives
   team notifications. The page shows a live status for every item above.
6. **Scheduler:** Supabase `pg_cron` calls the worker every minute (see
   `supabase/migration-email-schedule.sql`, which stores `CRON_SECRET` in Supabase
   Vault). `vercel.json` also runs it daily as a backup.
7. **Guides:** upload a PDF for each guide in Email settings and publish it.

Until steps 2–5 are done, emails are queued and held with the reason shown in
the delivery log. They are never reported as sent. Held emails expire (48h for
transactional, 7 days for marketing) rather than going out late.

## Tests

`npx tsx scripts/test-email.ts` checks rendering, escaping, conditions, consent
rules, link signing, workflow validation, CSV handling and alert matching.
