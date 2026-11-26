/**
 * The scripted assistant's knowledge base. Each topic has trigger keywords and a
 * Markdown answer (links like [Profile](/profile) open inside the app).
 * To teach the bot something new, add a topic here.
 */

export interface Topic {
  id: string;
  /** shown on "How do I…?" buttons */
  title: string;
  /** words or phrases that point to this topic (lowercase) */
  keywords: string[];
  answer: string;
}

export const TOPICS: Topic[] = [
  {
    id: 'add',
    title: 'Add a publication',
    keywords: ['new publication', 'add paper', 'add a paper', 'add publication', 'publish', 'upload paper', 'add work', 'add project', 'add thesis'],
    answer: `There are three ways to add work:
1. **Ask me** — say *add a publication* and I'll guide you, or just paste a DOI here.
2. On the [Dashboard](/dashboard), click **Add publication**, paste a DOI into **Fill in from a DOI** and press **Fetch** — the details fill themselves in.
3. Fill the form by hand (useful for projects, reports and theses without a DOI).`,
  },
  {
    id: 'import',
    title: 'Import from Google Scholar / BibTeX',
    keywords: ['import', 'bibtex', 'bib', 'google scholar', 'zotero', 'mendeley', 'bulk', 'many papers', 'scholar'],
    answer: `To bring in many papers at once:
1. Export a **BibTeX (.bib)** file from Google Scholar, Zotero or Mendeley — or copy a list of DOIs.
2. On the [Dashboard](/dashboard), click **Import**.
3. Choose **From BibTeX** (upload or paste) or **From DOIs** (one per line).
4. Check the preview — papers already in your library are flagged — then click **Import**.`,
  },
  {
    id: 'export',
    title: 'Export my list (APA, MLA, IEEE…)',
    keywords: ['export', 'download', 'csv', 'excel', 'apa list', 'mla list', 'ieee list', 'reference list', 'bibliography'],
    answer: `On the [Dashboard](/dashboard), open **Export** and pick:
- **CSV** for Excel or Google Sheets
- **BibTeX** for LaTeX / reference managers
- a **reference list** in APA, MLA or IEEE
- **Printable CV / PDF**`,
  },
  {
    id: 'cite',
    title: 'Create a citation',
    keywords: ['cite', 'citation', 'reference', 'harvard', 'chicago', 'apa', 'mla', 'ieee', 'referencing'],
    answer: `- For **any paper**, use the free [Citation generator](/cite): paste a DOI or type the details and copy APA, MLA, IEEE, Harvard or Chicago.
- For **your own work**, click the **quote** button on a publication card to copy its citation.
- Or paste a DOI here and choose **Just cite it**.`,
  },
  {
    id: 'cv',
    title: 'Make a CV / PDF',
    keywords: ['cv', 'resume', 'résumé', 'pdf', 'print', 'curriculum'],
    answer: `Open the [Printable CV](/cv) (also in the account menu → **Printable CV**). Pick a citation style, then click **Print / Save PDF** and choose **Save as PDF** in the print dialog.`,
  },
  {
    id: 'public',
    title: 'Share my public profile',
    keywords: ['public', 'share', 'profile link', 'portfolio', 'showcase', 'url', 'my page'],
    answer: `1. Go to [Profile](/profile) and scroll to **Public profile**.
2. Turn on **Make my profile public** and choose a link, e.g. */u/your-name*.
3. Click **Save public profile**, then **Copy link**.

Visitors see your bio, metrics and work — never your email.`,
  },
  {
    id: 'profile',
    title: 'Edit my profile or photo',
    keywords: ['profile', 'photo', 'picture', 'avatar', 'bio', 'edit profile', 'name', 'department', 'interests', 'orcid'],
    answer: `Go to [Profile](/profile): click your **photo** to change it, update your details, bio, research interests and links (ORCID, Google Scholar, website), then **Save Changes**.`,
  },
  {
    id: 'student',
    title: 'Student accounts',
    keywords: ['student', 'students', 'undergrad', 'ug', 'pg', 'masters', 'phd', 'course', 'degree', 'program', 'switch account'],
    answer: `CiteCraft works for students too:
- Set **Account type → Student** in [Profile](/profile) to add your program, year and supervisor.
- Add **projects, theses, reports, preprints and posters** — not just papers.
- Keep a [Reading list](/reading-list) with notes.
- Use the free [Citation generator](/cite) for assignments.
- Build an [academic CV](/cv) and a public profile for internships and applications.`,
  },
  {
    id: 'reading',
    title: 'Use the reading list',
    keywords: ['reading list', 'reading', 'to read', 'read later', 'notes', 'literature', 'papers i read'],
    answer: `Your [Reading list](/reading-list) keeps papers you're **reading** (not writing):
- Paste a DOI to add a paper, or add it manually.
- Mark it **To read → Reading → Done** and keep notes.
- Copy citations or export everything as BibTeX.

You can also ask me to *add to reading list*.`,
  },
  {
    id: 'summarize',
    title: 'Summarize a document',
    keywords: ['summarize', 'summarise', 'summary of', 'tldr', 'document', 'pdf summary', 'notes from'],
    answer: `Open [Summarize](/summarize), drop in a PDF, Word, PowerPoint, Excel, text or image file, choose the length and focus, and click **Summarize**. Past summaries are saved below.`,
  },
  {
    id: 'documents',
    title: 'Store documents',
    keywords: ['documents', 'files', 'store', 'upload file', 'library', 'storage'],
    answer: `On the [Dashboard](/dashboard), open the **Documents** tab to upload PDFs, Word and PowerPoint files (up to 10 MB). Each stored file has buttons to open, summarize or delete it.`,
  },
  {
    id: 'metrics',
    title: 'What are h-index and i10-index?',
    keywords: ['h-index', 'h index', 'hindex', 'i10', 'metric', 'metrics', 'impact', 'insights'],
    answer: `- **h-index**: the largest number *h* where *h* of your papers each have at least *h* citations.
- **i10-index**: how many of your papers have at least 10 citations.

See all your metrics and trends on [Research insights](/summary), or ask me *my stats*.`,
  },
  {
    id: 'edit',
    title: 'Edit or delete a publication',
    keywords: ['edit', 'delete', 'remove', 'change', 'update publication', 'wrong', 'mistake', 'fix'],
    answer: `On the [Dashboard](/dashboard), find the publication card and use the **pencil** to edit or the **bin** to delete it. Use the search box above the list to find it quickly.`,
  },
  {
    id: 'password',
    title: 'Reset my password',
    keywords: ['password', 'forgot', 'reset', 'login problem', "can't log in", 'cannot login', 'sign in'],
    answer: `On the sign-in page click **Forgot password?**, enter your email and follow the link we send you. You can also go straight to [Reset password](/forgot-password).`,
  },
  {
    id: 'theme',
    title: 'Dark mode',
    keywords: ['dark', 'light', 'theme', 'night mode', 'colour', 'color'],
    answer: `Click the **sun / moon** button in the top bar and choose **Light**, **Dark** or **System**.`,
  },
  {
    id: 'timetable',
    title: 'Set up my timetable',
    keywords: ['timetable', 'time table', 'schedule', 'classes', 'lecture', 'lectures', 'class today', 'routine'],
    answer: `Open [College → Timetable](/college?tab=timetable):
1. Add your **courses** (subjects) — name, code, credits and a colour.
2. Click **Add class** and pick the day, start and end time and room.

Today's classes (with **NOW** / **NEXT**) then show on your dashboard. Ask me *my day* any time.`,
  },
  {
    id: 'deadlines',
    title: 'Track assignments & exams',
    keywords: ['assignment', 'assignments', 'deadline', 'deadlines', 'exam', 'exams', 'quiz', 'homework', 'due', 'submission'],
    answer: `Use [College → Assignments & exams](/college?tab=tasks): click **Add deadline**, choose the type, course, due date and priority. Tasks are grouped into **Overdue**, **Due today**, **Next 7 days** and **Later** — tick the box when you're done.`,
  },
  {
    id: 'attendance',
    title: 'Track attendance (75% rule)',
    keywords: ['attendance', 'bunk', 'can i bunk', 'can i miss', 'how many classes', 'bunk classes', 'skip class', 'miss class', 'absent', 'present', '75', 'shortage', 'detention'],
    answer: `In [College → Attendance](/college?tab=attendance), tap **Present** or **Absent** after each class. For every course you'll see your % and either *“You can miss N classes”* or *“Attend the next N classes to reach 75%”*. You can change the minimum % per course.`,
  },
  {
    id: 'cgpa',
    title: 'Calculate SGPA / CGPA',
    keywords: ['cgpa', 'sgpa', 'gpa', 'grade', 'grades', 'marks', 'percentage', 'result', 'semester'],
    answer: `Open [College → CGPA](/college?tab=grades): add each semester's courses with credits and grade — SGPA and CGPA are calculated for you (10-point or 4-point scale), with a rough percentage. The **Target planner** tells you the SGPA you need next semester.`,
  },
  {
    id: 'focus',
    title: 'Focus timer (Pomodoro)',
    keywords: ['focus', 'pomodoro', 'study timer', 'timer', 'concentrate', 'study session'],
    answer: `Use the **Focus** card on your dashboard or [College → Focus timer](/college?tab=focus): 25-minute focus sessions with short breaks. Your sessions today are counted.`,
  },
  {
    id: 'security',
    title: 'Secure my account (2FA)',
    keywords: ['security', 'secure', '2fa', 'two factor', 'two-factor', 'authenticator', 'otp', 'hacked', 'protect', 'change password', 'security level'],
    answer: `Open [Security](/security) (account menu → **Security**) to see your **security level** and raise it:
- Turn on **two-factor authentication** with an authenticator app — then a stolen password alone can't get in.
- Set a **strong password** (the meter shows how strong it is).
- **Sign out other devices** if you used a shared computer.
- **Download my data** for a copy of everything you've added.`,
  },
  {
    id: 'support',
    title: 'Contact support',
    keywords: ['support', 'help desk', 'contact', 'human', 'admin', 'complaint', 'issue', 'bug', 'not working', 'error', 'broken'],
    answer: `I can raise a support ticket for you — say *raise a ticket*. You can also visit [Help & Support](/support) to see your tickets and replies.`,
  },
];

/** Picks the best-matching topic for free text, or null. */
export function matchTopic(text: string): Topic | null {
  const q = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ')} `;
  let best: { topic: Topic; score: number } | null = null;
  for (const topic of TOPICS) {
    let score = 0;
    for (const keyword of topic.keywords) {
      if (q.includes(` ${keyword} `) || (keyword.length > 4 && q.includes(keyword))) {
        score += keyword.includes(' ') ? 3 : 2; // phrases are stronger signals
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { topic, score };
  }
  return best?.topic ?? null;
}
