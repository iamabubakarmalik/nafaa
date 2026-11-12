/**
 * Allow-list HTML cleaner for merchant rich text (pages, collection and
 * product descriptions, blog posts, policies). Anything not listed is dropped:
 * unknown tags lose the tag but keep their text, script-like elements lose
 * their content too, and only safe attributes and URLs survive.
 */

const ALLOWED: Record<string, string[]> = {
  p: ['style'], br: [], h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
  strong: [], b: [], em: [], i: [], u: [], s: [], small: [], sup: [], sub: [], mark: [],
  a: ['href', 'target', 'title'],
  ul: [], ol: ['start'], li: [], blockquote: [], code: [], pre: [], hr: [],
  img: ['src', 'alt', 'width', 'height', 'loading', 'title'],
  figure: [], figcaption: [],
  table: [], thead: [], tbody: [], tfoot: [], tr: [], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'],
  span: ['style'], div: ['style'],
  iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'title'],
  details: [], summary: [],
};
const VOID = new Set(['br', 'hr', 'img']);
/** Elements removed together with everything inside them. */
const DROP_WITH_CONTENT = /<(script|style|noscript|template|textarea|select|svg|math|object|embed|applet|frameset|frame|head|title|xml|form|button|input)\b[\s\S]*?(<\/\1\s*>|$)/gi;
const VIDEO_EMBED = /^https:\/\/(www\.)?(youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/)[\w-]+(\?[\w=&%-]*)?$/i;
/** Inline styles: only text alignment and colours. */
const SAFE_STYLE = /^\s*(text-align\s*:\s*(left|right|center|justify)|color\s*:\s*#[0-9a-f]{3,8}|background-color\s*:\s*#[0-9a-f]{3,8})\s*$/i;

const escapeText = (s: string) => s.replace(/&(?!(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(Math.min(0x10ffff, parseInt(h, 16))))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Math.min(0x10ffff, Number(d))))
    .replace(/&colon;/gi, ':').replace(/&tab;/gi, '\t').replace(/&newline;/gi, '\n')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export function safeUrl(raw: string, kind: 'href' | 'src'): string | null {
  const v = decodeEntities(raw).trim();
  // Remove control and whitespace characters a browser would ignore inside the scheme.
  const probe = v.replace(/[\u0000- \u007f-\u009f]/g, '').toLowerCase();
  if (kind === 'href') {
    if (/^(https?:|mailto:|tel:|\/(?!\/)|#|\?)/.test(probe)) return v.slice(0, 2000);
    if (!/^[a-z][a-z0-9+.-]*:/.test(probe) && !probe.startsWith('//')) return v.slice(0, 2000);
    return null;
  }
  if (/^https:\/\//.test(probe) || /^\/(?!\/)/.test(probe)) return v.slice(0, 2000);
  return null;
}

function parseAttrs(raw: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) out.push([m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '']);
  return out;
}

function cleanTag(name: string, rawAttrs: string): string | null {
  const allowed = ALLOWED[name];
  const attrs: string[] = [];
  let hasSrc = false;
  for (const [k, v] of parseAttrs(rawAttrs)) {
    if (!allowed.includes(k) || k === 'rel') continue;
    let val: string | null = v;
    if (k === 'href') val = safeUrl(v, 'href');
    else if (k === 'src') {
      val = name === 'iframe' ? (VIDEO_EMBED.test(decodeEntities(v).trim()) ? decodeEntities(v).trim() : null) : safeUrl(v, 'src');
      if (val) hasSrc = true;
    } else if (k === 'style') val = v.split(';').filter((d) => SAFE_STYLE.test(d)).join(';') || null;
    else if (k === 'target') val = v === '_blank' ? '_blank' : null;
    else if (['width', 'height', 'colspan', 'rowspan', 'start'].includes(k)) val = /^\d{1,4}%?$/.test(v) ? v : null;
    else if (k === 'loading') val = v === 'lazy' ? 'lazy' : null;
    else if (k === 'allowfullscreen') val = '';
    else val = v.slice(0, 300);
    if (val === null) continue;
    attrs.push(val === '' && k === 'allowfullscreen' ? k : `${k}="${escapeAttr(val)}"`);
  }
  if ((name === 'img' || name === 'iframe') && !hasSrc) return null;
  if (name === 'a' && attrs.some((a) => a.startsWith('target='))) attrs.push('rel="noopener noreferrer nofollow"');
  return `<${name}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;
}

export function sanitizeHtml(input: unknown, maxLength = 200_000): string {
  let html = String(input ?? '').slice(0, maxLength * 2);
  html = html.replace(/<!--[\s\S]*?(-->|$)/g, '').replace(/<!\[CDATA\[[\s\S]*?(\]\]>|$)/g, '').replace(/<![^>]*>/g, '').replace(/<\?[\s\S]*?(\?>|$)/g, '');
  let prev = '';
  while (prev !== html) {
    prev = html;
    html = html.replace(DROP_WITH_CONTENT, '');
  }
  const out: string[] = [];
  const open: string[] = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push(escapeText(html.slice(last, m.index)));
    last = re.lastIndex;
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    if (!ALLOWED[name]) continue;
    if (closing) {
      if (VOID.has(name)) continue;
      const at = open.lastIndexOf(name);
      if (at === -1) continue;
      while (open.length > at) out.push(`</${open.pop()}>`);
      continue;
    }
    const tag = cleanTag(name, m[3]);
    if (!tag) continue;
    out.push(tag);
    if (!VOID.has(name) && !/\/\s*$/.test(m[3])) open.push(name);
    else if (!VOID.has(name)) out.push(`</${name}>`);
  }
  out.push(escapeText(html.slice(last)));
  while (open.length) out.push(`</${open.pop()}>`);
  return out.join('').slice(0, maxLength);
}

/** Plain text from HTML, for meta descriptions and excerpts. */
export function htmlToText(html: unknown, max = 300): string {
  const t = decodeEntities(String(html ?? '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, ' ').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Plain text (product descriptions typed in the POS) as paragraphs. */
export function textToHtml(text: unknown): string {
  return String(text ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeText(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export const looksLikeHtml = (s: unknown) => /<\/?[a-z][\s\S]*>/i.test(String(s ?? ''));
