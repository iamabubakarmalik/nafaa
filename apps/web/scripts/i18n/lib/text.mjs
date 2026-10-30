/**
 * Rules that decide whether a string is text a person reads.
 *
 * The wrap codemod only touches strings in known UI positions (JSX text,
 * label-like props and keys, toast calls), and even there it refuses anything
 * that looks technical: class lists, URLs, ids, enum values, formats.
 */

const LETTER = /\p{L}/u;
const NON_LATIN_LETTER = /[^\p{Script=Latin}\P{L}]/u;

/** Tailwind-ish token: `bg-white`, `sm:px-4`, `!mt-0`, `-translate-x-1/2`, `w-[3rem]`. */
const CLASS_TOKEN = /^!?-?(?:[a-z0-9-]+:)*-?[a-z][a-z0-9]*(?:-[a-z0-9./%#[\]]+)+$|^(?:flex|grid|block|hidden|inline|relative|absolute|fixed|sticky|truncate|uppercase|lowercase|capitalize|italic|underline|border|rounded|shadow|grow|shrink|container|group|peer|transition|sr-only)$/;

export function isClassList(s) {
  const tokens = s.trim().split(/\s+/);
  return tokens.length > 0 && tokens.every((tok) => CLASS_TOKEN.test(tok) || /^(?:[a-z0-9-]+:)+[a-z0-9-[\]./]+$/.test(tok));
}

const DATE_FORMAT = /^[dDMyYHhmsaEoOQwWxXZ\s\-/:,.'[\]]+$/;

/** True for strings no person is meant to read. */
export function isTechnical(raw) {
  const s = raw.trim();
  if (!s || !LETTER.test(s)) return true;
  if (/^(?:https?:|mailto:|tel:|wa\.me|www\.|data:|blob:)/i.test(s)) return true;
  if (/^[/.#@?&=]/.test(s) && !/\s/.test(s)) return true; // paths, selectors, query strings
  if (/^\S+@\S+\.\S+$/.test(s)) return true; // email
  if (/^[a-z0-9]+(?:[_.-][a-z0-9]+)+$/.test(s)) return true; // snake_case, kebab-case, dotted.keys
  if (/^[a-z]+[A-Z][A-Za-z0-9]*$/.test(s)) return true; // camelCase
  if (/^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(s)) return true; // CONSTANT_CASE
  if (/^[A-Z0-9_]{7,}$/.test(s)) return true; // long upper-case codes
  if (DATE_FORMAT.test(s) && /(yy|MM|dd|HH|hh|mm)/.test(s) && !/\s[a-z]{3,}/.test(s)) return true;
  if (isClassList(s)) return true;
  if (/[[\]{}]|:not\(|\(\s*(?:max|min)-(?:width|height)|var\(--|rgba?\(|hsla?\(|^url\(|^(?:rotate|translate|scale|matrix|skew)[XYZ3d]*\(|cubic-bezier\(|\d+m?s\s+(?:ease|linear)|:wght@|sans-serif|monospace|^'[^']+',/.test(s)) return true; // selectors, media queries, CSS values, font stacks
  if (/^[\w-]+\.(?:png|jpe?g|svg|webp|gif|pdf|csv|xlsx?|json|txt|js|css)$/i.test(s)) return true;
  if (/^[\d\s.,:+\-%()/]*[a-zA-Z]?$/.test(s) && s.length <= 3 && !/^[A-Z]/.test(s)) return true; // "1x", "10%"
  return false;
}

/** Strings left alone even in UI positions: currency marks and similar. */
const KEEP_AS_IS = new Set(['Rs', 'Rs.', 'PKR', 'x', '×', '—', '-', '–', '·', '•', '/', ':', '%']);

/**
 * Text in a UI position (JSX text, a label prop) that should be translated.
 * `strict` (props, keys, return values) also refuses one lower-case word such
 * as "cash" or "pending": in those spots it is almost always a value.
 */
export function isUiText(s, { strict = false } = {}) {
  const trimmed = s.trim();
  if (KEEP_AS_IS.has(trimmed)) return false;
  if (strict && /^[a-z][a-z0-9]*$/.test(trimmed)) return false;
  return !isTechnical(trimmed);
}

/**
 * Text in a weaker position (a call argument, a plain variable): only
 * sentence-like strings or non-Latin script count.
 */
export function isSentence(s) {
  const trimmed = s.trim();
  if (!isUiText(trimmed)) return false;
  if (NON_LATIN_LETTER.test(trimmed)) return true;
  return /\p{L}{2,}[\s\p{P}]+\S/u.test(trimmed) || /^[A-Z][a-z]{2,}[.!?]?$/.test(trimmed);
}

const ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rarr: '→', larr: '←', uarr: '↑', darr: '↓',
  middot: '·', bull: '•', mdash: '—', ndash: '–', hellip: '…', times: '×', copy: '©', reg: '®', trade: '™',
  laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', deg: '°', plusmn: '±', check: '✓',
};

/** Decodes the HTML entities JSX text may contain. Returns null for an unknown entity. */
export function decodeEntities(s) {
  let ok = true;
  const out = s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] === '#') return String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10));
    if (name in ENTITIES) return ENTITIES[name];
    ok = false;
    return whole;
  });
  return ok ? out : null;
}

/** Single-quoted JS string literal. */
export function jsString(s) {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')}'`;
}

/**
 * JSX text the way React renders it: lines trimmed, blank lines dropped,
 * line breaks become one space. Whitespace without a line break is kept.
 */
export function cleanJsxText(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  if (lines.length === 1) return raw;
  let out = '';
  lines.forEach((line, i) => {
    let l = line.replace(/\t/g, ' ');
    if (i !== 0) l = l.replace(/^[ ]+/, '');
    if (i !== lines.length - 1) l = l.replace(/[ ]+$/, '');
    if (l) {
      if (out) out += ' ';
      out += l;
    }
  });
  return out;
}

export const hasLetter = (s) => LETTER.test(s);
