import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import StatCard from '@/components/common/StatCard';
import type { Publication, PublicationType } from '@/types';
import { generatePublicationSummary } from '@/utils/summary';
import { rank, researchMetrics, yearSeries } from '@/utils/metrics';
import {
  Award,
  BookOpen,
  CalendarRange,
  FileText,
  Hash,
  Plus,
  Printer,
  Quote,
  Sigma,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import ExportMenu from './ExportMenu';
import CiteMenu from './CiteMenu';
import { PUBLICATION_TYPES, PUBLICATION_TYPE_ORDER, venueOf } from '../utils/publicationTypes';

interface PublicationSummaryProps {
  publications: Publication[];
  /** the profile owner's name, excluded from co-author stats */
  ownerName?: string;
}

const C = (n: number) => `hsl(var(--chart-${n}))`;

const TYPE_META = Object.fromEntries(
  PUBLICATION_TYPE_ORDER.map((type, i) => [type, { label: PUBLICATION_TYPES[type].plural, color: C((i % 6) + 1) }]),
) as Record<PublicationType, { label: string; color: string }>;

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    color: 'hsl(var(--popover-foreground))',
    fontSize: 12,
  },
  labelStyle: { color: 'hsl(var(--muted-foreground))', marginBottom: 4 },
  cursor: { fill: 'hsl(var(--muted))', opacity: 0.5 },
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');

/** A ranked list with proportional bars. */
const RankedList = ({
  items,
  color,
  empty,
  avatar,
}: {
  items: { name: string; count: number }[];
  color: string;
  empty: string;
  avatar?: boolean;
}) => {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = items[0].count;
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={item.name} className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
          {avatar && (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
            >
              {initials(item.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-2 text-sm">
              <span className="truncate" title={item.name}>
                {item.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{item.count}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${(item.count / max) * 100}%`, background: color }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

/** Research insights: headline metrics, output over time, venues, collaborators and topics. */
const PublicationSummary = ({ publications, ownerName }: PublicationSummaryProps) => {
  const summary = useMemo(() => generatePublicationSummary(publications, ownerName), [publications, ownerName]);
  const metrics = useMemo(() => researchMetrics(publications), [publications]);
  const series = useMemo(() => yearSeries(publications), [publications]);

  const typeData = useMemo(
    () =>
      PUBLICATION_TYPE_ORDER
        .map(type => ({ type, ...TYPE_META[type], value: publications.filter(p => p.type === type).length }))
        .filter(d => d.value > 0),
    [publications],
  );
  const venues = useMemo(
    () => rank(publications.map(venueOf), 6),
    [publications],
  );
  const coAuthors = useMemo(
    () =>
      Object.entries(summary.coAuthors)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    [summary.coAuthors],
  );
  const topics = useMemo(() => rank(publications.flatMap(p => p.tags ?? []), 18), [publications]);
  const mostCited = useMemo(
    () => [...publications].filter(p => (p.citations ?? 0) > 0).sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0)).slice(0, 5),
    [publications],
  );

  if (publications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20 text-center animate-fade-up">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-float">
          <TrendingUp className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold">No insights yet</h2>
        <p className="mt-1 max-w-sm text-muted-foreground">
          Add or import your publications and your metrics, trends and collaborators will appear here.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">
            <Plus className="mr-2 h-4 w-4" /> Add publications
          </Link>
        </Button>
      </div>
    );
  }

  const firstYear = series[0]?.year;
  const lastYear = series[series.length - 1]?.year;
  const activeYears = series.length;
  const maxTopic = topics[0]?.count ?? 1;

  const kpis = [
    { label: 'Publications', value: publications.length, icon: FileText, color: C(1), trend: series.map(s => s.publications), caption: `${summary.journalArticles} journal · ${summary.conferenceProceedings} conference` },
    { label: 'Citations', value: metrics.totalCitations, icon: Quote, color: C(2), trend: series.map(s => s.citations), caption: 'across all publications' },
    { label: 'h-index', value: metrics.hIndex, icon: Award, color: C(3), hint: 'You have h papers with at least h citations each.', caption: 'Hirsch index' },
    { label: 'i10-index', value: metrics.i10Index, icon: Trophy, color: C(4), hint: 'Number of papers with at least 10 citations.', caption: 'papers with 10+ citations' },
    { label: 'Avg. citations', value: metrics.averageCitations, decimals: 1, icon: Sigma, color: C(5), caption: 'per publication' },
    { label: 'Active years', value: activeYears, icon: CalendarRange, color: C(6), caption: firstYear === lastYear ? `${firstYear}` : `${firstYear} – ${lastYear}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Research insights</h2>
          <p className="text-muted-foreground">
            {publications.length} publications · {firstYear === lastYear ? firstYear : `${firstYear}–${lastYear}`}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <ExportMenu publications={publications} />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <StatCard key={kpi.label} {...kpi} style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-fade-up [animation-delay:200ms]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Output & impact over time
            </CardTitle>
            <CardDescription>Publications per year, and the citations those papers have earned</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={36} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={44} stroke="hsl(var(--muted-foreground))" />
                <Tooltip {...tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="publications" name="Publications" fill={C(1)} radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Line yAxisId="right" type="monotone" dataKey="citations" name="Citations" stroke={C(2)} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="animate-fade-up [animation-delay:260ms]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Publication types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="label" innerRadius={55} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                    {typeData.map(d => (
                      <Cell key={d.type} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{publications.length}</span>
                <span className="text-xs text-muted-foreground">total</span>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {typeData.map(d => (
                <li key={d.type} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="flex-1">{d.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {d.value} · {Math.round((d.value / publications.length) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="animate-fade-up [animation-delay:300ms]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Top venues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankedList items={venues} color={C(1)} empty="Add journal or conference names to see venues." />
          </CardContent>
        </Card>

        <Card className="animate-fade-up [animation-delay:340ms]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Top collaborators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RankedList items={coAuthors} color={C(2)} empty="No co-authors yet." avatar />
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1 animate-fade-up [animation-delay:380ms]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" /> Research topics
            </CardTitle>
            <CardDescription>From your publication tags</CardDescription>
          </CardHeader>
          <CardContent>
            {topics.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Add tags to your publications to see topics.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topics.map(t => {
                  const weight = t.count / maxTopic;
                  return (
                    <span
                      key={t.name}
                      className="rounded-full border px-3 py-1 transition-colors hover:border-primary/40"
                      style={{
                        fontSize: `${0.75 + weight * 0.25}rem`,
                        background: `color-mix(in srgb, hsl(var(--primary)) ${Math.round(4 + weight * 14)}%, transparent)`,
                      }}
                      title={`${t.count} publication${t.count > 1 ? 's' : ''}`}
                    >
                      {t.name}
                    </span>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-up [animation-delay:420ms]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Most cited publications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mostCited.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Citation counts will appear here once added.</p>
          ) : (
            <ol className="space-y-4">
              {mostCited.map((p, i) => (
                <li key={p.id} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug">{p.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[venueOf(p), p.year].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-[width] duration-700"
                        style={{ width: `${((p.citations ?? 0) / (mostCited[0].citations ?? 1)) * 100}%`, background: C(2) }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{p.citations?.toLocaleString()}</span>
                  <CiteMenu publication={p} />
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicationSummary;
