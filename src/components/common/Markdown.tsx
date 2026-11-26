import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { safeUrl } from '@/utils/safeUrl';

/**
 * Renders the small Markdown subset AI replies use (headings, lists, bold,
 * italic, inline code, links) as React elements — never as raw HTML, so model
 * output cannot inject markup or scripts.
 */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|(?<![\w*])\*[^*\s][^*]*\*(?!\w)|(?<!\w)_[^_\s][^_]*_(?!\w))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE).filter(part => part !== '');
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      if (href.startsWith('/') && !href.startsWith('//')) {
        return (
          <Link key={key} to={href} className="text-primary underline underline-offset-2 hover:no-underline">
            {label}
          </Link>
        );
      }
      const url = safeUrl(href);
      return url ? (
        <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:no-underline">
          {label}
        </a>
      ) : (
        <Fragment key={key}>{label}</Fragment>
      );
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      if (part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'p'; text: string }
  | { kind: 'hr' };

function parse(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', text: paragraph.join(' ') });
    paragraph = [];
  };

  for (const raw of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);

    if (!line.trim()) {
      flush();
    } else if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flush();
      blocks.push({ kind: 'hr' });
    } else if (heading) {
      flush();
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
    } else if (bullet || numbered) {
      flush();
      const kind = bullet ? 'ul' : 'ol';
      const text = (bullet ?? numbered)![1];
      const last = blocks[blocks.length - 1];
      if (last && last.kind === kind) last.items.push(text);
      else blocks.push({ kind, items: [text] });
    } else {
      const last = blocks[blocks.length - 1];
      // Continuation line of a list item.
      if (!paragraph.length && last && (last.kind === 'ul' || last.kind === 'ol') && /^\s{2,}/.test(raw)) {
        last.items[last.items.length - 1] += ` ${line.trim()}`;
      } else {
        paragraph.push(line.trim());
      }
    }
  }
  flush();
  return blocks;
}

const Markdown = ({ children, className }: { children: string; className?: string }) => {
  const blocks = parse(children);
  return (
    <div className={cn('space-y-3 leading-relaxed break-words', className)}>
      {blocks.map((block, i) => {
        const key = `b${i}`;
        switch (block.kind) {
          case 'heading': {
            const size = block.level <= 2 ? 'text-base font-semibold mt-4 first:mt-0' : 'text-sm font-semibold mt-3';
            return (
              <p key={key} className={size} role="heading" aria-level={Math.min(6, block.level + 1)}>
                {renderInline(block.text, key)}
              </p>
            );
          }
          case 'ul':
            return (
              <ul key={key} className="list-disc space-y-1 pl-5 marker:text-muted-foreground">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key} className="list-decimal space-y-1 pl-5 marker:text-muted-foreground">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          case 'hr':
            return <hr key={key} className="border-border" />;
          default:
            return <p key={key}>{renderInline(block.text, key)}</p>;
        }
      })}
    </div>
  );
};

export default Markdown;
