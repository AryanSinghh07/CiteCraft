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

Open http://localhost:8080 and sign in with `aryan@example.com` / `aryan`, or create a new account.

## 2. Connect Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run these files in order:
   - `supabase/migrations/0001_core_schema.sql` — profiles, publications, documents + security rules
   - `supabase/migrations/0002_storage.sql` — `avatars` and `documents` storage buckets
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

> The anon key is safe to expose in the browser — Row Level Security in the database
> ensures every user can only read and change their own data. Never put the
> `service_role` key in the frontend.

### Making yourself an admin (for the upcoming ticket system)

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## 3. Deploy on Netlify

`netlify.toml` already sets the build command, publish folder and SPA redirects.

1. Netlify → **Site configuration → Environment variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Trigger a redeploy. Without these variables the site still works in demo mode.

## Optional: document summaries

The Documents tab can call an external summarization service. Set
`VITE_SUMMARY_API_URL` to a server that accepts `POST /upload` with a `document`
file field and returns `{ "summary": "..." }`. When unset, the button is hidden.
