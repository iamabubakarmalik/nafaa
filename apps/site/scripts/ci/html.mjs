/**
 * Small HTML helpers for the CI crawlers (no dependencies). They read markup
 * this site renders itself, so a tag-level scan is enough; this is not a
 * general HTML parser.
 */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'" };

export function decode(text) {
  return text
    .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, code) => {
      const key = code.toLowerCase();
      if (key in ENTITIES) return ENTITIES[key];
      if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16));
      if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10));
      return m;
    });
}

/** Attributes of one start tag's source ("<a href=x class='y'>"). */
export function attrs(tag) {
  const out = {};
  const body = tag.replace(/^<[a-zA-Z0-9-]+/, '').replace(/\/?>$/, '');
  for (const m of body.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

/** Every start tag of `name`, with its attributes. */
export function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => ({ raw: m[0], index: m.index ?? 0, attrs: attrs(m[0]) }));
}

/** Inner HTML of every `<name>…</name>` (not nested-safe; fine for script, title, h1, summary). */
export function blocks(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)</${name}>`, 'gi'))].map((m) => ({
    attrs: attrs(`<${name}${m[1]}>`),
    inner: m[2],
  }));
}

export function text(html) {
  return decode(
    html
      .replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Content of <main> when present (header and footer excluded), else <body>. */
export function mainHtml(html) {
  const main = /<main\b[^>]*>([\s\S]*)<\/main>/i.exec(html);
  if (main) return main[1];
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return body ? body[1] : html;
}

/** Runs `fn` over `items` with at most `limit` in flight. */
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** URLs from a sitemap or sitemap index. */
export function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decode(m[1]));
}

/**
 * Extra request headers for protected deployments. With
 * VERCEL_AUTOMATION_BYPASS_SECRET set (Vercel "Protection Bypass for
 * Automation"), every CI request carries the bypass header.
 */
export function ciHeaders() {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  return secret ? { 'x-vercel-protection-bypass': secret, 'x-vercel-set-bypass-cookie': 'true' } : {};
}
