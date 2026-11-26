import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Reveal from '@/components/common/Reveal';
import AnimatedNumber from '@/components/common/AnimatedNumber';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  Download,
  FileText,
  Globe,
  LifeBuoy,
  Quote,
  Quote as QuoteIcon,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Wand2,
    title: 'Import in seconds',
    text: 'Paste a DOI and the details fill themselves in, or bring your whole library from a BibTeX file.',
  },
  {
    icon: BarChart3,
    title: 'Know your impact',
    text: 'h-index, i10-index, citations by year and your most-cited work, calculated automatically.',
  },
  {
    icon: Download,
    title: 'Export anywhere',
    text: 'APA, MLA or IEEE reference lists, CSV, BibTeX and a printable CV ready to save as PDF.',
  },
  {
    icon: Globe,
    title: 'Share a public profile',
    text: 'One link with your bio, metrics and publications. Your email is never shown.',
  },
  {
    icon: BookMarked,
    title: 'A reading list that remembers',
    text: 'Save papers you read with status and notes, then cite or export them in one click.',
  },
  {
    icon: QuoteIcon,
    title: 'Cite anything, free',
    text: 'Turn a DOI into an APA, MLA, IEEE, Harvard or Chicago citation — no account needed.',
  },
  {
    icon: FileText,
    title: 'Summarize documents',
    text: 'Upload a paper, thesis or slide deck and get a clear AI summary in seconds.',
  },
  {
    icon: LifeBuoy,
    title: 'Help when you need it',
    text: 'A built-in assistant answers questions and guides you, and support tickets reach a real person.',
  },
];

const AUDIENCES = [
  {
    icon: GraduationCap,
    title: 'For students',
    type: 'student',
    points: [
      'Track projects, theses, reports, preprints and posters',
      'A reading list with notes for every paper you read',
      'Citations in APA, MLA, IEEE, Harvard and Chicago',
      'AI summaries of papers, slides and notes',
      'An academic CV and profile for internships and applications',
    ],
  },
  {
    icon: Briefcase,
    title: 'For researchers & faculty',
    type: 'researcher',
    points: [
      'Import publications by DOI or from Google Scholar (BibTeX)',
      'h-index, i10-index and citation trends',
      'Reference lists and a printable publication CV',
      'A public research profile you can share',
      'Document library with AI summaries',
    ],
  },
] as const;

const STEPS = [
  { title: 'Create your account', text: 'Sign up free as a student or researcher and fill in your profile.' },
  { title: 'Add your work', text: 'Projects, theses or papers — import by DOI or BibTeX, or add them by hand.' },
  { title: 'Share and export', text: 'Publish your profile link, download your CV and copy citations in any style.' },
];

/** A small animated preview of the dashboard for the hero. */
const HeroPreview = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep(s => (s + 1) % 3), 2600);
    return () => clearInterval(id);
  }, []);
  const values = [
    { pubs: 18, cites: 412, h: 9 },
    { pubs: 19, cites: 437, h: 10 },
    { pubs: 21, cites: 468, h: 10 },
  ][step];

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/30 via-purple-500/20 to-sky-400/20 blur-2xl" aria-hidden />
      <div className="relative rounded-2xl border bg-card/90 backdrop-blur shadow-2xl p-5 space-y-4">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Publications', value: values.pubs },
            { label: 'Citations', value: values.cites },
            { label: 'h-index', value: values.h },
          ].map(stat => (
            <div key={stat.label} className="rounded-lg bg-muted/60 p-3">
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              <AnimatedNumber value={stat.value} className="text-xl font-bold" />
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1.5 h-24" aria-hidden>
          {[30, 45, 38, 60, 52, 75, 68, 90].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-primary transition-all duration-700"
              style={{ height: `${Math.min(100, h + (i === 7 ? step * 4 : 0))}%` }}
            />
          ))}
        </div>
        <div className="space-y-2">
          {['Deep learning for crop disease detection', 'A CBT chatbot for student wellbeing'].map((title, i) => (
            <div key={title} className="flex items-center gap-3 rounded-lg border p-2.5">
              <div className="h-8 w-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{title}</p>
                <p className="text-[11px] text-muted-foreground">{i === 0 ? 'Journal · 2024' : 'Conference · 2024'}</p>
              </div>
              <Quote className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -left-6 top-24 hidden sm:flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs shadow-lg animate-float">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Imported from DOI
      </div>
      <div
        className="absolute -right-4 bottom-16 hidden sm:flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs shadow-lg animate-float"
        style={{ animationDelay: '1.5s' }}
      >
        <Upload className="h-3.5 w-3.5 text-primary" /> CV exported
      </div>
    </div>
  );
};

const Index = () => {
  const { user } = useAuth();
  const primaryCta = user ? { to: '/dashboard', label: 'Go to your dashboard' } : { to: '/signup', label: 'Get started free' };

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Navbar />

      <main className="flex-grow">
        {/* Hero */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-28">
          <div
            className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
            aria-hidden
          />
          <div className="absolute top-20 -left-24 -z-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <div className="absolute top-40 -right-24 -z-10 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl" aria-hidden />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
            <div className="text-center lg:text-left space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary animate-fade-in">
                <Sparkles className="h-4 w-4" />
                New: student accounts & free citation generator
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] animate-fade-in [animation-delay:100ms] [animation-fill-mode:backwards]">
                Your research,
                <span className="block bg-gradient-to-r from-primary via-purple-500 to-sky-500 bg-clip-text text-transparent">
                  beautifully organised
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 animate-fade-in [animation-delay:200ms] [animation-fill-mode:backwards]">
                CiteCraft helps students and researchers organise their work, cite sources, track impact and
                share a professional profile — in minutes, not hours.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start animate-fade-in [animation-delay:300ms] [animation-fill-mode:backwards]">
                <Button asChild size="lg" className="group shadow-lg shadow-primary/25">
                  <Link to={primaryCta.to}>
                    {primaryCta.label}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/cite">
                    <QuoteIcon className="mr-2 h-4 w-4" />
                    Free citation generator
                  </Link>
                </Button>
              </div>

              <ul className="flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start text-sm text-muted-foreground animate-fade-in [animation-delay:400ms] [animation-fill-mode:backwards]">
                {['Free for students', 'APA · MLA · IEEE · Harvard', 'Works on any device'].map(item => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="animate-scale-in [animation-delay:200ms] [animation-fill-mode:backwards]">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 md:py-28 bg-muted/30 scroll-mt-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Everything in one place</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for how students and academics actually work</h2>
              <p className="text-lg text-muted-foreground">
                Stop maintaining your publication list in five different places.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((feature, i) => (
                <Reveal key={feature.title} delay={(i % 4) * 90}>
                  <div className="group h-full rounded-xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/30">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Audiences */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <Reveal className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Made for every stage of an academic career</h2>
              <p className="text-lg text-muted-foreground">From your first project report to your hundredth paper.</p>
            </Reveal>
            <div className="grid gap-6 md:grid-cols-2">
              {AUDIENCES.map((audience, i) => (
                <Reveal key={audience.title} delay={i * 120}>
                  <div className="h-full rounded-2xl border bg-card p-6 sm:p-8 shadow-sm hover-lift flex flex-col">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <audience.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4">{audience.title}</h3>
                    <ul className="space-y-2.5 flex-1">
                      {audience.points.map(point => (
                        <li key={point} className="flex gap-2 text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    {!user && (
                      <Button asChild variant={audience.type === 'student' ? 'default' : 'outline'} className="mt-6 group">
                        <Link to={`/signup?type=${audience.type}`}>
                          {audience.type === 'student' ? 'Join as a student' : 'Join as a researcher'}
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <Reveal className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold">Up and running in three steps</h2>
            </Reveal>
            <ol className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-6 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden />
              {STEPS.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 150} className="relative text-center">
                  <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 ring-8 ring-background">
                    {i + 1}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-purple-600 px-6 py-16 text-center text-white shadow-2xl">
                <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
                <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden />
                <h2 className="relative text-3xl md:text-4xl font-bold mb-4">Ready to showcase your research?</h2>
                <p className="relative text-lg text-white/80 max-w-xl mx-auto mb-8">
                  Create your profile, import your publications and share one link with the world.
                </p>
                <Button asChild size="lg" variant="secondary" className="relative group shadow-lg">
                  <Link to={primaryCta.to}>
                    {primaryCta.label}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
