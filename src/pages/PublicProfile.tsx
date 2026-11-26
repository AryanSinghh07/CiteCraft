import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LoadingScreen from '@/components/common/LoadingScreen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { profileService } from '@/services';
import CiteMenu from '@/features/publications/components/CiteMenu';
import { researchMetrics } from '@/utils/metrics';
import { safeUrl } from '@/utils/safeUrl';
import { ExternalLink, Globe, GraduationCap, Search, User as UserIcon } from 'lucide-react';

const linkFor = (p: { doi?: string; url?: string }) =>
  p.doi ? `https://doi.org/${encodeURI(p.doi)}` : safeUrl(p.url);

const TYPE_LABEL = { journal: 'Journal', conference: 'Conference', book: 'Book', chapter: 'Chapter', other: 'Other' };

/** Shareable read-only profile page — works for visitors who are not signed in. */
const PublicProfile = () => {
  const { slug = '' } = useParams();
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-profile', slug],
    queryFn: () => profileService.getPublicProfile(slug),
  });

  const publications = useMemo(() => data?.publications ?? [], [data]);
  const metrics = useMemo(() => researchMetrics(publications), [publications]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return publications;
    return publications.filter(p =>
      [p.title, p.journal, p.conference, p.book, ...p.authors, ...(p.tags ?? [])].some(v => v?.toLowerCase().includes(q)),
    );
  }, [publications, search]);
  const years = useMemo(() => [...new Set(filtered.map(p => p.year))].sort((a, b) => b - a), [filtered]);

  if (isLoading) return <LoadingScreen label="Loading profile…" />;

  if (error || !data) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow pt-32 pb-12 text-center container mx-auto px-4">
          <UserIcon className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Profile not found</h1>
          <p className="text-muted-foreground mb-6">This profile doesn't exist or isn't public.</p>
          <Button asChild variant="outline">
            <Link to="/">Go to CiteCraft</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const { profile } = data;
  const links = [
    profile.orcid && { href: safeUrl(`https://orcid.org/${encodeURIComponent(profile.orcid)}`), label: 'ORCID', icon: ExternalLink },
    { href: safeUrl(profile.googleScholar), label: 'Google Scholar', icon: GraduationCap },
    { href: safeUrl(profile.website), label: 'Website', icon: Globe },
  ].filter((l): l is { href: string; label: string; icon: typeof Globe } => Boolean(l && l.href));

  const stats = [
    { label: 'Publications', value: publications.length },
    { label: 'Citations', value: metrics.totalCitations.toLocaleString() },
    { label: 'h-index', value: metrics.hIndex },
    { label: 'i10-index', value: metrics.i10Index },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-24 pb-16">
        <section className="bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl py-10">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left animate-fade-in">
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="w-32 h-32 rounded-full object-cover ring-4 ring-background shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center ring-4 ring-background shadow-lg">
                  <UserIcon size={48} className="text-muted-foreground" />
                </div>
              )}
              <div className="space-y-2 flex-1 min-w-0">
                <h1 className="text-3xl md:text-4xl font-bold">{profile.name}</h1>
                <p className="text-lg text-muted-foreground">
                  {[profile.position, profile.department].filter(Boolean).join(', ')}
                </p>
                {profile.affiliation && <p className="text-muted-foreground">{profile.affiliation}</p>}
                {links.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                    {links.map(link => (
                      <Button key={link.label} asChild variant="outline" size="sm">
                        <a href={link.href} target="_blank" rel="noopener noreferrer">
                          <link.icon className="mr-1.5 h-4 w-4" />
                          {link.label}
                        </a>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {profile.bio && <p className="mt-6 max-w-3xl text-foreground/90 leading-relaxed">{profile.bio}</p>}

            {profile.researchInterests && profile.researchInterests.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.researchInterests.map(interest => (
                  <Badge key={interest} variant="secondary">
                    {interest}
                  </Badge>
                ))}
              </div>
            )}

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <Card key={stat.label} className="glass-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h2 className="text-2xl font-semibold">Publications</h2>
            {publications.length > 5 && (
              <div className="relative sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search publications"
                  className="pl-9"
                  aria-label="Search publications"
                />
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              {publications.length === 0 ? 'No publications yet.' : 'No publications match your search.'}
            </p>
          ) : (
            <div className="space-y-8">
              {years.map(year => (
                <div key={year}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-20 bg-background/90 backdrop-blur py-1">
                    {year}
                  </h3>
                  <ul className="space-y-3">
                    {filtered
                      .filter(p => p.year === year)
                      .map(p => (
                        <li key={p.id} className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
                          <div className="flex gap-3 justify-between">
                            <div className="min-w-0 space-y-1">
                              <p className="font-medium leading-snug">
                                {linkFor(p) ? (
                                  <a
                                    href={linkFor(p)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-primary hover:underline"
                                  >
                                    {p.title}
                                  </a>
                                ) : (
                                  p.title
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">{p.authors.join(', ')}</p>
                              <p className="text-sm text-muted-foreground italic">
                                {p.journal || p.conference || p.book}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Badge variant="outline" className="font-normal">
                                  {TYPE_LABEL[p.type]}
                                </Badge>
                                {(p.citations ?? 0) > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {p.citations?.toLocaleString()} citations
                                  </span>
                                )}
                              </div>
                            </div>
                            <CiteMenu publication={p} />
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PublicProfile;
