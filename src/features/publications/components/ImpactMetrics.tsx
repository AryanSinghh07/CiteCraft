import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Publication } from '@/types';
import { Info } from 'lucide-react';
import { citationsByPublicationYear, researchMetrics } from '@/utils/metrics';

const EXPLAIN = {
  h: 'You have h papers with at least h citations each.',
  i10: 'Number of papers with at least 10 citations.',
  avg: 'Total citations divided by number of publications.',
};

const Metric = ({ label, value, hint }: { label: string; value: string | number; hint: string }) => (
  <div className="space-y-1">
    <p className="text-sm text-muted-foreground flex items-center gap-1">
      {label}
      <UITooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={`What is ${label}?`} className="opacity-60 hover:opacity-100">
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px]">{hint}</TooltipContent>
      </UITooltip>
    </p>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

/** h-index, i10-index, averages and citations by publication year. */
const ImpactMetrics = ({ publications }: { publications: Publication[] }) => {
  const metrics = useMemo(() => researchMetrics(publications), [publications]);
  const byYear = useMemo(() => citationsByPublicationYear(publications), [publications]);

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle>Research impact</CardTitle>
          <CardDescription>Calculated from the citation counts on your publications</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Metric label="h-index" value={metrics.hIndex} hint={EXPLAIN.h} />
          <Metric label="i10-index" value={metrics.i10Index} hint={EXPLAIN.i10} />
          <Metric label="Total citations" value={metrics.totalCitations.toLocaleString()} hint="Sum of citations across all publications." />
          <Metric label="Avg. per paper" value={metrics.averageCitations.toFixed(1)} hint={EXPLAIN.avg} />
        </CardContent>
        {metrics.mostCited && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Most cited:{' '}
              <span className="text-foreground font-medium">{metrics.mostCited.title}</span> (
              {metrics.mostCited.citations?.toLocaleString()} citations)
            </p>
          </CardContent>
        )}
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle>Citations by publication year</CardTitle>
          <CardDescription>How many citations the papers from each year have earned</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {byYear.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center pt-24">Add publications to see this chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byYear} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" fontSize={12} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  formatter={(value: number, name: string) => [value.toLocaleString(), name === 'citations' ? 'Citations' : name]}
                  labelFormatter={year => {
                    const entry = byYear.find(y => y.year === year);
                    return `${year} · ${entry?.publications ?? 0} paper${entry?.publications === 1 ? '' : 's'}`;
                  }}
                />
                <Bar dataKey="citations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImpactMetrics;
