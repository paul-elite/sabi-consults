# Sabi Consults - Premium Real Estate in Abuja

A modern, search-first real estate website built with Next.js 16, Tailwind CSS, TypeScript, and Supabase.

## Features

### Public Features
- **Search-First Homepage**: Central search module with location, property type, and price filters
- **Property Listings**: Clean, editorial property cards with filtering by district
- **Property Details**: Large imagery, structured information, and interactive map
- **Abuja Map**: Simplified black & white map showing property locations
- **WhatsApp Integration**: Click-to-chat CTAs throughout the site
- **Contact Forms**: Lead capture with property-specific inquiries
- **Responsive Design**: Mobile-first, premium experience on all devices

### Admin Dashboard
- **Staff Authentication**: Secure login for property management
- **Property Management**: Add, edit, and delete property listings
- **Map Preview**: Visual coordinates picker when adding properties
- **Inquiry Management**: View and manage contact form submissions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Maps**: Leaflet with CartoDB grayscale tiles
- **Authentication**: Cookie-based sessions

## Getting Started

### 1. Clone and Install

```bash
cd sabi-consults
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)

2. Go to **SQL Editor** and run the schema from `supabase/schema.sql`

3. Get your API keys from **Settings > API**:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 3. Configure Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin (change these!)
ADMIN_EMAIL=admin@sabiconsults.com
ADMIN_PASSWORD=SabiAdmin2024!

# WhatsApp
NEXT_PUBLIC_WHATSAPP_NUMBER=2348000000000
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes (Supabase)
│   ├── properties/        # Property pages
│   ├── about/             # About page
│   ├── services/          # Services page
│   ├── contact/           # Contact page
│   └── page.tsx           # Homepage
├── components/            # React components
├── data/                  # Static data (districts, testimonials)
└── lib/
    ├── supabase/          # Supabase client & types
    ├── properties.ts      # Property data functions
    └── types.ts           # TypeScript types
```

## Database Schema

### Properties Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Property title |
| description | text | Full description |
| price | bigint | Price in Naira |
| price_label | text | e.g., "Per Annum" |
| type | text | 'sale' or 'rent' |
| property_type | text | house/apartment/villa/land/commercial |
| district | text | Abuja district |
| address | text | Full address |
| latitude | float | Map coordinate |
| longitude | float | Map coordinate |
| bedrooms | int | Number of bedrooms |
| bathrooms | int | Number of bathrooms |
| size | int | Size in sqm |
| images | text[] | Image URLs |
| features | text[] | Feature list |
| status | text | available/sold/rented/pending |
| featured | boolean | Show on homepage |

### Inquiries Table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Contact name |
| email | text | Contact email |
| phone | text | Contact phone |
| message | text | Inquiry message |
| property_id | uuid | Related property (optional) |
| status | text | new/contacted/closed |

## Admin Access

Access the admin panel at `/admin`

Default credentials (change in production):
- **Email**: admin@sabiconsults.com
- **Password**: SabiAdmin2024!

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your-production-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAIL=your-secure-email
ADMIN_PASSWORD=your-secure-password
NEXT_PUBLIC_WHATSAPP_NUMBER=your-whatsapp-number
```

## Districts Covered

- Maitama
- Asokoro
- Wuse II
- Jabi
- Gwarinpa
- Katampe
- Life Camp
- Utako

## Customization

### Colors

Edit `src/app/globals.css`:

```css
@theme {
  --color-charcoal: #1a1a1a;
  --color-accent: #8b7355;
}
```

### WhatsApp Number

Update in `.env.local`:
```env
NEXT_PUBLIC_WHATSAPP_NUMBER=your-number
```

## License

Private - Sabi Consults
