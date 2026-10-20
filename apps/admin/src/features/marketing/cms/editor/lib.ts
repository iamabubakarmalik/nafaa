/**
 * Pure helpers shared by the entry list and the editor: Asia/Karachi time
 * formatting, block ids, slugs, status labels and client-side block checks.
 */
import {
  BLOCK_SCHEMAS,
  formatIssuePath,
  type AdminEntryListItem,
  type BlockType,
  type CmsStatus,
  type DraftBlock,
  type RobotsReason,
} from '../contract/cms-contract';

// ─── Time (server runs in UTC; editors think in PKT, UTC+5 with no DST) ───

const PKT = 'Asia/Karachi';
const PKT_OFFSET = '+05:00';

export function formatPkt(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: PKT,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(d);
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'abhi';
  if (min < 60) return `${min} min pehle`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ghante pehle`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} din pehle`;
  return formatPkt(iso, false);
}

/** ISO (UTC) → value for <input type="datetime-local"> in PKT. */
export function toPktInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 5 * 3_600_000);
  return d.toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value read as PKT → ISO (UTC). */
export function fromPktInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00${PKT_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ─── Ids and slugs ───

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

/** nanoid(10)-style block id (matches BLOCK_ID_PATTERN). */
export function newBlockId(size = 10): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ID_ALPHABET[b & 63];
  return out;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

// ─── Status ───

export type StatusTone = 'neutral' | 'blue' | 'emerald' | 'amber' | 'violet' | 'rose';
export interface StatusView {
  label: string;
  tone: StatusTone;
}

const ROBOTS_REASON_LABEL: Record<RobotsReason, string> = {
  editor: 'noindex (editor)',
  quality_gate: 'noindex (kam alfaaz)',
  coming: 'noindex (coming soon)',
  similarity: 'noindex (milta julta)',
  site_not_indexable: 'noindex (staging)',
};

export function robotsReasonLabel(reason: RobotsReason | null | undefined): string | null {
  return reason ? ROBOTS_REASON_LABEL[reason] : null;
}

/** ARCH 13: Draft / Scheduled / Live / Live + changes / Live noindex / Archived. */
export function statusView(item: { status: CmsStatus; hasUnpublishedChanges: boolean; noindexReason?: RobotsReason | null }): StatusView {
  switch (item.status) {
    case 'DRAFT':
      return { label: 'Draft', tone: 'neutral' };
    case 'SCHEDULED':
      return { label: 'Scheduled', tone: 'blue' };
    case 'ARCHIVED':
      return { label: 'Archived', tone: 'rose' };
    case 'PUBLISHED':
      if (item.hasUnpublishedChanges) return { label: 'Live + changes', tone: 'amber' };
      if (item.noindexReason && item.noindexReason !== 'site_not_indexable') return { label: 'Live, noindex', tone: 'violet' };
      return { label: 'Live', tone: 'emerald' };
  }
}

export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700 ring-neutral-500/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export const TONE_DOT: Record<StatusTone, string> = {
  neutral: 'bg-neutral-400',
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
  rose: 'bg-rose-500',
};

export type ListItemForStatus = Pick<AdminEntryListItem, 'status' | 'hasUnpublishedChanges' | 'noindexReason'>;

// ─── Block checks (same schemas the API uses at publish) ───

export type BlockErrors = Record<string, string>;

/**
 * Full-shape check of one draft block. Keys are paths relative to the block
 * ("primaryCta.label", "items[2].title"). The editor shows them inline; the
 * API stays the authority at publish.
 */
export function blockErrors(block: DraftBlock): BlockErrors {
  const schema = BLOCK_SCHEMAS[block.type as BlockType];
  if (!schema) return {};
  const res = schema.safeParse(block);
  if (res.success) return {};
  const out: BlockErrors = {};
  for (const issue of res.error.issues) {
    const key = formatIssuePath(issue.path);
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Ids of every `entry:<id>` link inside a JSON-able value. */
export function entryLinkIds(value: unknown): string[] {
  const text = JSON.stringify(value ?? null);
  const ids = new Set<string>();
  for (const m of text.matchAll(/entry:([A-Za-z0-9_-]{1,64})/g)) if (m[1]) ids.add(m[1]);
  return [...ids];
}

/** Plain text of a draft block, for word counts and keyword checks. */
export function blockText(block: DraftBlock): string {
  const parts: string[] = [];
  const walk = (v: unknown, key?: string) => {
    if (typeof v === 'string') {
      if (key && /^(id|type|href|mediaId|anchor|theme|frame|layout|url|kind|icon|language|metric|entryType|toolKey|tone|form)$/.test(key)) return;
      parts.push(v);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(block);
  return parts.join(' ');
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]+/g, ' ')
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
