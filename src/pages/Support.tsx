import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyTickets } from '@/features/support/hooks/useTickets';
import NewTicketForm from '@/features/support/components/NewTicketForm';
import TicketList from '@/features/support/components/TicketList';
import { formatTicketNumber, isActive } from '@/features/support/utils/ticketMeta';
import type { TicketInput } from '@/types';
import { LifeBuoy, Plus, Search, ShieldCheck } from 'lucide-react';

const FAQ = [
  {
    q: 'My publication changes are not showing up',
    a: 'Changes are saved immediately. If something looks out of date, refresh the page. If it is still wrong, raise a ticket with the publication title.',
  },
  {
    q: 'How do I change my profile photo?',
    a: 'Open Profile, click your photo, choose an image up to 2 MB and press Save Changes.',
  },
  {
    q: 'I forgot my password',
    a: 'Use “Forgot password?” on the sign in page. We will email you a link to choose a new one.',
  },
  {
    q: 'Which files can I upload?',
    a: 'The document library accepts PDF, DOCX, PPTX and TXT files up to 10 MB. Ticket attachments accept images, PDF and text files up to 5 MB.',
  },
];

type Filter = 'active' | 'done' | 'all';

const Support = () => {
  const { isAdmin } = useAuth();
  const { tickets, isLoading, error, create } = useMyTickets();
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter(t => {
      const matchesFilter = filter === 'all' || (filter === 'active' ? isActive(t.status) : !isActive(t.status));
      const matchesSearch =
        !q || t.subject.toLowerCase().includes(q) || formatTicketNumber(t.ticketNumber).toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [tickets, filter, search]);

  const activeCount = tickets.filter(t => isActive(t.status)).length;

  const handleCreate = async (input: TicketInput, files: File[]) => {
    try {
      const ticket = await create.mutateAsync({ input, files });
      setIsDialogOpen(false);
      toast({ title: `Ticket ${formatTicketNumber(ticket.ticketNumber)} created`, description: 'Our team will get back to you soon.' });
      navigate(`/support/${ticket.id}`);
    } catch (err) {
      toast({
        title: 'Could not create ticket',
        description: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <LifeBuoy className="h-7 w-7 text-primary" />
                Help & Support
              </h1>
              <p className="text-muted-foreground">Raise a ticket and track replies from our team</p>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Button asChild variant="outline">
                  <Link to="/admin/tickets">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Admin panel
                  </Link>
                </Button>
              )}
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Raise a ticket
              </Button>
            </div>
          </div>

          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-2">Quick answers</h2>
            <Accordion type="single" collapsible className="rounded-lg border bg-card px-4">
              {FAQ.map(item => (
                <AccordionItem key={item.q} value={item.q} className="last:border-b-0">
                  <AccordionTrigger className="text-sm text-left">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <section>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
              <h2 className="text-lg font-semibold">My tickets</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search tickets"
                    className="pl-9 sm:w-56"
                    aria-label="Search tickets"
                  />
                </div>
                <Tabs value={filter} onValueChange={v => setFilter(v as Filter)}>
                  <TabsList>
                    <TabsTrigger value="active">Active{activeCount ? ` (${activeCount})` : ''}</TabsTrigger>
                    <TabsTrigger value="done">Resolved</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {error ? (
              <p className="text-sm text-destructive py-8 text-center">Couldn't load your tickets: {error.message}</p>
            ) : isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <TicketList
                tickets={visible}
                emptyMessage={
                  tickets.length === 0
                    ? "You haven't raised any tickets yet. Need help? Click “Raise a ticket”."
                    : 'No tickets match this filter.'
                }
              />
            )}
          </section>
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Raise a ticket</DialogTitle>
            <DialogDescription>Tell us what you need help with. We usually reply within one working day.</DialogDescription>
          </DialogHeader>
          <NewTicketForm
            onSubmit={handleCreate}
            onCancel={() => setIsDialogOpen(false)}
            isSubmitting={create.isPending}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Support;
