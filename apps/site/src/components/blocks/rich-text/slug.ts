/**
 * Heading ids, the same way GitHub (and rehype-slug) make them: lower case,
 * punctuation dropped, spaces to hyphens, and "-1", "-2" for repeats.
 *
 * One slugger per page (BlockRenderer creates it), so ids are unique across
 * every block. Templates that build a table of contents call
 * `markdownHeadings()` with the same blocks to get the same ids.
 */

export interface Slugger {
  slug(text: string): string;
  /** Reserves an id already used by a block anchor or section, so headings never collide with it. */
  reserve(id: string): void;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function createSlugger(): Slugger {
  const seen = new Map<string, number>();
  return {
    slug(text: string): string {
      const base = slugify(text) || 'section';
      let id = base;
      let count = seen.get(base) ?? 0;
      while (seen.has(id)) {
        count += 1;
        id = `${base}-${count}`;
      }
      seen.set(base, count);
      seen.set(id, 0);
      return id;
    },
    reserve(id: string): void {
      if (!seen.has(id)) seen.set(id, 0);
    },
  };
}

/**
 * A slugger whose ids carry a prefix (the block id). Markdown inside
 * callouts, steps, screenshots and FAQ answers uses it, so its rare headings
 * never collide with the page outline, which only richText blocks feed.
 */
export function scopedSlugger(prefix: string): Slugger {
  const inner = createSlugger();
  return {
    slug: (text: string) => `${prefix}-${inner.slug(text)}`,
    reserve: (id: string) => inner.reserve(id),
  };
}
