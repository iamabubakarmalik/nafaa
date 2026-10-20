/**
 * Markdown parser for CMS rich text (API-CONTRACT 3.3, ARCH D8).
 *
 * The CMS stores a fixed GFM subset: paragraphs, H2/H3, lists (nested, task
 * items), tables, blockquotes, fenced code, rules, links, `media:` images,
 * bold, italic, strikethrough, inline code and autolinks. This parser turns
 * exactly that subset into a small syntax tree, which Markdown.tsx renders
 * as React elements.
 *
 * Why not remark/rehype: raw HTML in the source is never parsed as HTML. It
 * stays literal text and React escapes it, so sanitising is structural (no
 * HTML string is ever injected) and the site needs no Markdown dependencies.
 * Anything outside the subset degrades to plain text, never to markup.
 */

export type Align = 'left' | 'center' | 'right' | null;

export type InlineNode =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: InlineNode[] }
  | { t: 'em'; c: InlineNode[] }
  | { t: 'del'; c: InlineNode[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; title?: string; c: InlineNode[] }
  | { t: 'image'; alt: string; src: string; title?: string }
  | { t: 'br' };

export type BlockNode =
  | { t: 'heading'; level: 2 | 3; text: string }
  | { t: 'paragraph'; text: string }
  | { t: 'list'; ordered: boolean; start: number; loose: boolean; items: ListItem[] }
  | { t: 'blockquote'; children: BlockNode[] }
  | { t: 'code'; lang: string; text: string }
  | { t: 'table'; align: Align[]; head: string[]; rows: string[][] }
  | { t: 'hr' };

export interface ListItem {
  checked: boolean | null;
  children: BlockNode[];
}

// ─── Block level ─────────────────────────────────────────────────────────

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)[^`]*$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}>[ ]?/;
const LIST = /^( {0,3})([-*+]|\d{1,9}[.)])([ \t]+|$)/;
const TABLE_SEP = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

const isBlank = (line: string) => line.trim() === '';

function expandTabs(line: string): string {
  return line.replace(/^\t+/, (tabs) => '    '.repeat(tabs.length));
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function isTableStart(lines: readonly string[], i: number): boolean {
  const head = lines[i];
  const sep = lines[i + 1];
  return head !== undefined && sep !== undefined && head.includes('|') && TABLE_SEP.test(sep) && sep.includes('-');
}

/** Lines that end a paragraph without a blank line. */
function interruptsParagraph(lines: readonly string[], i: number): boolean {
  const line = lines[i] as string;
  if (FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line)) return true;
  const list = LIST.exec(line);
  if (list && list[3] !== '' && (!/\d/.test(list[2] as string) || /^1[.)]$/.test(list[2] as string))) return true;
  return isTableStart(lines, i);
}

export function splitRow(row: string): string[] {
  let text = row.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1);
  const cells: string[] = [];
  let cell = '';
  let inCode = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (ch === '\\' && text[i + 1] === '|') {
      cell += '|';
      i++;
      continue;
    }
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) {
      cells.push(cell.trim());
      cell = '';
      continue;
    }
    cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

function parseAlign(sep: string): Align[] {
  return splitRow(sep).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    return left && right ? 'center' : right ? 'right' : left ? 'left' : null;
  });
}

interface ListMarker {
  indent: number;
  ordered: boolean;
  /** Bullet char or ordered delimiter; items of one list share it. */
  kind: string;
  start: number;
  /** Column where the item's content starts. */
  content: number;
  rest: string;
}

function readMarker(line: string): ListMarker | null {
  const m = LIST.exec(line);
  if (!m) return null;
  const indent = (m[1] as string).length;
  const marker = m[2] as string;
  const spaces = (m[3] as string).length;
  const ordered = /\d/.test(marker);
  const after = line.slice(m[0].length);
  const pad = after === '' && spaces === 0 ? 1 : spaces > 4 ? 1 : spaces;
  return {
    indent,
    ordered,
    kind: ordered ? marker.slice(-1) : marker,
    start: ordered ? parseInt(marker, 10) : 1,
    content: indent + marker.length + pad,
    rest: spaces > 4 ? `${' '.repeat(spaces - 1)}${after}` : after,
  };
}

function parseList(lines: readonly string[], from: number): { node: BlockNode; next: number } {
  const first = readMarker(lines[from] as string) as ListMarker;
  const items: ListItem[] = [];
  let loose = false;
  let i = from;

  while (i < lines.length) {
    const marker = readMarker(lines[i] as string);
    if (!marker || marker.ordered !== first.ordered || marker.kind !== first.kind || marker.indent >= first.content) break;

    const body: string[] = [marker.rest];
    let sawBlank = false;
    i++;
    while (i < lines.length) {
      const line = lines[i] as string;
      if (isBlank(line)) {
        body.push('');
        sawBlank = true;
        i++;
        continue;
      }
      if (indentOf(line) >= marker.content) {
        body.push(line.slice(marker.content));
        i++;
        continue;
      }
      if (sawBlank) break;
      if (readMarker(line) || interruptsParagraph(lines, i)) break;
      body.push(line.trimStart()); // lazy continuation of the last paragraph
      i++;
    }

    while (body.length && isBlank(body[body.length - 1] as string)) body.pop();
    if (body.some((line, k) => isBlank(line) && k > 0 && k < body.length - 1)) loose = true;

    let checked: boolean | null = null;
    const task = /^\[([ xX])\][ \t]+/.exec(body[0] ?? '');
    if (task) {
      checked = task[1] !== ' ';
      body[0] = (body[0] as string).slice(task[0].length);
    }
    items.push({ checked, children: parseBlocks(body) });

    // A blank line between items makes the list loose.
    let j = i;
    while (j < lines.length && isBlank(lines[j] as string)) j++;
    const nextMarker = j < lines.length ? readMarker(lines[j] as string) : null;
    if (!nextMarker || nextMarker.ordered !== first.ordered || nextMarker.kind !== first.kind || nextMarker.indent >= first.content) {
      break;
    }
    if (j > i) loose = true;
    i = j;
  }

  return { node: { t: 'list', ordered: first.ordered, start: first.start, loose, items }, next: i };
}

export function parseBlocks(input: readonly string[] | string): BlockNode[] {
  const lines = (typeof input === 'string' ? input.replace(/\r\n?/g, '\n').split('\n') : [...input]).map(expandTabs);
  const out: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] as string;

    if (isBlank(line)) {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const mark = fence[1] as string;
      const lang = (fence[2] ?? '').toLowerCase();
      const indent = indentOf(line);
      const body: string[] = [];
      i++;
      while (i < lines.length) {
        const l = lines[i] as string;
        const close = new RegExp(`^ {0,3}${mark[0] === '`' ? '`' : '~'}{${mark.length},}[ \\t]*$`);
        if (close.test(l)) {
          i++;
          break;
        }
        body.push(l.slice(Math.min(indent, indentOf(l))));
        i++;
      }
      out.push({ t: 'code', lang, text: body.join('\n') });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const hashes = (heading[1] as string).length;
      const text = (heading[2] ?? '').trim();
      // The API rejects H1 and H4+ (HEADING_LEVEL); render them safely if they slip through.
      if (hashes >= 4) out.push({ t: 'paragraph', text: text ? `**${text}**` : '' });
      else out.push({ t: 'heading', level: hashes === 3 ? 3 : 2, text });
      i++;
      continue;
    }

    if (RULE.test(line)) {
      out.push({ t: 'hr' });
      i++;
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && !isBlank(lines[i] as string)) {
        const l = lines[i] as string;
        if (QUOTE.test(l)) body.push(l.replace(QUOTE, ''));
        else if (body.length && !interruptsParagraph(lines, i)) body.push(l);
        else break;
        i++;
      }
      out.push({ t: 'blockquote', children: parseBlocks(body) });
      continue;
    }

    if (readMarker(line)) {
      const { node, next } = parseList(lines, i);
      out.push(node);
      i = next;
      continue;
    }

    if (isTableStart(lines, i)) {
      const head = splitRow(line);
      const align = parseAlign(lines[i + 1] as string);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && !isBlank(lines[i] as string) && (lines[i] as string).includes('|')) {
        const cells = splitRow(lines[i] as string);
        rows.push(head.map((_, k) => cells[k] ?? ''));
        i++;
      }
      out.push({ t: 'table', align: head.map((_, k) => align[k] ?? null), head, rows });
      continue;
    }

    const para: string[] = [line.replace(/^\s+/, '')];
    i++;
    while (i < lines.length && !isBlank(lines[i] as string) && !interruptsParagraph(lines, i)) {
      // Keep trailing double spaces (hard breaks) on the joined text.
      para.push((lines[i] as string).replace(/^\s+/, ''));
      i++;
    }
    out.push({ t: 'paragraph', text: para.join('\n').replace(/\s+$/, '') });
  }

  return out;
}

// ─── Inline level ────────────────────────────────────────────────────────

const PUNCT = /[!-/:-@[-`{-~]/;
const WORD = /[\p{L}\p{N}]/u;
const BARE_URL = /^https?:\/\/[^\s<>"]+/i;

function codeSpanEnd(src: string, i: number): { end: number; content: string } | null {
  let run = 0;
  while (src[i + run] === '`') run++;
  const fence = '`'.repeat(run);
  let k = i + run;
  while (k < src.length) {
    const at = src.indexOf(fence, k);
    if (at < 0) return null;
    let after = at + run;
    if (src[after] === '`') {
      while (src[after] === '`') after++;
      k = after;
      continue;
    }
    let content = src.slice(i + run, at).replace(/\n/g, ' ');
    if (content.length > 2 && content.startsWith(' ') && content.endsWith(' ') && content.trim()) content = content.slice(1, -1);
    return { end: after, content };
  }
  return null;
}

/** Index of the matching `]` for a `[` at `open`, skipping code spans and escapes. */
function closingBracket(src: string, open: number): number {
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    const ch = src[k];
    if (ch === '\\') {
      k++;
      continue;
    }
    if (ch === '`') {
      const span = codeSpanEnd(src, k);
      if (span) {
        k = span.end - 1;
        continue;
      }
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return k;
    }
  }
  return -1;
}

/** Parses `(dest "title")` at `i`. */
function linkTarget(src: string, i: number): { href: string; title?: string; end: number } | null {
  if (src[i] !== '(') return null;
  let k = i + 1;
  while (src[k] === ' ') k++;
  let href = '';
  if (src[k] === '<') {
    const close = src.indexOf('>', k);
    if (close < 0) return null;
    href = src.slice(k + 1, close);
    k = close + 1;
  } else {
    let depth = 0;
    while (k < src.length) {
      const ch = src[k] as string;
      if (ch === '\\' && k + 1 < src.length) {
        href += src[k + 1];
        k += 2;
        continue;
      }
      if (ch === '(') depth++;
      if (ch === ')') {
        if (depth === 0) break;
        depth--;
      }
      if (/\s/.test(ch)) break;
      href += ch;
      k++;
    }
  }
  while (src[k] === ' ') k++;
  let title: string | undefined;
  const quote = src[k];
  if (quote === '"' || quote === "'") {
    const close = src.indexOf(quote, k + 1);
    if (close < 0) return null;
    title = src.slice(k + 1, close);
    k = close + 1;
    while (src[k] === ' ') k++;
  }
  if (src[k] !== ')') return null;
  return { href: href.trim(), title, end: k + 1 };
}

/** Finds the closing emphasis delimiter for an opener at `from`. */
function closingDelimiter(src: string, from: number, delim: string): number {
  const single = delim.length === 1;
  for (let k = from; k < src.length; k++) {
    const ch = src[k];
    if (ch === '\\') {
      k++;
      continue;
    }
    if (ch === '`') {
      const span = codeSpanEnd(src, k);
      if (span) {
        k = span.end - 1;
        continue;
      }
    }
    if (ch === '[') {
      const close = closingBracket(src, k);
      if (close > 0) {
        const target = linkTarget(src, close + 1);
        if (target) {
          k = target.end - 1;
          continue;
        }
      }
    }
    if (!src.startsWith(delim, k)) continue;
    if (single && src[k + 1] === delim) {
      // Part of a double delimiter: skip the pair (it closes its own span).
      k++;
      continue;
    }
    const before = src[k - 1] ?? ' ';
    const after = src[k + delim.length] ?? ' ';
    if (/\s/.test(before)) continue;
    if (delim[0] === '_' && WORD.test(after)) continue;
    return k;
  }
  return -1;
}

function trimUrl(url: string): string {
  let out = url.replace(/[.,:;!?*_~'"]+$/, '');
  // Drop unbalanced closing parentheses: "(see https://x.y/z)".
  while (out.endsWith(')') && (out.match(/\(/g)?.length ?? 0) < (out.match(/\)/g)?.length ?? 0)) out = out.slice(0, -1);
  return out;
}

export function parseInline(src: string): InlineNode[] {
  const out: InlineNode[] = [];
  let text = '';
  const flush = () => {
    if (text) out.push({ t: 'text', v: text });
    text = '';
  };

  let i = 0;
  while (i < src.length) {
    const ch = src[i] as string;

    if (ch === '\\') {
      const next = src[i + 1];
      if (next === '\n') {
        flush();
        out.push({ t: 'br' });
        i += 2;
        continue;
      }
      if (next && PUNCT.test(next)) {
        text += next;
        i += 2;
        continue;
      }
    }

    if (ch === '\n') {
      if (text.endsWith('  ')) {
        text = text.replace(/ +$/, '');
        flush();
        out.push({ t: 'br' });
      } else {
        text = text.replace(/ +$/, '');
        text += ' ';
      }
      i++;
      while (src[i] === ' ') i++;
      continue;
    }

    if (ch === '`') {
      const span = codeSpanEnd(src, i);
      if (span) {
        flush();
        out.push({ t: 'code', v: span.content });
        i = span.end;
        continue;
      }
      let run = 0;
      while (src[i + run] === '`') run++;
      text += src.slice(i, i + run);
      i += run;
      continue;
    }

    if (ch === '!' && src[i + 1] === '[') {
      const close = closingBracket(src, i + 1);
      const target = close > 0 ? linkTarget(src, close + 1) : null;
      if (target) {
        flush();
        out.push({ t: 'image', alt: src.slice(i + 2, close), src: target.href, title: target.title });
        i = target.end;
        continue;
      }
    }

    if (ch === '[') {
      const close = closingBracket(src, i);
      const target = close > 0 ? linkTarget(src, close + 1) : null;
      if (target) {
        flush();
        out.push({ t: 'link', href: target.href, title: target.title, c: parseInline(src.slice(i + 1, close)) });
        i = target.end;
        continue;
      }
    }

    if (ch === '<') {
      const auto = /^<((?:https?:\/\/|mailto:)[^\s<>]+|[^\s<>@]+@[^\s<>@]+\.[a-z]{2,})>/i.exec(src.slice(i));
      if (auto) {
        flush();
        const value = auto[1] as string;
        const href = /^(https?:|mailto:)/i.test(value) ? value : `mailto:${value}`;
        out.push({ t: 'link', href, c: [{ t: 'text', v: value.replace(/^mailto:/i, '') }] });
        i += auto[0].length;
        continue;
      }
    }

    if ((ch === 'h' || ch === 'H') && !WORD.test(src[i - 1] ?? ' ')) {
      const bare = BARE_URL.exec(src.slice(i));
      if (bare) {
        const url = trimUrl(bare[0]);
        flush();
        out.push({ t: 'link', href: url, c: [{ t: 'text', v: url.replace(/^https?:\/\//i, '') }] });
        i += url.length;
        continue;
      }
    }

    if (ch === '*' || ch === '_' || (ch === '~' && src[i + 1] === '~')) {
      const double = src[i + 1] === ch;
      const delim = ch === '~' ? '~~' : double ? ch + ch : ch;
      const before = src[i - 1] ?? ' ';
      const after = src[i + delim.length] ?? ' ';
      const canOpen = !/\s/.test(after) && !(ch === '_' && WORD.test(before));
      if (canOpen) {
        const close = closingDelimiter(src, i + delim.length, delim);
        if (close > i + delim.length) {
          flush();
          const inner = parseInline(src.slice(i + delim.length, close));
          out.push(delim === '~~' ? { t: 'del', c: inner } : delim.length === 2 ? { t: 'strong', c: inner } : { t: 'em', c: inner });
          i = close + delim.length;
          continue;
        }
      }
      text += delim;
      i += delim.length;
      continue;
    }

    text += ch;
    i++;
  }
  flush();
  return out;
}

/** Plain text of inline Markdown (headings ids, aria labels). */
export function inlineText(src: string): string {
  const walk = (nodes: InlineNode[]): string =>
    nodes
      .map((node) => {
        switch (node.t) {
          case 'text':
          case 'code':
            return node.v;
          case 'br':
            return ' ';
          case 'image':
            return node.alt;
          default:
            return walk(node.c);
        }
      })
      .join('');
  return walk(parseInline(src));
}
