import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { publicationService, readingListService, studentService, ticketService } from '@/services';
import { attendanceStatus, formatTime, relativeDue, todaysClasses } from '@/features/student/utils';
import { lookupDoi, normalizeDoi } from '@/features/publications/utils/doi';
import { CITATION_STYLES, formatCitation } from '@/features/publications/utils/citations';
import { GENERIC_VENUE_TYPES, PUBLICATION_TYPES, typeOptions, venueOf } from '@/features/publications/utils/publicationTypes';
import { researchMetrics } from '@/utils/metrics';
import type { Publication, PublicationInput, PublicationType, ReadingItemInput, TicketCategory } from '@/types';
import { TOPICS, matchTopic } from '../script/knowledge';

/**
 * A scripted (rule-based) assistant. It runs entirely in the browser: answers come
 * from the knowledge base in ../script/knowledge.ts, and actions are guided
 * step-by-step flows that always ask for confirmation before saving anything.
 */

export interface QuickReply {
  label: string;
  /** "cmd:…" for commands, otherwise sent as text */
  value: string;
}

export interface BotLink {
  label: string;
  to: string;
  tone: 'success' | 'info';
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  options?: QuickReply[];
  links?: BotLink[];
  tone?: 'error';
}

type ManualStep = 'title' | 'authors' | 'year' | 'type' | 'venue' | 'confirm';
type TicketStep = 'subject' | 'category' | 'description' | 'confirm';

type Flow =
  | { name: 'idle' }
  | { name: 'doi_choice'; doi: string }
  | { name: 'add_doi'; step: 'doi' }
  | { name: 'add_doi'; step: 'confirm'; draft: PublicationInput }
  | { name: 'add_manual'; step: ManualStep; draft: Partial<PublicationInput> }
  | { name: 'reading'; step: 'doi' }
  | { name: 'reading'; step: 'confirm'; draft: ReadingItemInput }
  | { name: 'ticket'; step: TicketStep; draft: { subject?: string; category?: TicketCategory; description?: string } }
  | { name: 'find' };

const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'bug', label: 'Something is broken' },
  { value: 'account', label: 'Account / login' },
  { value: 'publication', label: 'Publication data' },
  { value: 'feature', label: 'Feature idea' },
  { value: 'other', label: 'Something else' },
];

const YES = /^(y|yes|yeah|yep|sure|ok|okay|confirm|correct|save|add it|do it|go ahead|haan|ha)\b/i;
const NO = /^(n|no|nope|nah|not now|don'?t)\b/i;
const RESET = /^(cancel|stop|menu|main menu|start over|restart|quit|exit|reset)$/i;

const storageKey = (userId: string) => `citecraft:assistant:v2:${userId}`;
const id = () => crypto.randomUUID();
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

const bullet = (label: string, value?: string | number | null) => (value || value === 0 ? `- **${label}:** ${value}` : '');

function describeDraft(draft: Partial<PublicationInput>) {
  return [
    bullet('Title', draft.title),
    bullet('Authors', draft.authors?.join(', ')),
    bullet('Type', draft.type ? PUBLICATION_TYPES[draft.type].label : undefined),
    bullet('Year', draft.year),
    bullet(draft.type ? PUBLICATION_TYPES[draft.type].venueLabel : 'Venue', venueOf(draft as Publication)),
    bullet('DOI', draft.doi),
    bullet('Citations', draft.citations),
  ]
    .filter(Boolean)
    .join('\n');
}

/** Puts a typed venue into the right field for the publication type. */
function withVenue(type: PublicationType, venue: string | undefined): Partial<PublicationInput> {
  const v = venue?.trim() || undefined;
  return {
    journal: type === 'journal' ? v : undefined,
    conference: type === 'conference' ? v : undefined,
    book: type === 'book' || type === 'chapter' ? v : undefined,
    venue: GENERIC_VENUE_TYPES.includes(type) ? v : undefined,
  };
}

function load(userId: string): AssistantMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as AssistantMessage[]) : [];
  } catch {
    return [];
  }
}

export function useAssistant() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<AssistantMessage[]>(() => (user ? load(user.id) : []));
  const [isTyping, setIsTyping] = useState(false);
  const flowRef = useRef<Flow>({ name: 'idle' });
  const isStudent = profile?.accountType === 'student';
  const workWord = isStudent ? 'work' : 'publications';

  useEffect(() => {
    setMessages(user ? load(user.id) : []);
    flowRef.current = { name: 'idle' };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    try {
      sessionStorage.setItem(storageKey(user.id), JSON.stringify(messages.slice(-60)));
    } catch {
      /* storage blocked — chat still works */
    }
  }, [messages, user]);

  const menu: QuickReply[] = [
    ...(isStudent ? [{ label: '📅 My day', value: 'cmd:today' }] : []),
    { label: isStudent ? '➕ Add my work' : '➕ Add a publication', value: 'cmd:add' },
    { label: '📊 My stats', value: 'cmd:stats' },
    { label: '🔎 Find my work', value: 'cmd:find' },
    { label: '📚 Add to reading list', value: 'cmd:reading' },
    { label: '❓ How do I…', value: 'cmd:howto' },
    { label: '🛟 Get support', value: 'cmd:ticket' },
  ];

  const say = useCallback((content: string, extra: Partial<AssistantMessage> = {}) => {
    setMessages(prev => [...prev, { id: id(), role: 'bot', content, ...extra }]);
  }, []);

  const confirmOptions: QuickReply[] = [
    { label: '✅ Yes, save it', value: 'cmd:yes' },
    { label: '✏️ No, start again', value: 'cmd:no' },
    { label: 'Cancel', value: 'cmd:cancel' },
  ];

  // ------------------------------------------------------------------ actions

  const savePublication = async (draft: PublicationInput) => {
    if (!user) return;
    try {
      const created = await publicationService.create(user.id, draft);
      void queryClient.invalidateQueries({ queryKey: ['publications'] });
      say(`Done! **${created.title}** is now in your library. 🎉`, {
        links: [{ label: 'View on dashboard', to: '/dashboard', tone: 'success' }],
        options: [
          { label: 'Add another', value: 'cmd:add' },
          { label: 'My stats', value: 'cmd:stats' },
          { label: 'Main menu', value: 'cmd:menu' },
        ],
      });
    } catch (error) {
      say(`I couldn't save it: ${errorText(error)}`, { tone: 'error', options: [{ label: 'Main menu', value: 'cmd:menu' }] });
    }
    flowRef.current = { name: 'idle' };
  };

  const saveReading = async (draft: ReadingItemInput) => {
    if (!user) return;
    try {
      await readingListService.add(user.id, draft);
      void queryClient.invalidateQueries({ queryKey: ['reading-list'] });
      say(`Added **${draft.title}** to your reading list as *To read*. 📚`, {
        links: [{ label: 'Open reading list', to: '/reading-list', tone: 'success' }],
        options: [
          { label: 'Add another', value: 'cmd:reading' },
          { label: 'Main menu', value: 'cmd:menu' },
        ],
      });
    } catch (error) {
      say(`I couldn't add it: ${errorText(error)}`, { tone: 'error', options: [{ label: 'Main menu', value: 'cmd:menu' }] });
    }
    flowRef.current = { name: 'idle' };
  };

  const showStats = async () => {
    if (!user) return;
    try {
      const pubs = await publicationService.list(user.id);
      if (pubs.length === 0) {
        say(`You haven't added any ${workWord} yet. Want to add your first one?`, {
          options: [{ label: '➕ Add now', value: 'cmd:add' }, { label: 'Main menu', value: 'cmd:menu' }],
        });
        return;
      }
      const m = researchMetrics(pubs);
      const year = new Date().getFullYear();
      const byType = Object.entries(
        pubs.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.type]: (acc[p.type] ?? 0) + 1 }), {}),
      )
        .sort((a, b) => b[1] - a[1])
        .map(([type, n]) => `${n} ${PUBLICATION_TYPES[type as PublicationType].plural.toLowerCase()}`)
        .join(', ');
      say(
        [
          `Here's your snapshot 📊`,
          `- **${pubs.length}** ${workWord} (${byType})`,
          `- **${m.totalCitations.toLocaleString()}** citations · **${m.averageCitations.toFixed(1)}** per paper`,
          `- **h-index ${m.hIndex}** · **i10-index ${m.i10Index}**`,
          `- **${pubs.filter(p => p.year === year).length}** added for ${year}`,
          m.mostCited ? `- Most cited: *${m.mostCited.title}* (${m.mostCited.citations})` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        { links: [{ label: 'See full insights', to: '/summary', tone: 'info' }], options: [{ label: 'Main menu', value: 'cmd:menu' }] },
      );
    } catch (error) {
      say(`I couldn't load your stats: ${errorText(error)}`, { tone: 'error' });
    }
  };

  const findWork = async (query: string) => {
    if (!user) return;
    const q = query.toLowerCase();
    const pubs = await publicationService.list(user.id);
    const hits = pubs.filter(p => [p.title, venueOf(p), ...p.authors, ...(p.tags ?? [])].some(v => v?.toLowerCase().includes(q)));
    flowRef.current = { name: 'idle' };
    if (hits.length === 0) {
      say(`I couldn't find anything matching “${query}”.`, {
        options: [{ label: 'Search again', value: 'cmd:find' }, { label: 'Main menu', value: 'cmd:menu' }],
      });
      return;
    }
    say(
      `I found **${hits.length}**:\n${hits
        .slice(0, 6)
        .map(p => `- *${p.title}* — ${[venueOf(p), p.year].filter(Boolean).join(', ')}${p.citations ? ` · ${p.citations} citations` : ''}`)
        .join('\n')}${hits.length > 6 ? `\n…and ${hits.length - 6} more on the dashboard.` : ''}`,
      { links: [{ label: 'Open dashboard', to: '/dashboard', tone: 'info' }], options: [{ label: 'Main menu', value: 'cmd:menu' }] },
    );
  };

  const lookupAndConfirm = async (raw: string, target: 'publication' | 'reading') => {
    const doi = normalizeDoi(raw);
    if (!doi) {
      say('That doesn’t look like a DOI — it should start with **10.**, e.g. *10.1038/nature14539*. Try again, or type **cancel**.');
      return;
    }
    say(`Looking up **${doi}**… 🔍`);
    try {
      const found = await lookupDoi(doi);
      if (target === 'publication') {
        flowRef.current = { name: 'add_doi', step: 'confirm', draft: found };
        say(`I found this — shall I add it to your ${workWord}?\n\n${describeDraft(found)}`, { options: confirmOptions });
      } else {
        const draft: ReadingItemInput = {
          title: found.title,
          authors: found.authors,
          year: found.year,
          venue: venueOf(found) || undefined,
          doi: found.doi,
          url: found.url,
          status: 'to_read',
          tags: found.tags ?? [],
        };
        flowRef.current = { name: 'reading', step: 'confirm', draft };
        say(`Add this to your reading list?\n\n${describeDraft({ ...found, citations: undefined })}`, { options: confirmOptions });
      }
    } catch (error) {
      say(`${errorText(error)} You can try another DOI, or add it by hand.`, {
        tone: 'error',
        options:
          target === 'publication'
            ? [{ label: '✍️ Add by hand', value: 'cmd:add_manual' }, { label: 'Cancel', value: 'cmd:cancel' }]
            : [{ label: 'Cancel', value: 'cmd:cancel' }],
      });
    }
  };

  const showToday = async () => {
    if (!user) return;
    try {
      const [courses, sessions, tasks] = await Promise.all([
        studentService.courses.list(user.id),
        studentService.sessions.list(user.id),
        studentService.tasks.list(user.id),
      ]);
      const name = (id?: string | null) => courses.find(c => c.id === id)?.name ?? 'Class';
      const { today, ongoing } = todaysClasses(sessions);
      const due = tasks
        .filter(t => t.status !== 'done' && new Date(t.dueAt).getTime() - Date.now() < 3 * 24 * 3600 * 1000)
        .slice(0, 5);
      const risky = courses.filter(c => !attendanceStatus(c.attended, c.total, c.requiredPct).safe);
      const lines = [
        "Here's your day 📅",
        today.length
          ? `**Classes:**\n${today.map(s => `- ${formatTime(s.start)} — ${name(s.courseId)}${s.room ? ` (${s.room})` : ''}${ongoing?.id === s.id ? ' · *now*' : ''}`).join('\n')}`
          : sessions.length
            ? '**Classes:** none today 🎉'
            : '**Classes:** add your timetable to see them here.',
        due.length
          ? `**Due soon:**\n${due.map(t => `- ${t.title} — ${relativeDue(t.dueAt)}`).join('\n')}`
          : '**Due soon:** nothing in the next 3 days.',
        risky.length ? `**Attendance alert:** ${risky.map(c => `${c.name} (${Math.round((c.attended / c.total) * 100)}%)`).join(', ')}` : '',
      ];
      say(lines.filter(Boolean).join('\n\n'), {
        links: [{ label: 'Open College', to: '/college', tone: 'info' }],
        options: [{ label: 'Main menu', value: 'cmd:menu' }],
      });
    } catch (error) {
      say(`I couldn't load your day: ${errorText(error)}`, { tone: 'error' });
    }
  };

  // ------------------------------------------------------------------ flows

  const startAddManual = () => {
    flowRef.current = { name: 'add_manual', step: 'title', draft: {} };
    say(`Let's add it step by step. What's the **title**?`, { options: [{ label: 'Cancel', value: 'cmd:cancel' }] });
  };

  const handleManual = (flow: Extract<Flow, { name: 'add_manual' }>, text: string, value: string) => {
    const draft = { ...flow.draft };
    switch (flow.step) {
      case 'title':
        if (text.trim().length < 3) return say('The title needs at least 3 characters. What is it?');
        draft.title = text.trim().slice(0, 500);
        flowRef.current = { ...flow, step: 'authors', draft };
        return say('Who are the **authors**? Separate names with commas (e.g. *Asha Rao, Vikram Sen*).', {
          options: profile?.name ? [{ label: `Just me (${profile.name})`, value: profile.name }] : undefined,
        });
      case 'authors':
        draft.authors = text.split(/[,;]| and /i).map(a => a.trim()).filter(Boolean).slice(0, 100);
        if (!draft.authors.length) return say('Please give at least one author name.');
        flowRef.current = { ...flow, step: 'year', draft };
        return say('Which **year**?', {
          options: [0, 1, 2].map(n => ({ label: String(new Date().getFullYear() - n), value: String(new Date().getFullYear() - n) })),
        });
      case 'year': {
        const year = parseInt(text, 10);
        if (!Number.isFinite(year) || year < 1900 || year > 2100) return say('Please enter a year between 1900 and 2100.');
        draft.year = year;
        flowRef.current = { ...flow, step: 'type', draft };
        return say('What **type** of work is it?', {
          options: typeOptions(isStudent).map(t => ({ label: PUBLICATION_TYPES[t].label, value: `cmd:type:${t}` })),
        });
      }
      case 'type': {
        const type = value.startsWith('cmd:type:')
          ? (value.slice(9) as PublicationType)
          : typeOptions(isStudent).find(t => PUBLICATION_TYPES[t].label.toLowerCase().startsWith(text.toLowerCase().trim()));
        if (!type || !PUBLICATION_TYPES[type]) {
          return say('Please pick one of the types below.', {
            options: typeOptions(isStudent).map(t => ({ label: PUBLICATION_TYPES[t].label, value: `cmd:type:${t}` })),
          });
        }
        draft.type = type;
        flowRef.current = { ...flow, step: 'venue', draft };
        return say(`What's the **${PUBLICATION_TYPES[type].venueLabel.toLowerCase()}**?`, { options: [{ label: 'Skip', value: 'cmd:skip' }] });
      }
      case 'venue': {
        Object.assign(draft, withVenue(draft.type!, value === 'cmd:skip' ? undefined : text));
        flowRef.current = { ...flow, step: 'confirm', draft };
        return say(`Here's what I'll save:\n\n${describeDraft(draft)}\n\nShall I add it?`, { options: confirmOptions });
      }
      case 'confirm':
        if (value === 'cmd:yes' || YES.test(text)) {
          return void savePublication({ citations: 0, tags: [], ...draft } as PublicationInput);
        }
        return startAddManual();
    }
  };

  const startTicket = () => {
    flowRef.current = { name: 'ticket', step: 'subject', draft: {} };
    say('Sorry you’re having trouble — I’ll pass it to the support team. In one line, **what’s the problem**?', {
      options: [{ label: 'Cancel', value: 'cmd:cancel' }],
    });
  };

  const handleTicket = async (flow: Extract<Flow, { name: 'ticket' }>, text: string, value: string) => {
    const draft = { ...flow.draft };
    switch (flow.step) {
      case 'subject':
        if (text.trim().length < 3) return say('Please describe it in a few words.');
        draft.subject = text.trim().slice(0, 200);
        flowRef.current = { ...flow, step: 'category', draft };
        return say('Which best describes it?', { options: TICKET_CATEGORIES.map(c => ({ label: c.label, value: `cmd:cat:${c.value}` })) });
      case 'category':
        draft.category = (value.startsWith('cmd:cat:') ? value.slice(8) : 'other') as TicketCategory;
        flowRef.current = { ...flow, step: 'description', draft };
        return say('Please add the **details** — what happened, and what you expected.');
      case 'description':
        draft.description = text.trim().slice(0, 5000);
        flowRef.current = { ...flow, step: 'confirm', draft };
        return say(
          `I'll raise this ticket:\n\n${bullet('Subject', draft.subject)}\n${bullet('Category', TICKET_CATEGORIES.find(c => c.value === draft.category)?.label)}\n${bullet('Details', draft.description)}\n\nSend it?`,
          { options: confirmOptions },
        );
      case 'confirm':
        if (!(value === 'cmd:yes' || YES.test(text))) return startTicket();
        try {
          const ticket = await ticketService.create(
            user!.id,
            { subject: draft.subject!, description: draft.description!, category: draft.category ?? 'other', priority: 'medium' },
            [],
          );
          void queryClient.invalidateQueries({ queryKey: ['tickets'] });
          flowRef.current = { name: 'idle' };
          return say(`Ticket **#CC-${ticket.ticketNumber}** is open. The team will reply on the Support page. 🛟`, {
            links: [{ label: `View ticket #CC-${ticket.ticketNumber}`, to: `/support/${ticket.id}`, tone: 'success' }],
            options: [{ label: 'Main menu', value: 'cmd:menu' }],
          });
        } catch (error) {
          flowRef.current = { name: 'idle' };
          return say(`I couldn't raise the ticket: ${errorText(error)}`, { tone: 'error' });
        }
    }
  };

  const showMenu = (intro = 'What would you like to do?') => {
    flowRef.current = { name: 'idle' };
    say(intro, { options: menu });
  };

  // ------------------------------------------------------------------ router

  const handle = async (text: string, value: string) => {
    const flow = flowRef.current;

    if (value === 'cmd:menu' || value === 'cmd:cancel' || RESET.test(text)) {
      return showMenu(value === 'cmd:menu' ? undefined : 'No problem — cancelled. Anything else?');
    }

    // Commands from buttons that start flows work from anywhere.
    switch (value) {
      case 'cmd:add':
        flowRef.current = { name: 'idle' };
        return say(`How would you like to add it?`, {
          options: [
            { label: '🔗 I have a DOI', value: 'cmd:add_doi' },
            { label: '✍️ Enter details', value: 'cmd:add_manual' },
            { label: '📥 Import many (BibTeX)', value: 'cmd:topic:import' },
          ],
        });
      case 'cmd:add_doi':
        flowRef.current = { name: 'add_doi', step: 'doi' };
        return say('Paste the **DOI** (e.g. *10.1038/nature14539* or a doi.org link).', { options: [{ label: 'Cancel', value: 'cmd:cancel' }] });
      case 'cmd:add_manual':
        return startAddManual();
      case 'cmd:stats':
        flowRef.current = { name: 'idle' };
        return showStats();
      case 'cmd:today':
        flowRef.current = { name: 'idle' };
        return showToday();
      case 'cmd:find':
        flowRef.current = { name: 'find' };
        return say(`What should I look for? A word from the title, a co-author, venue or tag.`);
      case 'cmd:reading':
        flowRef.current = { name: 'reading', step: 'doi' };
        return say('Paste the **DOI** of the paper you want to read.', {
          links: [{ label: 'No DOI? Add it on the reading list page', to: '/reading-list', tone: 'info' }],
          options: [{ label: 'Cancel', value: 'cmd:cancel' }],
        });
      case 'cmd:ticket':
        return startTicket();
      case 'cmd:howto':
        flowRef.current = { name: 'idle' };
        return say('Pick a topic, or just type your question:', {
          options: TOPICS.map(t => ({ label: t.title, value: `cmd:topic:${t.id}` })),
        });
    }
    if (value.startsWith('cmd:topic:')) {
      const topic = TOPICS.find(t => t.id === value.slice(10));
      flowRef.current = { name: 'idle' };
      if (topic) return say(topic.answer, { options: [{ label: 'Another question', value: 'cmd:howto' }, { label: 'Main menu', value: 'cmd:menu' }] });
    }

    // Ongoing flows.
    if (flow.name === 'doi_choice') {
      if (value === 'cmd:doi_pub') return lookupAndConfirm(flow.doi, 'publication');
      if (value === 'cmd:doi_read') return lookupAndConfirm(flow.doi, 'reading');
      if (value === 'cmd:doi_cite') {
        flowRef.current = { name: 'idle' };
        try {
          const found = await lookupDoi(flow.doi);
          const pub = { ...found, id: '' } as Publication;
          return say(
            `Citations for *${found.title}*:\n\n${(['apa', 'mla', 'ieee', 'harvard'] as const)
              .map(s => `**${CITATION_STYLES[s]}**\n${formatCitation(pub, s)}`)
              .join('\n\n')}`,
            { links: [{ label: 'More styles in the citation generator', to: '/cite', tone: 'info' }] },
          );
        } catch (error) {
          return say(errorText(error), { tone: 'error' });
        }
      }
    }
    if (flow.name === 'add_doi') {
      if (flow.step === 'doi') return lookupAndConfirm(text, 'publication');
      if (value === 'cmd:yes' || YES.test(text)) return savePublication(flow.draft);
      if (value === 'cmd:no' || NO.test(text)) {
        flowRef.current = { name: 'add_doi', step: 'doi' };
        return say('OK — paste a different DOI, or type **cancel**.', { options: [{ label: '✍️ Enter details instead', value: 'cmd:add_manual' }] });
      }
      return say('Should I save it? Choose **Yes** or **No**.', { options: confirmOptions });
    }
    if (flow.name === 'reading') {
      if (flow.step === 'doi') return lookupAndConfirm(text, 'reading');
      if (value === 'cmd:yes' || YES.test(text)) return saveReading(flow.draft);
      return showMenu('OK, I won’t add it. Anything else?');
    }
    if (flow.name === 'add_manual') return handleManual(flow, text, value);
    if (flow.name === 'ticket') return handleTicket(flow, text, value);
    if (flow.name === 'find') return findWork(text);

    // Free text while idle: detect intent.
    const lower = text.toLowerCase();
    const doi = normalizeDoi(text);
    if (doi) {
      flowRef.current = { name: 'doi_choice', doi };
      return say(`That's a DOI (**${doi}**). What should I do with it?`, {
        options: [
          { label: `➕ Add to my ${workWord}`, value: 'cmd:doi_pub' },
          { label: '📚 Add to reading list', value: 'cmd:doi_read' },
          { label: '❝ Just cite it', value: 'cmd:doi_cite' },
        ],
      });
    }
    if (/^(hi|hello|hey|hii+|namaste|good (morning|afternoon|evening))\b/.test(lower)) {
      return showMenu(`Hi${profile?.name ? ` ${profile.name.split(' ')[0]}` : ''}! 👋 I'm the CiteCraft assistant. What would you like to do?`);
    }
    if (/\b(thanks|thank you|thx|great|awesome|perfect)\b/.test(lower)) {
      return say('You’re welcome! 😊 Anything else?', { options: menu });
    }
    if (/\b(my )?(stats|statistics|h-?index|i10|how many (papers|publications)|citation count|my citations)\b/.test(lower)) {
      return showStats();
    }
    if (/\b(my day|today'?s? (classes|schedule)|what'?s (on )?today|classes today|due soon|my deadlines)\b/.test(lower)) return showToday();
    if (/\b(raise|open|create|submit)\b.*\bticket\b|\b(talk to|contact) (a )?(human|admin|support)\b/.test(lower)) return startTicket();
    if (/\breading list\b|\bread later\b/.test(lower) && /\b(add|save|put)\b/.test(lower)) return handle('', 'cmd:reading');
    if (/\b(add|new|publish|upload|save)\b.*\b(paper|publication|article|work|project|thesis|report|preprint|poster)\b/.test(lower)) {
      return handle('', 'cmd:add');
    }
    if (/\b(find|search|look up|where is)\b.*\b(my|paper|publication|work)\b/.test(lower)) {
      const query = text.replace(/^.*?\b(find|search( for)?|look up|where is)\b\s*(my\s+)?(paper|publication|work)?\s*(on|about|called|titled)?\s*/i, '').trim();
      if (query.length > 1) return findWork(query);
      return handle('', 'cmd:find');
    }

    const topic = matchTopic(text);
    if (topic) {
      return say(topic.answer, { options: [{ label: 'Another question', value: 'cmd:howto' }, { label: 'Main menu', value: 'cmd:menu' }] });
    }

    return say(
      `Sorry, I didn't quite get that. 🤔 Try one of these, or ask something like *“how do I import from Google Scholar?”*`,
      { options: [...menu.slice(0, 5), { label: '🛟 Ask a human', value: 'cmd:ticket' }] },
    );
  };

  const send = useCallback(
    async (text: string, value?: string) => {
      const display = text.trim();
      if (!display || isTyping || !user) return;
      setMessages(prev => [...prev, { id: id(), role: 'user', content: display }]);
      setIsTyping(true);
      try {
        await wait(350 + Math.random() * 250); // feels like a reply, not an instant dump
        await handle(display, value ?? display);
      } finally {
        setIsTyping(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isTyping, user, profile],
  );

  const clear = useCallback(() => {
    flowRef.current = { name: 'idle' };
    setMessages([]);
  }, []);

  return { messages, isTyping, send, clear, menu };
}
