# Setup Guide

CiteCraft runs in two modes:

| Mode | When | Where data lives |
|---|---|---|
| **Demo** | No Supabase keys set | This browser (localStorage + IndexedDB) |
| **Supabase** | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set | Supabase Postgres + Storage |

## 1. Run locally (demo mode)

```bash
npm install
npm run dev
```

Open http://localhost:8080 and sign in with one of the demo accounts, or create a new one:

| Account | Password | Role |
|---|---|---|
| `aryan@example.com` | `aryan` | admin — sample publications, ticket admin panel |
| `priya@example.com` | `priya123` | researcher — has two support tickets |

## 2. Connect Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run these files in order:
   - `supabase/migrations/0001_core_schema.sql` — profiles, publications, documents + security rules
   - `supabase/migrations/0002_storage.sql` — `avatars` and `documents` storage buckets
   - `supabase/migrations/0003_support_tickets.sql` — support ticket tables, rules and `ticket-attachments` bucket
   - `supabase/migrations/0004_public_profiles.sql` — opt-in public profile pages (`/u/<slug>`)

   The files are safe to run again. If the Supabase GitHub integration is enabled with
   `supabase` as the directory, they are also applied automatically when merged.
3. In **Authentication → URL Configuration**:
   - **Site URL**: `https://citecraft.netlify.app`
   - **Redirect URLs**: add `http://localhost:8080/**` and `https://citecraft.netlify.app/**`
4. In **Project Settings → API**, copy the **Project URL** and **anon / publishable key**.
5. Create `.env.local` in the project root (it is git-ignored):

   ```env
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

6. Restart `npm run dev`. The demo banner disappears and accounts are now real.

> Never put the **secret** (`sb_secret_…`) or `service_role` key in the app, `.env.local` or GitHub.
>
> The anon key is safe to expose in the browser — Row Level Security in the database
> ensures every user can only read and change their own data.

### Making yourself an admin (support ticket staff)

Sign up in the app first, then run in the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Sign out and back in; **Admin** appears in the navigation.

### Email confirmation

By default Supabase asks new users to confirm their email. Supabase's built-in email
sender is rate limited (a few emails per hour) — fine for testing; add your own SMTP
under **Authentication → Emails** before launch, or turn off **Confirm email** while developing.

## 3. Deploy on Netlify

`netlify.toml` already sets the build command, publish folder and SPA redirects.

1. Netlify → **Site configuration → Environment variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Trigger a redeploy. Without these variables the site still works in demo mode.

## External services

- **Crossref** (`api.crossref.org`) — DOI lookups for “Fill in from a DOI” and bulk DOI import.
  Free, no key needed. Only the DOI is sent.

## Optional: document summaries

The Documents tab can call an external summarization service. Set
`VITE_SUMMARY_API_URL` to a server that accepts `POST /upload` with a `document`
file field and returns `{ "summary": "..." }`. When unset, the button is hidden.
