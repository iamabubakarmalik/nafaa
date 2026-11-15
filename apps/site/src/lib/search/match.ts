/**
 * Client-side matching for site search: loads the compact index once and
 * scores rows against a query. Small on purpose (no search library):
 *
 * - text is lower-cased, accents and Urdu vowel marks are dropped, and a few
 *   Arabic letter forms are folded to their Urdu ones;
 * - every query word must match the title, path or summary; a word with
 *   four or more letters may also match a title word one typo away (two
 *   for long words);
 * - title hits weigh more than path hits, which weigh more than summary hits.
 */
import { SEARCH_GROUPS, type SearchIndexFile, type SearchRow } from './groups';

export interface SearchHit {
  title: string;
  summary: string;
  path: string;
  group: number;
  score: number;
}

interface Prepared {
  row: SearchRow;
  title: string;
  words: string[];
  path: string;
  summary: string;
}

const FOLD: Record<string, string> = { ي: 'ی', ى: 'ی', ك: 'ک', ة: 'ہ', ه: 'ہ', ۀ: 'ہ', ؤ: 'و', أ: 'ا', إ: 'ا', آ: 'ا' };

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[يىكةهۀؤأإآ]/g, (c) => FOLD[c] ?? c);
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Edit distance, giving up once it passes `max`. */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return false;
    prev = cur;
  }
  return prev[b.length]! <= max;
}

const cache = new Map<string, Promise<Prepared[]>>();

/** The prepared index for a locale, fetched once per page load. */
export function loadIndex(locale: string): Promise<Prepared[]> {
  let pending = cache.get(locale);
  if (!pending) {
    pending = fetch(`/search-index/${locale === 'ur' ? 'ur' : 'en'}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<SearchIndexFile>) : { v: 1 as const, rows: [] }))
      .then((file) =>
        file.rows.map((row) => ({
          row,
          title: normalize(row[0]),
          words: tokens(row[0]),
          path: normalize(row[2].replace(/[-/]/g, ' ')),
          summary: normalize(row[1]),
        })),
      );
    pending.catch(() => cache.delete(locale));
    cache.set(locale, pending);
  }
  return pending;
}

/** Core pages first when scores tie. */
const GROUP_BONUS = [3, 3, 2, 1, 0, 1, 0, 0, -1];

export function search(index: Prepared[], query: string, limit = 40): SearchHit[] {
  const q = normalize(query).trim();
  const words = tokens(query);
  if (!words.length) return [];
  const hits: SearchHit[] = [];
  for (const item of index) {
    let score = 0;
    let ok = true;
    for (const word of words) {
      if (item.words.includes(word)) score += 16;
      else if (item.words.some((w) => w.startsWith(word))) score += 12;
      else if (item.title.includes(word)) score += 8;
      else if (item.path.includes(word)) score += 5;
      else if (item.summary.includes(word)) score += 3;
      else if (word.length >= 4 && item.words.some((w) => within(word, w.slice(0, word.length + 1), word.length >= 7 ? 2 : 1))) score += 6;
      else {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    if (item.title === q) score += 60;
    else if (item.title.startsWith(q)) score += 25;
    // Shorter titles are usually the page about that thing.
    score += GROUP_BONUS[item.row[3]] ?? 0;
    score -= Math.min(6, item.title.length / 20);
    hits.push({ title: item.row[0], summary: item.row[1], path: item.row[2], group: item.row[3], score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** Hits grouped in display order, at most `perGroup` each. */
export function groupHits(hits: SearchHit[], perGroup: number): { group: number; hits: SearchHit[] }[] {
  const out = SEARCH_GROUPS.map((_, group) => ({ group, hits: [] as SearchHit[] }));
  for (const hit of hits) {
    const bucket = out[hit.group];
    if (bucket && bucket.hits.length < perGroup) bucket.hits.push(hit);
  }
  // Groups follow the best hit in them, so the top result is always first.
  return out.filter((g) => g.hits.length).sort((a, b) => b.hits[0]!.score - a.hits[0]!.score);
}
