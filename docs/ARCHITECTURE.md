# Architecture

## Overview

```
 React UI (pages, features)
        │  hooks: useAuth, usePublications, useDocuments, useUpdateProfile
        ▼
 services/index.ts  ── picks one backend at startup ──┐
        │                                            │
        ▼                                            ▼
 services/supabase/*                          services/local/*
  Supabase Auth                                localStorage  (records)
  Postgres  (public schema)                    IndexedDB     (files)
  Storage   (avatars, documents)
```

The UI never calls Supabase or localStorage directly. It uses the interfaces in
`src/services/types.ts`, so a backend can change without touching components.

## Data stores — each for a different purpose

| Store | Holds | Why |
|---|---|---|
| **Postgres — academic data** | `profiles`, `publications`, `documents` | Relational data; each user can only reach their own rows (RLS) |
| **Postgres — support data** | `tickets`, `ticket_messages`, `ticket_attachments` | Separate tables with their own rules: requester + admin access, internal notes, status workflow enforced by triggers |
| **Supabase Storage** | `avatars` (public), `documents` (private), `ticket-attachments` (private) | Large binary files don't belong in table rows |
| **Browser localStorage** | demo-mode records | Lets the app work with no backend |
| **Browser IndexedDB** | demo-mode uploaded files | Files are too large for localStorage |

## Folder structure

```
CiteCraft/
├── docs/                      Setup and architecture docs
├── public/                    Static assets
├── supabase/
│   ├── functions/             Edge Function: summarize
│   └── migrations/            SQL run in order on the database
├── src/
│   ├── app/                   App root: providers + route table
│   ├── components/
│   │   ├── common/            Shared app components (LoadingScreen)
│   │   ├── layout/            Navbar, Footer, AuthLayout
│   │   └── ui/                shadcn/ui primitives
│   ├── config/                Environment configuration
│   ├── data/                  Seed data for demo mode
│   ├── features/              One folder per feature
│   │   ├── assistant/         scripted chat: widget, knowledge base, conversation engine
│   │   ├── auth/              context, hooks, LoginForm, SignupForm, ProtectedRoute
│   │   ├── dashboard/         dashboard sidebar cards (profile strength)
│   │   ├── documents/         DocumentUpload, DocumentViewer, useDocuments
│   │   ├── profile/           useUpdateProfile
│   │   ├── publications/      list, card, form, insights, work types + usePublications
│   │   ├── readingList/       reading list hook + helpers
│   │   ├── security/          password strength, security level, strength meter
│   │   ├── student/           college tools: timetable, tasks, attendance, CGPA, focus timer, hub
│   │   ├── summarizer/        file reader (PDF, Office, text…) + useSummaries
│   │   └── support/           ticket list, thread, reply box, admin controls, stats + useTickets
│   ├── hooks/                 Generic hooks (toast, mobile)
│   ├── lib/                   Library setup (Supabase client, cn util)
│   ├── pages/                 One component per route
│   ├── services/              Data access layer
│   │   ├── local/             Demo-mode backend
│   │   ├── supabase/          Supabase backend + row mappers
│   │   ├── types.ts           Backend interfaces
│   │   └── index.ts           Chooses the active backend
│   ├── types/                 Shared TypeScript types
│   └── utils/                 Pure helpers (summary stats, h-index / i10, safe URLs)
├── .env.example
└── netlify.toml
```

## Assistant (scripted)

The chat assistant (`features/assistant`) is rule-based and runs entirely in the browser — no
server, no AI, no cost, and it works in demo mode too.

- `script/knowledge.ts` — how-to topics with keywords and Markdown answers. **Add a topic to
  teach the bot something new.**
- `hooks/useAssistant.ts` — intent matching and guided flows (a small state machine): add a
  publication by DOI or step by step, add to the reading list, cite a DOI, show stats, search
  your work and raise a support ticket. Every flow shows a summary and asks **Yes / No** before
  saving, and "cancel" or "menu" resets it at any point. Saves go through the normal services,
  so database rules apply.

## Students

- `profiles.account_type` is `student` or `researcher` (chosen at sign-up, editable on Profile),
  with `program`, `year_of_study` and `supervisor` for students.
- Work types are defined once in `features/publications/utils/publicationTypes.ts`: journal,
  conference, book, chapter, **thesis, project, report, preprint, poster** and other. New types
  store their institution / repository / event in `publications.venue`.
- Students see "My work" wording, a student checklist, an Education section on the CV and
  student details on their public profile.
- `reading_list` table + `/reading-list` page: papers you read, with status and notes.
- `/cite` — a public citation generator (APA, MLA, IEEE, Harvard, Chicago); recent citations
  are kept in the visitor's browser only.

## College tools (students)

`/college` has five tabs, and a student's dashboard shows a daily **Student hub** (today's classes,
upcoming deadlines, attendance alerts, CGPA and a focus timer).

| Tab | Table | Notes |
|---|---|---|
| Timetable | `class_sessions` (+ `courses`) | weekly slots; overlap warning; NOW / NEXT |
| Assignments & exams | `student_tasks` | grouped Overdue / Today / 7 days / Later / Done |
| Attendance | `courses.attended / total / required_pct` | "you can miss N" / "attend the next N" |
| CGPA | `grade_entries`, `profiles.grade_scale` | SGPA, CGPA, % (×9.5), target planner |
| Focus timer | browser only | Pomodoro; sessions counted per day |

Calculations live in `features/student/utils.ts`; data goes through one generic
`CollectionService` per table (`services/*/student.ts`).

## Security

- **Account deletion** (`/security` → Delete account): the app deletes the user's stored files
  through the Storage API, then calls `delete_my_account()` (`0009`), which deletes the auth user —
  every table cascades from it. 2FA users must be in an `aal2` session.
- **Privacy policy** (`/privacy`) describes exactly these flows; keep it in sync when data handling changes.

- **Security page** (`/security`): a security level (Low / Medium / High) from email verified +
  strong password + 2FA; authenticator-app 2FA (Supabase MFA, QR code set-up); password change with a
  strength meter; sign out other devices; download all my data (JSON).
- **2FA sign-in**: `AuthProvider` only treats a session as signed in once any required 2FA code is
  verified (`pendingMfa` → `MfaChallenge`).
- **Database enforcement** (`0008_security.sql`): a restrictive policy on every user table and on
  storage requires an `aal2` session for users with a verified factor.
- **Passwords**: `features/security/passwordStrength.ts` rejects short, common and name-based
  passwords at sign-up, reset and change.
- **Headers** (`netlify.toml`): strict Content-Security-Policy (no inline scripts — the theme
  script lives in `public/theme-init.js`), `X-Frame-Options: DENY`, `nosniff`, HSTS and more.

## Summarizer

- **Quick summary** (`features/summarizer/utils/quickSummary.ts`): extractive, in the browser —
  sentences are scored by key-word frequency, position and the chosen focus, de-duplicated and
  kept in their original order. PDFs are read with PDF.js (`readDocumentText`), loaded only when needed.
- **AI summary**: the edge function below. If it isn't deployed or configured, `Summarize` falls
  back to the quick summary automatically.

### AI summary

```
 Browser                         Supabase Edge Function (Deno)              AI provider
 Summarize page ──POST──▶ functions/summarize ──stream──▶ language model
   reads the file:         · PDFs / images sent as-is
   PDF/images → base64     · text documents as a text block
   Office/ODF → JSZip text · streams NDJSON back, saves to document_summaries
```

- Summaries (and assistant replies) are rendered by `components/common/Markdown.tsx`, which builds React
  elements (never raw HTML) and drops non-http links.
- Demo mode has no server, so `services/local/ai.ts` explains how to enable the summarizer.

## Document viewer

`features/documents/components/DocumentViewer.tsx` previews any stored file in a dialog, entirely in the
browser. `features/documents/utils/viewerKind.ts` picks how to show it from the file name and type:

| Kind | Shown as |
|---|---|
| PDF | every page drawn with PDF.js on demand as you scroll, with zoom |
| Word / OpenDocument text | text extracted with JSZip |
| PowerPoint / OpenDocument slides | one card per slide |
| Excel / OpenDocument sheets, CSV / TSV | tables (first 1,000 rows) |
| Images, audio, video | native browser elements from an in-memory `blob:` URL |
| Markdown, notebooks | rendered with `components/common/Markdown.tsx` |
| Text and code | monospace with line numbers |
| HTML | text-only reading view — the page's scripts never run |

It is used by the document library, the Summarize page and support-ticket attachments. Files are fetched
only when the viewer opens, and anything it can't show gets a download button.

## Deployment

- **Netlify** builds `main` (`netlify.toml` holds the SPA redirect and security headers).
- **Docker**: `Dockerfile` builds the site and serves it with nginx (`docker/nginx.conf`, same headers).
- **CI** (`.github/workflows/ci.yml`): type check and build on every push and pull request.
- **Releases** (`.github/workflows/release.yml`): pushing a tag like `v2.1.0` publishes a GitHub Release with
  notes from `docs/releases/<tag>.md` and the built site, plus the image `ghcr.io/aryansinghh07/citecraft`.

## UI & performance

- **Theme:** `next-themes` with light / dark / system, saved as `citecraft-theme`. A tiny script in
  `index.html` applies it before first paint so there is no flash.
- **Animation helpers:** `AnimatedNumber` (count-up), `Reveal` (fade in on scroll) and the
  `animate-page-in` / `animate-fade-up` Tailwind animations. All respect *reduce motion*.
- **Code splitting:** every page except the landing page is `React.lazy` loaded. `vite.config.ts`
  puts big libraries in their own chunks (`charts`, `supabase`, `query`, `vendor`), so the charts
  library only downloads on pages that draw charts.

## Routes

| Path | Access |
|---|---|
| `/` | public |
| `/login`, `/signup` | signed-out only |
| `/forgot-password`, `/reset-password` | public |
| `/cite` | public — free citation generator |
| `/privacy` | public — privacy policy |
| `/u/:slug` | public — opt-in profile page (read through `get_public_profile()`, never exposes email) |
| `/dashboard`, `/profile`, `/summary`, `/cv`, `/summarize`, `/reading-list`, `/college`, `/security` | signed-in only (`ProtectedRoute`) |
| `/support`, `/support/:ticketId` | signed-in only — raise and follow tickets |
| `/admin/tickets` | admins only (`AdminRoute`) |

## Security

- Every table has Row Level Security; policies compare `auth.uid()` to the row owner.
- Storage paths start with the user's id; storage policies check that folder.
- `profiles.role` cannot be changed by users themselves (trigger), only via SQL / service role.
- A user's DOI must be unique within their own publications.
- Public profiles are opt-in. Visitors can only call `get_public_profile(slug)`, which returns
  safe fields; the tables themselves stay private. User-supplied links are rendered only if they
  are `http(s)` (`src/utils/safeUrl.ts`).

## Publications toolkit (`src/features/publications/utils`)

| File | Does |
|---|---|
| `doi.ts` | Crossref lookup, DOI normalising, duplicate detection for imports |
| `bibtex.ts` | BibTeX parser (LaTeX accents, `@string`/comments skipped) and exporter |
| `citations.ts` | APA 7, MLA 9 and IEEE formatting |
| `exporters.ts` | CSV (Excel-safe, formula-injection safe), .bib and reference list downloads |

## Support tickets

```
Open ──staff reply──▶ In Progress ──▶ Waiting on User ──user reply──▶ Open
  │                        │
  └────────────┬───────────┘
               ▼
           Resolved ──▶ Closed        (requester can reopen either)
```

| Who | Can |
|---|---|
| Requester | raise tickets, reply (until closed), attach files, close, reopen, rate 1–5 once resolved |
| Admin | see every ticket, reply, post **internal notes** (hidden from requester), change status / priority / category, assign to an admin |

Rules live in the database (`0003_support_tickets.sql`): RLS policies decide who sees what,
and triggers stamp requester/author details, block requesters from changing staff-only
fields and move the status when someone replies. Demo mode mirrors the same rules in
`src/services/local/tickets.ts`. Ticket views refresh every 15 seconds.
