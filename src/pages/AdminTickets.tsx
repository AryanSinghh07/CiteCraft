import { useMemo, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAllTickets, useStaff } from '@/features/support/hooks/useTickets';
import TicketList from '@/features/support/components/TicketList';
import TicketStats from '@/features/support/components/TicketStats';
import {
  CATEGORIES,
  PRIORITIES,
  PRIORITY_META,
  SHORT_CATEGORY_LABELS,
  STATUSES,
  formatTicketNumber,
  isActive,
  statusLabel,
} from '@/features/support/utils/ticketMeta';
import { RefreshCw, Search, ShieldCheck } from 'lucide-react';

const ALL = 'all';
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

const AdminTickets = () => {
  const { user } = useAuth();
  const { tickets, isLoading, error, refetch } = useAllTickets();
  const { data: staff = [] } = useStaff();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('active');
  const [priority, setPriority] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [assignee, setAssignee] = useState<string>(ALL);

  const staffNames = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s.name])), [staff]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets
      .filter(t => {
        if (status === 'active' ? !isActive(t.status) : status !== ALL && t.status !== status) return false;
        if (priority !== ALL && t.priority !== priority) return false;
        if (category !== ALL && t.category !== category) return false;
        if (assignee === 'me' && t.assignedTo !== user?.id) return false;
        if (assignee === 'none' && t.assignedTo) return false;
        if (!q) return true;
        return [t.subject, t.requesterName, t.requesterEmail, formatTicketNumber(t.ticketNumber)].some(v =>
          v.toLowerCase().includes(q),
        );
      })
      .sort((a, b) => {
        // Active work first, then by priority, then most recently updated.
        const activeDiff = Number(isActive(b.status)) - Number(isActive(a.status));
        if (activeDiff) return activeDiff;
        const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (priorityDiff) return priorityDiff;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [tickets, search, status, priority, category, assignee, user?.id]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-7 w-7 text-primary" />
                Support Tickets
              </h1>
              <p className="text-muted-foreground">Every query raised by CiteCraft users</p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-56 w-full mb-8" />
          ) : (
            <div className="mb-8 animate-fade-in">
              <TicketStats tickets={tickets} />
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by subject, requester or #CC-number"
                className="pl-9"
                aria-label="Search tickets"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:flex">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="lg:w-[160px]" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>
                      {statusLabel(s, true)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="lg:w-[140px]" aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All priorities</SelectItem>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_META[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="lg:w-[150px]" aria-label="Category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All categories</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>
                      {SHORT_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="lg:w-[150px]" aria-label="Assignee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Anyone</SelectItem>
                  <SelectItem value="me">Assigned to me</SelectItem>
                  <SelectItem value="none">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive py-8 text-center">Couldn't load tickets: {error.message}</p>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Showing {visible.length} of {tickets.length} tickets
              </p>
              <TicketList
                tickets={visible}
                forStaff
                staffNames={staffNames}
                emptyMessage={tickets.length === 0 ? 'No tickets yet.' : 'No tickets match these filters.'}
              />
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminTickets;
