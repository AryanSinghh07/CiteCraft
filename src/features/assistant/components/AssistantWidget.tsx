import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Markdown from '@/components/common/Markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ArrowUp, Bot, CheckCircle2, LifeBuoy, Loader2, MessageCircle, RotateCcw, Sparkles, X } from 'lucide-react';
import { useAssistant } from '../hooks/useAssistant';

const SUGGESTIONS = [
  'Add a paper from a DOI',
  'What is my h-index?',
  'How do I import from Google Scholar?',
  'How do I make my profile public?',
  'Export my publications as an APA list',
];

/** Floating chat assistant for signed-in users. */
const AssistantWidget = () => {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const { messages, isSending, send, clear } = useAssistant();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Close with Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (pathname === '/cv') return null;

  const submit = (text = input) => {
    if (!text.trim() || isSending) return;
    void send(text);
    setInput('');
  };

  const firstName = profile?.name?.split(' ')[0];

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        aria-expanded={open}
        className={cn(
          'fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 text-white shadow-xl shadow-primary/30 transition-all duration-300 hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 print:hidden',
          open && 'max-sm:hidden',
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && messages.length === 0 && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/40 [animation-duration:2.5s]" aria-hidden />
        )}
      </button>

      {/* Panel */}
      <div
        role="dialog"
        aria-label="CiteCraft assistant"
        aria-hidden={!open}
        className={cn(
          'fixed z-50 flex flex-col overflow-hidden border bg-background shadow-2xl transition-all duration-300 print:hidden',
          'inset-0 sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[min(620px,calc(100vh-8rem))] sm:w-[400px] sm:rounded-2xl',
          open ? 'opacity-100 translate-y-0 visible' : 'pointer-events-none invisible translate-y-4 opacity-0',
        )}
      >
        <header className="flex items-center gap-3 border-b bg-gradient-to-r from-primary to-purple-600 px-4 py-3 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">CiteCraft Assistant</p>
            <p className="text-xs text-white/80">Help, answers and quick actions</p>
          </div>
          {messages.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={clear} className="text-white hover:bg-white/20 hover:text-white" aria-label="New conversation">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New conversation</TooltipContent>
            </Tooltip>
          )}
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-white hover:bg-white/20 hover:text-white sm:hidden" aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </header>

        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="space-y-4 animate-fade-up">
              <div className="rounded-2xl bg-muted p-4 text-sm">
                <p className="font-medium flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> Hi{firstName ? ` ${firstName}` : ''}!
                </p>
                <p className="mt-1 text-muted-foreground">
                  I can explain any part of CiteCraft, look up your stats, and add publications for you — just paste a DOI.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="rounded-full border bg-card px-3 py-1.5 text-xs transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(m =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end animate-fade-up">
                <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex gap-2 animate-fade-up">
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0 max-w-[88%] space-y-2">
                  <div
                    className={cn(
                      'rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm',
                      m.isError ? 'border border-destructive/30 bg-destructive/5 text-destructive' : 'bg-muted',
                    )}
                  >
                    {m.isError ? m.content : <Markdown>{m.content}</Markdown>}
                  </div>
                  {m.actions?.map(action =>
                    action.type === 'publication_added' ? (
                      <Link
                        key={action.id}
                        to="/dashboard"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs hover:bg-emerald-500/10"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="truncate">
                          Added <strong>{action.title}</strong>
                        </span>
                      </Link>
                    ) : (
                      <Link
                        key={action.id}
                        to={`/support/${action.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs hover:bg-primary/10"
                      >
                        <LifeBuoy className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">
                          Ticket <strong>#CC-{action.ticketNumber}</strong> created — view
                        </span>
                      </Link>
                    ),
                  )}
                </div>
              </div>
            ),
          )}

          {isSending && (
            <div className="flex gap-2 animate-fade-up">
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3" aria-label="Assistant is typing">
                {[0, 150, 300].map(delay => (
                  <span
                    key={delay}
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <form
          className="border-t p-3"
          onSubmit={e => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-end gap-2 rounded-xl border bg-card p-1.5 focus-within:ring-2 focus-within:ring-ring">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder="Ask anything or paste a DOI…"
              className="max-h-32 min-h-[40px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              aria-label="Message"
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-lg" disabled={!input.trim() || isSending} aria-label="Send">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            AI can make mistakes — check details before saving.
          </p>
        </form>
      </div>
    </>
  );
};

export default AssistantWidget;
