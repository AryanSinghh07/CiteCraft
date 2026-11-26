# 📚 Elevate Your Academic Publication Profile

> [!IMPORTANT]
> 🚧 **CiteCraft v2 is under active development.**
> A new version is being built with real user accounts, a cloud database (Supabase), saved publications, document storage, a support ticket system, research metrics, and a refreshed UI with animations.
> The live demo below still runs the current version. Follow progress on the [`v2-dev` branch](https://github.com/AryanSinghh07/CiteCraft/tree/v2-dev).

A sophisticated web-based tool designed for faculty members and researchers to **manage**, **analyze**, and **showcase** their academic publication records. Featuring elegant visualizations and powerful summaries, this platform helps elevate your scholarly profile with ease and professionalism.

🔗 **Live Demo (for demonstration purposes only):** [https://citecraft.netlify.app/](https://citecraft.netlify.app/)


🧪 **Demo Login:**
- **Email:** `aryan@example.com`
- **Password:** `aryan`

![Image](https://github.com/user-attachments/assets/d85629d2-10c2-49ac-a34d-a825000d544a)

![image](https://github.com/user-attachments/assets/fc58f906-a90e-408e-abb8-3240c039a8fa)

![image](https://github.com/user-attachments/assets/232062a1-4e23-4bf4-b9bb-0a4b3dc81746)

---

## ✨ Features

- 📄 **Publication Management**
  - Add, edit, or import publication details (BibTeX, DOI, manual entry).
  - Categorize publications by journal, conference, year, or topic.
  
- 📊 **Data Analysis**
  - Visualize trends in publishing frequency, citations, and co-authorship.
  - Generate charts for h-index, i10-index, and citation counts over time.

- 🌐 **Profile Showcase**
  - Create a beautiful, shareable academic profile with:
    - Publication list
    - Research interests
    - Institution affiliation
    - External links (Google Scholar, ORCID, etc.)

- 📥 **Export & Integration**
  - Export reports in PDF or HTML format.
  - Sync with platforms like Google Scholar, Scopus, or ORCID.

---

## 🗺️ v2 Roadmap

- [x] **Phase 1** — Real accounts (sign up, sign in, password reset), protected pages, saved publications, editable profile with photo upload, document library
- [x] **Phase 1.5** — Support ticket system: raise queries, threaded replies, attachments, internal notes, admin panel with stats, ratings
- [x] **Phase 2** — DOI lookup & bulk import (DOI / BibTeX), h-index & i10-index, export (CSV, BibTeX, APA / MLA / IEEE, printable PDF CV), shareable public profile at `/u/your-name`
- [x] **Phase 3** — Redesigned landing page, light / dark / system theme, page transitions, animated counters, new navigation with account menu, pages loaded on demand (37% less JavaScript on first visit)
- [x] **Phase 4** — AI summaries of any document (PDF, Word, PowerPoint, Excel, images…), redesigned dashboard and research insights
- [x] **Phase 5** — Student accounts (projects, theses, reports, preprints, posters), reading list with notes, free citation generator (APA, MLA, IEEE, Harvard, Chicago), scripted in-app assistant that answers questions and guides you through adding work and raising tickets

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Recharts
- **Backend**: Supabase (Auth, Postgres with Row Level Security, Storage, Edge Functions)
- **AI**: Claude (Anthropic API) via a Supabase Edge Function, for document summaries
- **Demo mode**: runs fully in the browser (localStorage + IndexedDB) when no backend is configured
- **Deployment**: Netlify

---

## 🚀 Getting Started

```bash
git clone https://github.com/AryanSinghh07/CiteCraft.git
cd CiteCraft
npm install
npm run dev
```

Open http://localhost:8080 — the app starts in demo mode.

- Connecting Supabase and deploying: [docs/SETUP.md](docs/SETUP.md)
- Folder structure and data stores: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
