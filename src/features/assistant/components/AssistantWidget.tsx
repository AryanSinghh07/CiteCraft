import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Markdown from '@/components/common/Markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ArrowRight, ArrowUp, Bot, CheckCircle2, MessageCircle, RotateCcw, Sparkles, X } from 'lucide-react';
import { useAssistant, type QuickReply } from '../hooks/useAssistant';

/** Floating scripted assistant for signed-in users. */
const AssistantWidget = () => {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const { messages, isTyping, send, clear, menu } = useAssistant();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (pathname === '/cv') return null;

  const submit = () => {
    if (!input.trim() || isTyping) return;
    void send(input);
    setInput('');
  };
  const choose = (option: QuickReply) => void send(option.label, option.value);

  const firstName = profile?.name?.split(' ')[0];
  const lastBotIndex = messages.map(m => m.role).lastIndexOf('bot');

  const Options = ({ options }: { options: QuickReply[] }) => (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {options.map(option => (
        <button
          key={option.value + option.label}
          type="button"
          onClick={() => choose(option)}
          disabled={isTyping}
          className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
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
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-5 w-5" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">CiteCraft Assistant</p>
            <p className="text-xs text-white/80">Quick help and guided actions</p>
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
            <div className="space-y-3 animate-fade-up">
              <div className="rounded-2xl bg-muted p-4 text-sm">
                <p className="font-medium flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> Hi{firstName ? ` ${firstName}` : ''}! 👋
                </p>
                <p className="mt-1 text-muted-foreground">
                  I can answer questions about CiteCraft and walk you through adding work, finding papers or getting support. Tap an option or type a question — you can also paste a DOI.
                </p>
              </div>
              <Options options={menu} />
            </div>
          )}

          {messages.map((m, index) =>
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
                      m.tone === 'error' ? 'border border-destructive/30 bg-destructive/5' : 'bg-muted',
                    )}
                  >
                    <Markdown>{m.content}</Markdown>
                  </div>
                  {m.links?.map(link => (
                    <Link
                      key={link.to + link.label}
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors',
                        link.tone === 'success'
                          ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                          : 'border-primary/30 bg-primary/5 hover:bg-primary/10',
                      )}
                    >
                      {link.tone === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                      )}
                      <span className="truncate font-medium">{link.label}</span>
                    </Link>
                  ))}
                  {/* Buttons only on the latest bot message, so old choices can't be replayed. */}
                  {index === lastBotIndex && m.options && !isTyping && <Options options={m.options} />}
                </div>
              </div>
            ),
          )}

          {isTyping && (
            <div className="flex gap-2 animate-fade-up">
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3" aria-label="Assistant is typing">
                {[0, 150, 300].map(delay => (
                  <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${delay}ms` }} />
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
          <div className="flex items-center gap-2 rounded-xl border bg-card p-1.5 focus-within:ring-2 focus-within:ring-ring">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={2000}
              placeholder="Type a question or paste a DOI…"
              className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
              aria-label="Message"
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-lg" disabled={!input.trim() || isTyping} aria-label="Send">
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Type <strong>menu</strong> for options or <strong>cancel</strong> to stop at any time.
          </p>
        </form>
      </div>
    </>
  );
};

export default AssistantWidget;
