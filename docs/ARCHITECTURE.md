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
│   │   ├── auth/              context, hooks, LoginForm, SignupForm, ProtectedRoute
│   │   ├── documents/         DocumentUpload + useDocuments
│   │   ├── profile/           useUpdateProfile
│   │   ├── publications/      list, card, form, summary + usePublications
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
| `/u/:slug` | public — opt-in profile page (read through `get_public_profile()`, never exposes email) |
| `/dashboard`, `/profile`, `/summary`, `/cv` | signed-in only (`ProtectedRoute`) |
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
