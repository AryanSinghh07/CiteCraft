import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { FileLock2, Lock, ShieldCheck, Trash2 } from 'lucide-react';

const LAST_UPDATED = '26 November 2026';

const SECTIONS = [
  { id: 'how-it-works', title: 'How CiteCraft works' },
  { id: 'data-we-collect', title: 'Information we collect' },
  { id: 'how-we-use', title: 'How we use your information' },
  { id: 'services', title: 'Services that process your data' },
  { id: 'data-safety', title: 'How we keep your data safe' },
  { id: 'public-profile', title: 'Public profiles' },
  { id: 'your-choices', title: 'Your choices and rights' },
  { id: 'account-recovery', title: 'Account recovery' },
  { id: 'deletion', title: 'Deleting your account' },
  { id: 'google', title: 'Google services and policies' },
  { id: 'acceptable-use', title: 'Acceptable use and policy violations' },
  { id: 'browser-storage', title: 'Cookies and browser storage' },
  { id: 'children', title: 'Children and students under 18' },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact us' },
];

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-24 space-y-3">
    <h2 className="text-xl font-semibold">{title}</h2>
    <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a:hover]:underline [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
      {children}
    </div>
  </section>
);

/** Privacy policy — written to match what the app actually does. */
const Privacy = () => {
  const { user } = useAuth();
  const contact = env.contactEmail;
  const support = user ? <Link to="/support">Help &amp; Support</Link> : <>Help &amp; Support (after signing in)</>;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <header className="mb-10 animate-fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Your data, your control
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Privacy policy</h1>
            <p className="mt-2 text-muted-foreground">Last updated {LAST_UPDATED}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Lock, text: 'Your data is private to your account — nobody else can read it.' },
                { icon: FileLock2, text: 'We never sell your data or show ads.' },
                { icon: Trash2, text: 'Download or delete everything at any time.' },
              ].map(item => (
                <div key={item.text} className="flex items-start gap-2 rounded-xl border bg-card p-3 text-sm">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item.text}
                </div>
              ))}
            </div>
          </header>

          <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
            <nav aria-label="On this page" className="hidden lg:block">
              <div className="sticky top-24 space-y-1 text-sm">
                <p className="mb-2 font-semibold">On this page</p>
                {SECTIONS.map(s => (
                  <a key={s.id} href={`#${s.id}`} className="block rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                    {s.title}
                  </a>
                ))}
              </div>
            </nav>

            <article className="space-y-10">
              <Section id="how-it-works" title="How CiteCraft works">
                <p>
                  CiteCraft is a workspace for students and researchers. You create an account, then add your publications and
                  other work, keep a reading list, plan your timetable, deadlines, attendance and grades, store documents, create
                  citations and, if you choose, share a public profile.
                </p>
                <p>
                  The website runs in your browser. Your account and the information you add are stored in our database and file
                  storage (provided by Supabase). When you use an optional feature that needs another service — such as looking up
                  a DOI or an AI summary — only the information that feature needs is sent, as described below.
                </p>
              </Section>

              <Section id="data-we-collect" title="Information we collect">
                <ul>
                  <li>
                    <strong>Account details:</strong> your name, email address and password. Passwords are handled by our
                    authentication provider and stored only as a secure hash — we can never see them.
                  </li>
                  <li>
                    <strong>Profile:</strong> what you choose to add — account type, position or program, department,
                    institution, photo, bio, interests and links (ORCID, Google Scholar, website).
                  </li>
                  <li>
                    <strong>Your content:</strong> publications and other work, uploaded documents and their summaries, reading
                    list and notes, courses, timetable, deadlines, attendance, grades and support tickets.
                  </li>
                  <li>
                    <strong>Security information:</strong> sign-in times, whether two-factor authentication is on, and the strength
                    score (not the password) of passwords you set in CiteCraft.
                  </li>
                  <li>
                    <strong>Usage counts:</strong> how many AI summaries you request each day, so we can apply fair-use limits.
                  </li>
                </ul>
                <p>We don’t use advertising or third-party analytics trackers.</p>
              </Section>

              <Section id="how-we-use" title="How we use your information">
                <ul>
                  <li>To run the features you use — showing, saving and exporting your work, calculating metrics and CGPA, etc.</li>
                  <li>To keep your account secure (sign-in, password reset, two-factor authentication).</li>
                  <li>To answer support tickets you raise.</li>
                  <li>To prevent abuse, for example daily limits on AI summaries.</li>
                </ul>
                <p>We do not sell, rent or share your personal information for marketing.</p>
              </Section>

              <Section id="services" title="Services that process your data">
                <ul>
                  <li>
                    <strong>Supabase</strong> — database, sign-in and file storage for your account and content.
                  </li>
                  <li>
                    <strong>Netlify</strong> — hosts the website and delivers it to your browser.
                  </li>
                  <li>
                    <strong>Crossref</strong> — when you look up a DOI, only the DOI is sent to Crossref’s public API.
                  </li>
                  <li>
                    <strong>Anthropic (Claude)</strong> — only when you choose an <em>AI summary</em>, the document you selected is
                    sent to Anthropic’s API to generate the summary. The <em>Quick summary</em> runs entirely in your browser and
                    sends nothing.
                  </li>
                  <li>
                    <strong>Google Fonts</strong> — the website’s font files are loaded from Google, which can see your IP address
                    when they load.
                  </li>
                </ul>
                <p>Each provider processes data only to provide its service to us.</p>
              </Section>

              <Section id="data-safety" title="How we keep your data safe">
                <ul>
                  <li>All traffic is encrypted with HTTPS (TLS).</li>
                  <li>
                    <strong>Row-level security</strong> in the database means every record is tied to your account, and the
                    database itself refuses anyone else’s requests to read or change it.
                  </li>
                  <li>Uploaded documents are stored in private storage and opened only through short-lived, signed links.</li>
                  <li>
                    <strong>Two-factor authentication</strong> is available. When it’s on, your data can only be accessed after the
                    code check — a stolen password alone is not enough.
                  </li>
                  <li>Weak and common passwords are rejected, and you can sign out of all other devices.</li>
                  <li>
                    The website sends strict security headers (including a Content Security Policy) that block injected scripts and
                    prevent other sites from embedding CiteCraft.
                  </li>
                  <li>
                    Support staff can see the tickets you raise (with your name and email) so they can help you. They cannot see
                    your other private content.
                  </li>
                </ul>
                <p>
                  No system is perfectly secure. If we learn of a breach affecting your personal data, we will notify affected users
                  as required by law.
                </p>
              </Section>

              <Section id="public-profile" title="Public profiles">
                <p>
                  Public profiles are <strong>off by default</strong>. If you turn yours on, anyone with the link can see your
                  name, photo, position or program, institution, bio, interests, links and your publications/work. Your email
                  address is never shown. You can turn it off at any time in <Link to="/profile">Profile</Link>.
                </p>
              </Section>

              <Section id="your-choices" title="Your choices and rights">
                <ul>
                  <li>
                    <strong>Access and correct:</strong> view and edit everything in the app at any time.
                  </li>
                  <li>
                    <strong>Download:</strong> get a copy of your data from <Link to="/security">Security → Download my data</Link>.
                  </li>
                  <li>
                    <strong>Delete:</strong> delete individual items, or your whole account (see below).
                  </li>
                  <li>
                    <strong>Avoid AI processing:</strong> use the Quick summary, which never leaves your browser.
                  </li>
                </ul>
                <p>
                  Depending on where you live (for example under India’s DPDP Act or the EU/UK GDPR), you may have further rights
                  such as objecting to processing or complaining to a data-protection authority. Contact us to exercise them.
                </p>
              </Section>

              <Section id="account-recovery" title="Account recovery">
                <ul>
                  <li>
                    <strong>Forgot your password?</strong> Use <Link to="/forgot-password">Reset password</Link>. We email a secure
                    link to the address on your account; it expires after a short time.
                  </li>
                  <li>
                    <strong>Lost your two-factor device?</strong> For your security we can’t switch 2FA off just because someone
                    asks. Keep the setup key shown when you turned on 2FA somewhere safe — you can add it to a new authenticator
                    app. If you’ve lost it, contact us from the email address on your account; we will ask you to verify your
                    identity before helping.
                  </li>
                  <li>
                    <strong>No longer have access to your email?</strong> Contact us. We may not be able to restore access if we
                    can’t confirm the account is yours.
                  </li>
                  <li>
                    <strong>Think someone else signed in?</strong> Change your password, turn on 2FA and use{' '}
                    <Link to="/security">Sign out other devices</Link>.
                  </li>
                </ul>
                <p>Deleted accounts can’t be recovered.</p>
              </Section>

              <Section id="deletion" title="Deleting your account">
                <p>
                  Go to <Link to="/security">Security → Delete account</Link>. Your account is deleted immediately, together with
                  your profile, publications and work, documents and their files, summaries, reading list, college data and
                  support tickets. Copies in encrypted backups are removed automatically when those backups expire.
                </p>
              </Section>

              <Section id="google" title="Google services and policies">
                <ul>
                  <li>CiteCraft does not offer “Sign in with Google” and does not access your Google account or Google data.</li>
                  <li>We don’t use Google Analytics or Google advertising.</li>
                  <li>
                    We use <strong>Google Fonts</strong> to display text; Google’s{' '}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                      privacy policy
                    </a>{' '}
                    applies to those requests.
                  </li>
                  <li>A Google Scholar link on your profile is just a link you choose to add; we don’t fetch data from Google Scholar.</li>
                  <li>
                    If we ever add a Google integration, we will ask for your permission first and follow Google’s API Services
                    User Data Policy, including its Limited Use requirements.
                  </li>
                </ul>
              </Section>

              <Section id="acceptable-use" title="Acceptable use and policy violations">
                <p>Please don’t use CiteCraft to upload, store or share content that:</p>
                <ul>
                  <li>is illegal, or infringes someone else’s copyright or other rights (for example, pirated books or papers);</li>
                  <li>contains malware or tries to break, probe or overload the service;</li>
                  <li>is hateful, harassing, sexually explicit, violent or otherwise harmful — especially on a public profile;</li>
                  <li>is spam, impersonates someone, or is deliberately misleading (for example, fake publications or citations);</li>
                  <li>includes other people’s personal or sensitive information without their permission;</li>
                  <li>
                    breaks the policies of services we rely on, such as Google’s, Supabase’s, Netlify’s or Anthropic’s usage
                    policies (for example, using AI summaries for prohibited purposes).
                  </li>
                </ul>
                <p>
                  <strong>Reporting a violation:</strong> if you see a public profile or content that breaks these rules, report it
                  through {support}
                  {contact && (
                    <>
                      {' '}or by email to <a href={`mailto:${contact}`}>{contact}</a>
                    </>
                  )}
                  , including the link. We review reports and may remove content, disable a public profile, or suspend or delete
                  accounts that break these rules, and may report illegal content to the authorities.
                </p>
              </Section>

              <Section id="browser-storage" title="Cookies and browser storage">
                <p>
                  We don’t use advertising or tracking cookies. Your browser stores a few things locally to make the site work:
                  your sign-in session, light/dark theme, your chosen summary type, recent citations in the citation generator,
                  focus-timer counts and the assistant chat for the current session. In demo mode, demo data is also kept only in
                  your browser. Clearing your browser data removes these.
                </p>
              </Section>

              <Section id="children" title="Children and students under 18">
                <p>
                  CiteCraft is meant for college and university students, researchers and staff. It is not directed at children
                  under 13. If you are under 18, please use CiteCraft with the permission of a parent or guardian, and don’t make
                  your profile public without it.
                </p>
              </Section>

              <Section id="changes" title="Changes to this policy">
                <p>
                  If we change this policy, we’ll update the date at the top. For significant changes we’ll let signed-in users
                  know in the app before they take effect.
                </p>
              </Section>

              <Section id="contact" title="Contact us">
                <p>
                  Questions, data requests or reports: use {support}
                  {contact ? (
                    <>
                      {' '}or email <a href={`mailto:${contact}`}>{contact}</a>.
                    </>
                  ) : (
                    '.'
                  )}
                </p>
              </Section>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
