/**
 * A very small, safe Markdown renderer for assistant answers: paragraphs,
 * line breaks, **bold**, *italic*, `code`, headings and bullet or numbered lists.
 * Everything is built as React elements; no HTML from the model is ever
 * injected.
 */

import { Fragment, type ReactNode } from 'react';

/**
 * Inline marks: **bold** / __bold__, *italic* / _italic_ and `code`.
 * Italic needs a non-letter before and after the marks, so snake_case words
 * and numbers like 2*3 stay as typed.
 */
const INLINE = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+`|(?<![A-Za-z0-9*])\*(?![\s*])[^*\n]+?(?<!\s)\*(?![A-Za-z0-9*])|(?<![A-Za-z0-9_])_(?![\s_])[^_\n]+?(?<!\s)_(?![A-Za-z0-9_]))/g;

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const tok = m[0];
    const k = `${key}-${i++}`;
    if (tok.startsWith('**') || tok.startsWith('__')) {
      out.push(<strong key={k} className="font-semibold text-slate-900">{inline(tok.slice(2, -2), k)}</strong>);
    } else if (tok.startsWith('`')) {
      out.push(<code key={k} className="rounded bg-slate-100 px-1 py-0.5 text-[0.8em]">{tok.slice(1, -1)}</code>);
    } else {
      out.push(<em key={k} className="italic text-slate-600">{inline(tok.slice(1, -1), k)}</em>);
    }
    last = at + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'h'; text: string };

function blocks(src: string): Block[] {
  const list: Block[] = [];
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    const bullet = /^\s*(?:[-*•])\s+(.*)$/.exec(line);
    const num = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const head = /^\s*#{1,4}\s+(.*)$/.exec(line);
    const prev = list[list.length - 1];
    if (!line.trim()) { list.push({ kind: 'p', lines: [] }); continue; }
    if (head) { list.push({ kind: 'h', text: head[1] }); continue; }
    if (bullet) {
      if (prev?.kind === 'ul') prev.items.push(bullet[1]); else list.push({ kind: 'ul', items: [bullet[1]] });
      continue;
    }
    if (num) {
      if (prev?.kind === 'ol') prev.items.push(num[1]); else list.push({ kind: 'ol', items: [num[1]] });
      continue;
    }
    if (prev?.kind === 'p' && prev.lines.length) prev.lines.push(line); else list.push({ kind: 'p', lines: [line] });
  }
  return list.filter((b) => !(b.kind === 'p' && !b.lines.length));
}

export function AiMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-[0.875rem] leading-relaxed text-slate-700">
      {blocks(text).map((b, i) => {
        const k = `b${i}`;
        if (b.kind === 'h') return <p key={k} className="font-semibold text-slate-900">{inline(b.text, k)}</p>;
        if (b.kind === 'ul') {
          return (
            <ul key={k} className="ml-4 list-disc space-y-1 marker:text-brand-500">
              {b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}
            </ul>
          );
        }
        if (b.kind === 'ol') {
          return (
            <ol key={k} className="ml-4 list-decimal space-y-1 marker:text-slate-400">
              {b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}
            </ol>
          );
        }
        return (
          <p key={k}>
            {b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, `${k}-${j}`)}</Fragment>)}
          </p>
        );
      })}
    </div>
  );
}
