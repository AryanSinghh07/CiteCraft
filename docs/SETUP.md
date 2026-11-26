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
   - `supabase/migrations/0005_ai_features.sql` — AI usage limits and saved document summaries
   - `supabase/migrations/0006_students.sql` — student accounts, new work types (thesis, project…) and the reading list
   - `supabase/migrations/0007_student_tools.sql` — courses & attendance, timetable, assignments/exams and grades (CGPA)
   - `supabase/migrations/0008_security.sql` — enforces two-factor authentication in the database for users who turn it on
   - `supabase/migrations/0009_account_deletion.sql` — lets users delete their own account (Security → Delete account)

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

### Two-factor authentication

Authenticator-app (TOTP) 2FA is enabled by default on Supabase projects. Check it under
**Authentication → Sign In / Providers → Multi-Factor** (*TOTP: Enabled*). Users turn it on from
**Security** in the app; after `0008_security.sql`, their data can only be reached from a session that
passed the code check.

### Email confirmation

By default Supabase asks new users to confirm their email. Supabase's built-in email
sender is rate limited (a few emails per hour) — fine for testing; add your own SMTP
under **Authentication → Emails** before launch, or turn off **Confirm email** while developing.

## 3. Deploy on Netlify

`netlify.toml` already sets the build command, publish folder, SPA redirects and **security
headers** (Content-Security-Policy, no framing, no MIME sniffing, HSTS). If you add a new external
service, add its domain to `connect-src` in the policy or the browser will block it.

1. Netlify → **Site configuration → Environment variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Trigger a redeploy. Without these variables the site still works in demo mode.

## Privacy policy contact

Set `VITE_CONTACT_EMAIL` (in `.env.local` and in Netlify) to the address shown on `/privacy` for
account-recovery and data requests. Without it, the page points people to Help & Support only.

## External services

- **Crossref** (`api.crossref.org`) — DOI lookups for “Fill in from a DOI” and bulk DOI import.
  Free, no key needed. Only the DOI is sent.

## 4. Document summarizer

The **Quick summary** works out of the box: it runs in the browser (PDF.js for PDFs, JSZip for
Office files) and needs no server or key. The **AI summary** below is optional; until it is
deployed, the app automatically falls back to the quick summary.

### AI summary (optional)

The summarizer runs as a **Supabase Edge Function** (`supabase/functions/summarize`) and
calls Claude with your Anthropic API key. (The chat assistant is scripted and runs in the
browser — it needs no server or key.) The key is
stored as a Supabase secret — it never reaches the browser or GitHub.

1. Create an API key at [console.anthropic.com](https://console.anthropic.com) → **API Keys**
   (billing must be set up on that account).
2. Run `supabase/migrations/0005_ai_features.sql` (see step 2 above).
3. Deploy the functions with the Supabase CLI, from the project folder:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy summarize --no-verify-jwt
   ```

   `--no-verify-jwt` is intentional: the function checks the signed-in user itself
   (`auth.getUser`), which also works with Supabase's newer signing keys.

   *Without the CLI:* Supabase Dashboard → **Edge Functions** → **Deploy a new function** →
   **Via editor**, name it `summarize`, paste `supabase/functions/summarize/index.ts` and turn off
   **Verify JWT** in its settings. Add the secret under
   **Edge Functions → Secrets**.

### Optional settings (Edge Functions → Secrets)

| Secret | Default | Purpose |
|---|---|---|
| `SUMMARY_MODEL` | `claude-opus-5-5` | Model for document summaries |
| `AI_DAILY_SUMMARY_LIMIT` | `25` | Summaries per user per 24 h |

Usage is billed to your Anthropic account per token. The daily limits protect you from a
single account running up costs; lower them or pick a cheaper model to spend less.
