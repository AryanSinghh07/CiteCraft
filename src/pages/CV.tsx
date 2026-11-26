import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoadingScreen from '@/components/common/LoadingScreen';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePublications } from '@/features/publications/hooks/usePublications';
import { CITATION_STYLES, formatCitation, type CitationStyle } from '@/features/publications/utils/citations';
import { researchMetrics } from '@/utils/metrics';
import type { PublicationType } from '@/types';
import { ArrowLeft, Printer } from 'lucide-react';

const SECTIONS: { type: PublicationType; title: string }[] = [
  { type: 'journal', title: 'Journal Articles' },
  { type: 'conference', title: 'Conference Papers' },
  { type: 'book', title: 'Books' },
  { type: 'chapter', title: 'Book Chapters' },
  { type: 'other', title: 'Other Publications' },
];

/** Publication CV formatted for printing; "Save as PDF" in the print dialog makes the PDF. */
const CV = () => {
  const { profile } = useAuth();
  const { publications, isLoading } = usePublications();
  const [style, setStyle] = useState<CitationStyle>('apa');
  const metrics = useMemo(() => researchMetrics(publications), [publications]);
  const sorted = useMemo(() => [...publications].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)), [publications]);

  if (isLoading) return <LoadingScreen label="Preparing your CV…" />;

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white">
      <div className="print:hidden sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Select value={style} onValueChange={v => setStyle(v as CitationStyle)}>
              <SelectTrigger className="w-[140px]" aria-label="Citation style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CITATION_STYLES) as CitationStyle[]).map(s => (
                  <SelectItem key={s} value={s}>
                    {CITATION_STYLES[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
            </Button>
          </div>
        </div>
      </div>

      <article className="mx-auto my-8 max-w-4xl bg-white text-neutral-900 shadow-lg p-8 sm:p-12 print:my-0 print:shadow-none print:p-0 print:max-w-none">
        <header className="border-b-2 border-neutral-900 pb-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{profile?.name || 'Your Name'}</h1>
          <p className="text-neutral-700">
            {[profile?.position, profile?.department, profile?.affiliation].filter(Boolean).join(' · ')}
          </p>
          <p className="text-sm text-neutral-600 mt-1">
            {[
              profile?.email,
              profile?.orcid && `ORCID ${profile.orcid}`,
              profile?.website,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </header>

        {profile?.bio && (
          <section className="mb-6 break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-2">Profile</h2>
            <p className="text-sm leading-relaxed">{profile.bio}</p>
          </section>
        )}

        <section className="mb-6 break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-2">Research metrics</h2>
          <p className="text-sm">
            {publications.length} publications · {metrics.totalCitations.toLocaleString()} citations · h-index{' '}
            {metrics.hIndex} · i10-index {metrics.i10Index}
          </p>
          {profile?.researchInterests && profile.researchInterests.length > 0 && (
            <p className="text-sm mt-1">
              <span className="font-semibold">Research interests:</span> {profile.researchInterests.join(', ')}
            </p>
          )}
        </section>

        {SECTIONS.map(section => {
          const items = sorted.filter(p => p.type === section.type);
          if (items.length === 0) return null;
          return (
            <section key={section.type} className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-3">
                {section.title} ({items.length})
              </h2>
              <ol className="space-y-2 text-sm leading-relaxed list-decimal pl-6 marker:text-neutral-500">
                {items.map(p => (
                  <li key={p.id} className="break-inside-avoid pl-1">
                    {formatCitation(p, style)}
                    {(p.citations ?? 0) > 0 && (
                      <span className="text-neutral-500"> [Cited by {p.citations?.toLocaleString()}]</span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          );
        })}

        {publications.length === 0 && <p className="text-sm text-neutral-500">No publications yet.</p>}

        <footer className="mt-10 pt-3 border-t text-xs text-neutral-400">
          Generated with CiteCraft on {new Date().toLocaleDateString()}
        </footer>
      </article>
    </div>
  );
};

export default CV;
