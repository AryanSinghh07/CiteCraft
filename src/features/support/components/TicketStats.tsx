import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Ticket } from '@/types';
import { CATEGORIES, SHORT_CATEGORY_LABELS, formatDuration, isActive } from '../utils/ticketMeta';

/** Headline numbers and a by-category chart for the admin panel. */
const TicketStats = ({ tickets }: { tickets: Ticket[] }) => {
  const stats = useMemo(() => {
    const active = tickets.filter(t => isActive(t.status));
    const resolved = tickets.filter(t => t.resolvedAt);
    const avgResolution =
      resolved.length === 0
        ? null
        : resolved.reduce((sum, t) => sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()), 0) /
          resolved.length;
    const rated = tickets.filter(t => t.rating);
    const avgRating = rated.length ? rated.reduce((s, t) => s + (t.rating ?? 0), 0) / rated.length : null;

    return {
      open: active.length,
      highPriority: active.filter(t => t.priority === 'high').length,
      unassigned: active.filter(t => !t.assignedTo).length,
      avgResolution,
      avgRating,
      byCategory: CATEGORIES.map(c => ({
        name: SHORT_CATEGORY_LABELS[c],
        tickets: tickets.filter(t => t.category === c).length,
      })),
    };
  }, [tickets]);

  const cards = [
    { label: 'Open tickets', value: String(stats.open) },
    { label: 'High priority', value: String(stats.highPriority), accent: stats.highPriority > 0 },
    { label: 'Unassigned', value: String(stats.unassigned) },
    { label: 'Avg. resolution', value: stats.avgResolution === null ? '—' : formatDuration(stats.avgResolution) },
    { label: 'Avg. rating', value: stats.avgRating === null ? '—' : `${stats.avgRating.toFixed(1)} ★` },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4 lg:col-span-1">
        {cards.map(card => (
          <Card key={card.label} className="glass-card">
            <CardHeader className="p-4">
              <CardDescription className="text-xs">{card.label}</CardDescription>
              <CardTitle className={`text-2xl ${card.accent ? 'text-red-600 dark:text-red-400' : ''}`}>
                {card.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tickets by category</CardTitle>
        </CardHeader>
        <CardContent className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.byCategory} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketStats;
