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
| **Postgres — `public` schema** | profiles, publications, documents metadata | Relational data with per-user security (RLS) |
| **Postgres — `support` schema** *(Phase 1.5)* | tickets, ticket messages | Kept separate from academic data, own access rules |
| **Supabase Storage** | profile photos (public bucket), uploaded papers (private bucket) | Large binary files don't belong in table rows |
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
│   │   └── publications/      list, card, form, summary + usePublications
│   ├── hooks/                 Generic hooks (toast, mobile)
│   ├── lib/                   Library setup (Supabase client, cn util)
│   ├── pages/                 One component per route
│   ├── services/              Data access layer
│   │   ├── local/             Demo-mode backend
│   │   ├── supabase/          Supabase backend + row mappers
│   │   ├── types.ts           Backend interfaces
│   │   └── index.ts           Chooses the active backend
│   ├── types/                 Shared TypeScript types
│   └── utils/                 Pure helpers (summary statistics)
├── .env.example
└── netlify.toml
```

## Routes

| Path | Access |
|---|---|
| `/` | public |
| `/login`, `/signup` | signed-out only |
| `/forgot-password`, `/reset-password` | public |
| `/dashboard`, `/profile`, `/summary` | signed-in only (`ProtectedRoute`) |

## Security

- Every table has Row Level Security; policies compare `auth.uid()` to the row owner.
- Storage paths start with the user's id; storage policies check that folder.
- `profiles.role` cannot be changed by users themselves (trigger), only via SQL / service role.
- A user's DOI must be unique within their own publications.
