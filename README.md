# RAMA Door

RAMA Group's booking platform for brands in Bahrain. One homepage, three services:

| Service | What a brand can do |
|---|---|
| **Influencers** | Browse the RAMA rate card, build a package (videography, Snapchat, sponsored ads, one or two rounds), send offers, negotiate, run campaigns, tick off deliverables. |
| **Outdoors** | Booking.com-style search with a map of Bahrain: price pins per site, weekly availability, booking requests. |
| **PR and media** | A newsstand of Bahrain newspapers and magazines. Book print ads by column-cm or page size, advertorials, online and social placements, and PR services. Everything goes into an insertion order with 10% VAT. |

Light and dark mode, Arabic labels, mobile layout included.

---

## Tech stack

- **Next.js 14** (App Router, TypeScript): website and server actions in one codebase
- **Supabase**: Postgres database, sign-in by email link, row level security
- **Fonts**: Bricolage Grotesque (headings), Hanken Grotesk (text), Readex Pro (Arabic), from Google Fonts
- **Hosting**: any Node host. Vercel is the simplest.

## Project layout

```
src/
  app/
    page.tsx                  Homepage with the three doors
    (app)/layout.tsx          Workspace shell: sidebar, data loading, demo banner
    (app)/influencers/...     Discover, Campaigns, Offers
    (app)/outdoors/...        Map explorer, Bookings
    (app)/pr/...              Newsstand, PR services, Orders
    actions.ts                Server actions that save to Supabase
    login/, auth/             Email sign-in and sign-out
    globals.css               The whole design system (colours, type, components)
  components/                 React components per service + shared UI and store
  lib/
    pricing.ts                Rate card logic, column-cm pricing, VAT
    data.ts                   Reads from Supabase, falls back to the built-in data
    seed/*.json               Rate card, outdoor sites, media outlets, PR packages
    bahrain-map.ts            Simplified Bahrain outline for the Outdoors map
supabase/
  migrations/                 Database tables and security rules
  seed.sql                    Data to load (generated from src/lib/seed)
public/logo.png               RAMA logo
```

---

## Step by step: run it on your computer

You need **Node.js 18.18 or newer** (download from nodejs.org).

1. Download the code: on GitHub click **Code → Download ZIP**, or run `git clone <your repo link>`.
2. Open a terminal in the project folder and run:
   ```bash
   npm install
   npm run dev
   ```
3. Open http://localhost:3000.

Without any keys the app runs in **demo mode**: everything works, but changes are kept in the browser tab only, and creator replies and confirmations are simulated.

## Step by step: connect the database (Supabase)

1. Create a free account at **supabase.com** and click **New project**. Choose the region closest to Bahrain (for example Frankfurt or Mumbai) and save the database password somewhere safe.
2. In the project, open **SQL Editor → New query**, paste each file in `supabase/migrations/` (in name order) and click **Run**.
3. Open another new query, paste `supabase/seed.sql` and click **Run**. This loads the 20 influencers, the outdoor sites, the 8 media outlets and the PR packages.
4. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.
5. In the project folder, copy `.env.example` to a new file called `.env.local` and paste the two values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
6. In Supabase go to **Authentication → URL Configuration** and add `http://localhost:3000/auth/callback` (and later your live address, for example `https://door.rama.bh/auth/callback`) to **Redirect URLs**.
7. Restart `npm run dev`. Brands now sign in with an email link and their campaigns, offers, bookings and orders are saved.

## Step by step: put it online (Vercel)

1. Sign in at **vercel.com** with your GitHub account and click **Add New → Project**.
2. Pick the `rama-door` repository and click **Import**.
3. Under **Environment Variables** add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the same values as above.
4. Click **Deploy**. Every new push to GitHub redeploys automatically.
5. To use your own domain, open the project in Vercel → **Settings → Domains**.

---

## Adding real data

The RAMA team edits the catalogue in Supabase (**Table Editor**), no code needed:

| Table | What to fill in |
|---|---|
| `creators` | Name, nickname, the 12 rate card prices, and later photo, Instagram/TikTok/Snapchat handles, followers, categories, audience |
| `outdoor_sites` | Name, format, area, **latitude and longitude** (right-click a spot in Google Maps to copy them), size, faces, lighting, daily views, weekly price, photo |
| `outdoor_site_weeks` | One row per site per booked week (the Monday date) |
| `media_outlets` | Column-cm rate for dailies, page prices for magazines, website and Instagram prices |
| `pr_packages` | PR services and prices |

Brand requests arrive in `offers`, `campaigns`, `outdoor_bookings` and `insertion_orders`. Change a row's `status` to `Confirmed` / `Accepted` to confirm it.

**About the data in this repository**

- `creators.json`: the real RAMA influencer rate card.
- `outdoor-sites.json`, the media outlet **rates** and `pr-packages.json`: **sample values** for the demo. Replace them with RAMA's real inventory and media agreements.
- If you change the JSON files, run `npm run seed:sql` to regenerate `supabase/seed.sql`.

## Automatic Instagram sync

Creator details (followers, following, posts, bio, name and profile photo) come from the
**"Influencers IG - INF Profile"** Google Sheet. The Supabase Edge Function `sync-instagram`
(`supabase/functions/sync-instagram`) reads that sheet **every hour** and:

- updates every creator whose Instagram username is in the sheet,
- adds new usernames as creators (they appear under **All creators** until RAMA adds rate card prices),
- copies profile photos into the `creator-photos` Storage bucket, because Instagram photo links expire after a few weeks.

**Connect the sheet (one time):**
1. In Google Sheets open the profile sheet, then **File → Share → Publish to web**.
2. Choose the profile tab and **Comma-separated values (.csv)**, click **Publish** and copy the link.
3. In Supabase go to **Edge Functions → Secrets**, add `SHEET_CSV_URL` and paste the link.

The schedule lives in `supabase/migrations/20261015000100_instagram_sync_schedule.sql`.
To run a sync straight away, open **Edge Functions → sync-instagram → Test** and send a request to `?force=1`.

Linking a creator to a rate card: in **Table Editor → creators**, the rate card creators already have their
`username` set. For a new creator, add the 12 prices in the `rates` column of their row.

## The rate card format

Each creator has 12 prices (BD), in this order:

| | Full scope (Story, Reel, TikTok, Snapchat) | Scope (no Snapchat) | Full scope + 10 days ads | Scope + 10 days ads |
|---|---|---|---|---|
| With videography | 0 | 1 | 2 | 3 |
| Without videography | 4 | 5 | 6 | 7 |
| Package of 2, with videography | 8 | 9 | 10 | 11 |

## Next steps

- Creator side: creators sign in, set their own prices and reply to offers (replaces the simulated replies)
- RAMA admin screens to confirm bookings and orders
- Real map (Google Maps or Mapbox) and site photos
- Full Arabic version (right to left)
- Online payment
