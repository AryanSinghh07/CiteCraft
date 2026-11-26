import { Link, useParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LoadingScreen from '@/components/common/LoadingScreen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useStaff, useTicket } from '@/features/support/hooks/useTickets';
import TicketThread from '@/features/support/components/TicketThread';
import ReplyBox from '@/features/support/components/ReplyBox';
import TicketRating from '@/features/support/components/TicketRating';
import AdminTicketControls from '@/features/support/components/AdminTicketControls';
import { PriorityLabel, StatusBadge } from '@/features/support/components/TicketBadges';
import { CATEGORY_LABELS, formatTicketNumber } from '@/features/support/utils/ticketMeta';
import type { TicketAttachment, TicketUpdate } from '@/types';
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

const SupportTicket = () => {
  const { ticketId = '' } = useParams();
  const { user, isAdmin } = useAuth();
  const { ticket, messages, attachments, isLoading, error, reply, update, openAttachment } = useTicket(ticketId);
  const { data: staff = [] } = useStaff();
  const { toast } = useToast();

  const backTo = isAdmin && ticket?.userId !== user?.id ? '/admin/tickets' : '/support';

  const handleUpdate = async (patch: TicketUpdate, successTitle: string) => {
    try {
      await update.mutateAsync(patch);
      toast({ title: successTitle });
    } catch (err) {
      toast({ title: 'Could not update ticket', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const handleReply = async (message: { body: string; isInternal: boolean; files: File[] }) => {
    try {
      await reply.mutateAsync(message);
    } catch (err) {
      toast({ title: 'Could not send reply', description: errorMessage(err), variant: 'destructive' });
      throw err;
    }
  };

  const handleOpenAttachment = async (attachment: TicketAttachment) => {
    try {
      await openAttachment(attachment);
    } catch (err) {
      toast({ title: 'Could not open file', description: errorMessage(err), variant: 'destructive' });
    }
  };

  if (isLoading) return <LoadingScreen label="Loading ticket…" />;

  if (!ticket || error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow pt-32 pb-12 text-center container mx-auto px-4">
          <h1 className="text-2xl font-bold mb-2">Ticket not found</h1>
          <p className="text-muted-foreground mb-6">
            {error?.message ?? "This ticket doesn't exist or you don't have access to it."}
          </p>
          <Button asChild variant="outline">
            <Link to="/support">Back to support</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const isRequester = ticket.userId === user?.id;
  const isClosed = ticket.status === 'closed';
  const isDone = ticket.status === 'resolved' || isClosed;
  const canReply = isAdmin || !isClosed;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {backTo === '/support' ? 'My tickets' : 'All tickets'}
          </Link>

          <div className="mb-6 space-y-2 animate-fade-in">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{formatTicketNumber(ticket.ticketNumber)}</span>
              <StatusBadge status={ticket.status} forStaff={isAdmin && !isRequester} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold break-words">{ticket.subject}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <TicketThread
                    ticket={ticket}
                    messages={messages}
                    attachments={attachments}
                    currentUserId={user?.id ?? ''}
                    onOpenAttachment={handleOpenAttachment}
                  />
                </CardContent>
              </Card>

              {canReply ? (
                <ReplyBox onSend={handleReply} isSending={reply.isPending} allowInternal={isAdmin} />
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  This ticket is closed. Reopen it to send a reply.
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {isAdmin ? (
                    <AdminTicketControls
                      ticket={ticket}
                      staff={staff}
                      disabled={update.isPending}
                      onChange={patch => handleUpdate(patch, 'Ticket updated')}
                    />
                  ) : (
                    <>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Category</span>
                        <span className="text-right">{CATEGORY_LABELS[ticket.category]}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Priority</span>
                        <PriorityLabel priority={ticket.priority} />
                      </div>
                    </>
                  )}
                  <Separator />
                  {isAdmin && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Requester</span>
                      <span className="text-right truncate">
                        {ticket.requesterName || 'Unknown'}
                        <span className="block text-xs text-muted-foreground truncate">{ticket.requesterEmail}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Last update</span>
                    <span>{new Date(ticket.updatedAt).toLocaleString()}</span>
                  </div>
                  {ticket.resolvedAt && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Resolved</span>
                      <span>{new Date(ticket.resolvedAt).toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {isRequester && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{isDone ? 'How did we do?' : 'Actions'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isDone && (
                      <div className="space-y-1">
                        <TicketRating
                          value={ticket.rating}
                          disabled={update.isPending}
                          onRate={rating => handleUpdate({ rating }, 'Thanks for your feedback!')}
                        />
                        <p className="text-xs text-muted-foreground">
                          {ticket.rating ? 'You can change your rating at any time.' : 'Rate the support you received.'}
                        </p>
                      </div>
                    )}
                    {isDone ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={update.isPending}
                        onClick={() => handleUpdate({ status: 'open' }, 'Ticket reopened')}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reopen ticket
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={update.isPending}
                        onClick={() => handleUpdate({ status: 'closed' }, 'Ticket closed')}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Close ticket — I'm sorted
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {isAdmin && !isDone && (
                <Button
                  className="w-full"
                  disabled={update.isPending}
                  onClick={() => handleUpdate({ status: 'resolved' }, 'Marked as resolved')}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as resolved
                </Button>
              )}
              {isAdmin && !isRequester && ticket.rating && (
                <Card>
                  <CardContent className="pt-6 space-y-1">
                    <p className="text-xs text-muted-foreground">Requester rating</p>
                    <TicketRating value={ticket.rating} />
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SupportTicket;
