/**
 * Small Markdown → HTML renderer for the editor's preview tab only. It escapes
 * all input first, so stored HTML never runs in the admin. The site renders
 * the real output with its own sanitised pipeline (ARCH D8).
 */
import type { AdminEntryRef, PublicMedia } from '../contract/cms-contract';
import { mediaThumb } from './MediaField';

interface Ctx {
  refs: Record<string, AdminEntryRef>;
  media: Record<string, PublicMedia>;
  tokens: Record<string, string>;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text: string, ctx: Ctx): string {
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/!\[([^\]]*)\]\(media:([A-Za-z0-9_-]+)\)/g, (_m, alt: string, id: string) => {
    const m = ctx.media[id];
    return m ? `<img src="${esc(mediaThumb(m.url, 640))}" alt="${esc(alt || m.alt)}" />` : `<span class="md-missing">[image ${esc(id)}]</span>`;
  });
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_m, label: string, href: string) => {
    const entry = /^entry:([A-Za-z0-9_-]+)(#[a-z0-9-]+)?$/.exec(href);
    if (entry) {
      const r = entry[1] ? ctx.refs[entry[1]] : undefined;
      return `<a class="md-entry" title="${esc(r ? `${r.title} (${r.path})` : href)}">${label}</a>`;
    }
    return `<a title="${href}">${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>').replace(/(^|\s)_([^_]+)_(?=\s|$)/g, '$1<em>$2</em>');
  out = out.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_m, inner: string) => {
    const example = ctx.tokens[`{{${inner}}}`];
    return `<span class="md-token" title="{{${esc(inner)}}}">${example ? esc(example) : `{{${esc(inner)}}}`}</span>`;
  });
  return out;
}

export function renderMarkdownPreview(md: string, ctx: Ctx): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) body.push(lines[i++] ?? '');
      i++;
      html.push(`<pre><code>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1]?.length ?? 2;
      html.push(`<h${level}${level === 1 || level > 3 ? ' class="md-bad"' : ''}>${inline(h[2] ?? '', ctx)}</h${level}>`);
      i++;
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i] ?? '')) {
        const cells = (lines[i] ?? '').trim().slice(1, -1).split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      html.push(
        `<table><thead><tr>${(head ?? []).map((c) => `<th>${inline(c, ctx)}</th>`).join('')}</tr></thead><tbody>${body
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c, ctx)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      );
      continue;
    }
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\s*([-*+]|\d+\.)\s+/, ''));
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      html.push(`<${tag}>${items.map((it) => `<li>${inline(it, ctx)}</li>`).join('')}</${tag}>`);
      continue;
    }
    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('>')) quote.push((lines[i++] ?? '').replace(/^>\s?/, ''));
      html.push(`<blockquote>${inline(quote.join(' '), ctx)}</blockquote>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && (lines[i] ?? '').trim() !== '' && !/^(#{1,6}\s|```|>|\s*([-*+]|\d+\.)\s+|\s*\|)/.test(lines[i] ?? '')) para.push(lines[i++] ?? '');
    html.push(`<p>${inline(para.join(' '), ctx)}</p>`);
  }
  return html.join('\n');
}

/** Heading problems the API rejects (HEADING_LEVEL): any H1, H4+ or a skipped level. */
export function headingProblems(md: string): string[] {
  const problems: string[] = [];
  let prev = 1;
  let inFence = false;
  for (const line of md.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (!m) continue;
    const level = m[1]?.length ?? 2;
    const text = (m[2] ?? '').slice(0, 40);
    if (level === 1) problems.push(`H1 "${text}" — H1 page ka title hai, yahan H2 use karein`);
    else if (level > 3) problems.push(`H${level} "${text}" — sirf H2 aur H3 allowed hain`);
    else if (level > prev + 1) problems.push(`"${text}" — H${prev} ke baad seedha H${level}`);
    prev = level;
  }
  return problems;
}
