<div align="center">

<img src="public/android-chrome-192x192.png" alt="CiteCraft logo" width="88" />

# CiteCraft

**Your academic workspace — publications, research metrics, document summaries and everyday college tools, in one place.**

[![Release](https://img.shields.io/github/v/release/AryanSinghh07/CiteCraft?label=release&color=2563eb)](https://github.com/AryanSinghh07/CiteCraft/releases)
[![CI](https://github.com/AryanSinghh07/CiteCraft/actions/workflows/ci.yml/badge.svg)](https://github.com/AryanSinghh07/CiteCraft/actions/workflows/ci.yml)
[![Docker image](https://img.shields.io/badge/docker-ghcr.io%2Faryansinghh07%2Fcitecraft-7c3aed?logo=docker&logoColor=white)](https://github.com/AryanSinghh07/CiteCraft/pkgs/container/citecraft)
[![License: MIT](https://img.shields.io/badge/license-MIT-10b981)](LICENSE)

[Live site](https://citecraft.netlify.app/) · [Releases](https://github.com/AryanSinghh07/CiteCraft/releases) · [Setup guide](docs/SETUP.md) · [Architecture](docs/ARCHITECTURE.md)

<img src="docs/screenshots/v2/dashboard.png" alt="CiteCraft v2 dashboard" width="100%" />

</div>

---

## ✨ What's new in v2

v1 was a front-end demo for faculty members: a single hard-coded account, sample publications and a few charts. **v2 is a complete application** with real accounts, a cloud database, and tools for both researchers and students.

| | v1 | v2 |
|---|:---:|:---:|
| Accounts | One demo login, nothing saved | Sign up, sign in, password reset, **two-factor authentication** |
| Data | Sample data in the page | Supabase Postgres with row-level security — or demo mode in the browser |
| Publications | Add / edit by hand | Add, edit, **DOI lookup**, **bulk import** (DOI list or BibTeX) |
| Metrics | Totals and a pie chart | **h-index**, **i10-index**, citations over time, venues, collaborators, topics |
| Export | — | CSV, BibTeX, APA / MLA / IEEE, printable PDF CV |
| Profile | Private page | Shareable **public profile** at `/u/your-name` |
| Documents | — | Private library with an **in-app viewer for every file type** |
| Summaries | — | Summarize any document — AI or free in-browser quick summary |
| Students | — | Student accounts, **College** tools, reading list, citation generator |
| Help | — | Support tickets with admin panel, and an in-app guide |
| Look & feel | Light only | Redesigned UI, **light / dark / system theme**, animations, mobile layout |
| Security | — | Security level, 2FA enforced in the database, strict security headers, account deletion |

---

## 🖼️ Before and after

<table>
  <tr>
    <th width="50%">v1</th>
    <th width="50%">v2</th>
  </tr>
  <tr>
    <td colspan="2" align="center"><b>Landing page</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/v1/landing.png" alt="v1 landing page" /></td>
    <td><img src="docs/screenshots/v2/landing.png" alt="v2 landing page" /></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><b>Dashboard</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/v1/dashboard.png" alt="v1 dashboard" /></td>
    <td><img src="docs/screenshots/v2/dashboard.png" alt="v2 dashboard" /></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><b>Publication summary → Research insights</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/v1/summary.png" alt="v1 publication summary" /></td>
    <td><img src="docs/screenshots/v2/summary.png" alt="v2 research insights" /></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><b>Profile</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/v1/profile.png" alt="v1 profile" /></td>
    <td><img src="docs/screenshots/v2/profile.png" alt="v2 profile" /></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><b>Sign in</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/v1/login.png" alt="v1 sign in" /></td>
    <td><img src="docs/screenshots/v2/login.png" alt="v2 sign in" /></td>
  </tr>
</table>

### Only in v2

<table>
  <tr>
    <td width="50%"><b>Summarize any document</b><br /><img src="docs/screenshots/v2/summarize.png" alt="Document summarizer" /></td>
    <td width="50%"><b>View any document</b><br /><img src="docs/screenshots/v2/document-viewer.png" alt="Document viewer" /></td>
  </tr>
  <tr>
    <td><b>College: timetable, deadlines, attendance, CGPA</b><br /><img src="docs/screenshots/v2/college.png" alt="College tools" /></td>
    <td><b>Free citation generator</b><br /><img src="docs/screenshots/v2/cite.png" alt="Citation generator" /></td>
  </tr>
  <tr>
    <td><b>Reading list</b><br /><img src="docs/screenshots/v2/reading-list.png" alt="Reading list" /></td>
    <td><b>Support tickets</b><br /><img src="docs/screenshots/v2/support.png" alt="Support tickets" /></td>
  </tr>
  <tr>
    <td><b>Account security</b><br /><img src="docs/screenshots/v2/security.png" alt="Security settings" /></td>
    <td><b>Dark mode</b><br /><img src="docs/screenshots/v2/dashboard-dark.png" alt="Dark mode" /></td>
  </tr>
</table>

<p align="center"><img src="docs/screenshots/v2/mobile-landing.png" alt="Mobile layout" width="260" /><br /><sub>Works on phones too</sub></p>

---

## 🚀 Features

**For researchers**
- 📚 Publication library — add by hand, look up a DOI, or bulk-import DOIs / BibTeX
- 📊 Research insights — h-index, i10-index, citations per year, top venues, collaborators and topics
- 📤 Export — CSV, BibTeX, APA / MLA / IEEE references and a printable CV
- 🌐 Public profile — a shareable page at `/u/your-name`

**For students**
- 🏫 College — weekly timetable, assignments & exams, attendance with the 75% rule, SGPA / CGPA calculator, focus timer
- 🎓 Student work types — projects, theses, reports, preprints, posters
- 🔖 Reading list with notes, and a free citation generator (APA, MLA, IEEE, Harvard, Chicago)

**Documents**
- 👁️ In-app viewer for every file — PDF (zoom, all pages), Word, PowerPoint, Excel / CSV tables, images, Markdown, code and text, notebooks, audio and video
- ✨ Summaries — an AI summary when the server is set up, or a free quick summary made in the browser (PDF, Word, PowerPoint, Excel, text)

**Everything else**
- 🎫 Support tickets with replies, attachments, internal notes, ratings and an admin panel
- 💬 In-app guide that answers questions and walks you through common tasks
- 🔐 Two-factor authentication, security level, sign out other devices, data download, account deletion
- 🌗 Light / dark / system theme, page transitions, mobile layout

---

## 🛠️ Tech stack

| Layer | Tools |
|---|---|
| Front end | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Recharts |
| Back end | Supabase — Auth, Postgres with row-level security, Storage, Edge Functions |
| Documents | PDF.js, JSZip (all in the browser) |
| AI summaries | Anthropic API through a Supabase Edge Function (optional) |
| Demo mode | localStorage + IndexedDB — runs with no back end at all |
| Hosting | Netlify, or the Docker image below |

---

## 🏁 Getting started

```bash
git clone https://github.com/AryanSinghh07/CiteCraft.git
cd CiteCraft
npm install
npm run dev
```

Open http://localhost:8080. Without Supabase keys the app runs in **demo mode** and keeps everything in your browser.

🧪 **Demo login (demo mode):** `aryan@example.com` / `aryan`

To use a real database, follow [docs/SETUP.md](docs/SETUP.md): create a Supabase project, run the SQL files in `supabase/migrations` in order, and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### 🐳 Run with Docker

Every release publishes an image to GitHub Packages:

```bash
docker run -p 8080:80 ghcr.io/aryansinghh07/citecraft:latest
```

The published image runs in demo mode. To build one connected to your own Supabase project:

```bash
docker build -t citecraft \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-publishable-key .
docker run -p 8080:80 citecraft
```

Only the public (publishable) key belongs here — never a secret or service-role key.

---

## 📦 Releases

| Version | What it is |
|---|---|
| [v2.0.0](https://github.com/AryanSinghh07/CiteCraft/releases/tag/v2.0.0) | The full application described above |
| [v1.0.0](https://github.com/AryanSinghh07/CiteCraft/releases/tag/v1.0.0) | The original front-end demo |

Each release includes the built website as a `.zip` and a matching Docker image.

---

## 📁 Project structure

```
src/
  app/          routes and providers
  features/     auth, publications, documents, summarizer, student, support, security…
  pages/        one file per page
  services/     data layer — supabase/ (real back end) and local/ (demo mode)
supabase/
  migrations/   database tables, policies and storage buckets
  functions/    Edge Function for AI summaries
docs/           setup guide, architecture, release notes, screenshots
```

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 📄 License

[MIT](LICENSE) © Aryan Singh
