# Trip Expense Manager

React + Vite web app for splitting family trip expenses, built from the
`untitled/project/Trip Expense Prototype.dc.html` design handoff.

## Setup

1. **Supabase project**: open your Supabase project's SQL editor and run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This creates all
   tables, RLS policies, seed categories, and the `slips` storage bucket.
2. **Environment**: copy `.env.example` to `.env.local` and fill in your project's
   URL and anon key (Project Settings → API in the Supabase dashboard):
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. **Install & run**:
   ```
   npm install
   npm run dev
   ```

## How accounts work

There's no email login screen — people sign up with just a username and
password. Under the hood this maps to Supabase Auth via a synthetic email
(`username@trip.local`), so no real email/inbox is needed.

## How people share a trip

The trip creator picks members from everyone who already has an account.
Anyone else joins later with the trip's invite code (shown in the toast after
creating a trip, and stored on the trip itself) via "เข้าร่วมด้วยรหัสเชิญ" on
the trips screen.
