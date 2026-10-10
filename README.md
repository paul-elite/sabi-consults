# Sabi Consults – real estate website for Abuja

A mobile-first property website with an admin area, built with Next.js 16, Tailwind CSS 4 and Supabase.
Any company can run its own copy: the name, logo and colours are set from the admin area, not the code.

## What's included

**Website:** homepage search, land and house listings with plot sizes and unit types, property pages with a sticky Call / WhatsApp bar on phones, an Abuja map, blog, team, services and contact pages.

**Admin (`/admin`):**

| Role | Can do |
|---|---|
| Super admin | Everything, plus **Branding** (name, logo, colours) and **Staff accounts** |
| Admin | Listings, inquiries, blog, team and contact settings |
| Staff | Listings, inquiries, blog and team |

The owner sign-in from `ADMIN_EMAIL` / `ADMIN_PASSWORD` is always a super admin, so a new copy can be set up before any accounts exist.

## Set up a new copy (about 15 minutes)

### 1. Get the code
Fork this repository on GitHub (or "Use this template"), then:
```bash
git clone https://github.com/YOUR-ACCOUNT/sabi-consults.git
cd sabi-consults
npm install
```

### 2. Create the database
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`supabase/setup.sql`](supabase/setup.sql) and click **Run**.
   This creates every table, security rule and the `images` storage bucket. It's safe to run again later.
3. Optional: run [`supabase/seed.sql`](supabase/seed.sql) to add sample Abuja listings and team members.
4. From **Project Settings > API**, copy the Project URL, the `anon` key and the `service_role` key.

### 3. Configure
```bash
cp .env.local.example .env.local
```
Fill in the Supabase values, your owner email and password, and a `SESSION_SECRET` (`openssl rand -base64 32`).

### 4. Run it
```bash
npm run dev
```
Open http://localhost:3000, then sign in at http://localhost:3000/admin.

### 5. Make it yours
In the admin area, as the owner:
1. **Branding**: company name, tagline, logo, browser icon and colour palette. Changes show across the site on save.
2. **Contact settings**: phone, WhatsApp number, email, address and Instagram handle.
3. **Staff accounts**: give each person their own sign-in and role, so nobody shares the owner password.

### 6. Deploy to Vercel
1. Push your repository to GitHub.
2. In Vercel, **Add New > Project** and import it.
3. Add every variable from `.env.local.example` under **Environment Variables**.
4. Deploy, then add your domain under **Settings > Domains**.

## Updating an existing database
Run `supabase/setup.sql` again. It only adds what's missing (new columns, the super admin role, brand settings) and never deletes data. The old step-by-step scripts are in `supabase/legacy/` for reference only. Don't run `legacy/migration-v2.sql`: it drops the properties table.

## Project structure
```
src/
  app/(site)/        public pages
  app/admin/         admin pages (branding, users, properties, blog, team, settings)
  app/api/           API routes; every write checks the signed-in role
  components/        Header, Footer, Logo, BrandProvider, admin navigation, etc.
  lib/auth.ts        sessions, password hashing, roles
  lib/brand.ts       loads branding from the database
  lib/brand-shared.ts palettes, colour and contrast helpers
supabase/
  setup.sql          the whole database, in one idempotent script
  seed.sql           optional sample data
```

## How branding works
Brand values live in the `site_settings` table (`brand_name`, `brand_logo_url`, `brand_color_primary`, …).
The root layout reads them and sets CSS variables (`--color-brand`, `--color-ink`, `--color-surface`) on the page.
Tailwind classes such as `bg-brand`, `text-ink` and `bg-surface` use those variables, so use these classes
(not hard-coded hex colours) when adding new UI, and it will follow the palette automatically.

## Security notes
- Sessions are HMAC-signed, HTTP-only cookies; passwords are hashed with scrypt.
- The `service_role` key stays on the server. The browser only uses the `anon` key, which row-level security limits to published content and sending inquiries.
- Sign-in attempts are rate-limited per IP and email.

## Scripts
`npm run dev` · `npm run build` · `npm start` · `npm run typecheck`

`npm run leads` finds real estate companies that may need a website redesign. It runs weekly on GitHub Actions and sends results to your Google Sheet; see [`scripts/leads/README.md`](scripts/leads/README.md).
